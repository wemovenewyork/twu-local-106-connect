import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isLocalOrSuperAdmin } from "@/lib/permissions";

const NEWS_INCLUDE = {
  division: { select: { id: true, code: true, name: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
  reviewer: { select: { id: true, firstName: true, lastName: true } },
} as const;

// GET /api/admin/news
// Lists news scoped to the caller's permissions:
//   - local/super admin: everything
//   - divisionAdmin: their division + all-divisions (null) news
//   - editor: their division, drafts/inReview only
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!caller) return err("Unauthorized", 401);

  const allowedRoles = ["editor", "divisionAdmin", "localAdmin", "superAdmin"];
  if (!allowedRoles.includes(caller.role)) return err("Forbidden", 403);

  let where: Record<string, unknown> = {};
  if (isLocalOrSuperAdmin(caller)) {
    where = {};
  } else if (caller.role === "divisionAdmin") {
    where = {
      OR: [
        { divisionId: caller.divisionId },
        { divisionId: null },
      ],
    };
  } else {
    where = {
      divisionId: caller.divisionId,
      status: { in: ["draft", "inReview"] },
    };
  }

  const news = await prisma.news.findMany({
    where,
    include: NEWS_INCLUDE,
    orderBy: [{ updatedAt: "desc" }],
  });

  return ok({ news });
}

// POST /api/admin/news — create draft
// Body: { title, body, divisionId? (null = all-divisions; admins only) }
export async function POST(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!caller) return err("Unauthorized", 401);

  const allowedRoles = ["editor", "divisionAdmin", "localAdmin", "superAdmin"];
  if (!allowedRoles.includes(caller.role)) return err("Forbidden", 403);

  let body: { title?: unknown; body?: unknown; divisionId?: unknown };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body : "";
  if (!title || title.length > 200) return err("Title is required (max 200 chars)", 400);
  if (!content) return err("Body is required", 400);

  // divisionId: undefined → use caller's division; null → all-divisions
  // (admins only); string → must match caller's scope.
  let divisionId: string | null;
  if (body.divisionId === null) {
    if (!isLocalOrSuperAdmin(caller)) {
      return err("Only local/super admins can post all-divisions news", 403);
    }
    divisionId = null;
  } else if (typeof body.divisionId === "string") {
    if (!isLocalOrSuperAdmin(caller) && body.divisionId !== caller.divisionId) {
      return err("Cannot post news outside your division", 403);
    }
    divisionId = body.divisionId;
  } else {
    if (!caller.divisionId && !isLocalOrSuperAdmin(caller)) {
      return err("No division on your account", 400);
    }
    divisionId = caller.divisionId;
  }

  try {
    const created = await prisma.news.create({
      data: {
        title,
        body: content,
        status: "draft",
        divisionId,
        authorId: caller.id,
      },
      include: NEWS_INCLUDE,
    });
    return ok({ news: created }, 201);
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "news-create" } });
    return err("Failed to create news", 500);
  }
}

export const runtime = "nodejs";
