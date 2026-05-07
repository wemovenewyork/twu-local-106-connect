import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { canManageNews, isLocalOrSuperAdmin } from "@/lib/permissions";

const NEWS_INCLUDE = {
  division: { select: { id: true, code: true, name: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
  reviewer: { select: { id: true, firstName: true, lastName: true } },
} as const;

async function loadCaller(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, divisionId: true },
  });
}

// GET /api/admin/news/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await loadCaller(token.userId);
  if (!caller) return err("Unauthorized", 401);

  const { id } = await params;
  const news = await prisma.news.findUnique({
    where: { id },
    include: NEWS_INCLUDE,
  });
  if (!news) return err("News not found", 404);
  if (!(await canManageNews(caller, news))) return err("Forbidden", 403);

  return ok({ news });
}

// PATCH /api/admin/news/[id]
// Body: { title?, body?, divisionId?, action? }
//   action:
//     - "submitForReview" (draft → inReview, author only)
//     - "approveAndPublish" (inReview → published, NOT author — two-person rule)
//     - "sendBackToDraft" (inReview → draft, NOT author)
//     - "archive" (published → archived)
//     - "restore" (archived → draft)
//   Title/body/divisionId edits allowed in draft (by author) and inReview (by reviewer).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await loadCaller(token.userId);
  if (!caller) return err("Unauthorized", 401);

  const { id } = await params;

  const news = await prisma.news.findUnique({ where: { id } });
  if (!news) return err("News not found", 404);
  if (!(await canManageNews(caller, news))) return err("Forbidden", 403);

  let body: {
    title?: unknown;
    body?: unknown;
    divisionId?: unknown;
    action?: unknown;
  };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  const action = typeof body.action === "string" ? body.action : null;
  const data: Record<string, unknown> = {};
  let transitioned: { from: string; to: string } | null = null;

  // Field edits (only valid in draft or inReview).
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > 200) return err("Title invalid (max 200 chars)", 400);
    if (news.status !== "draft" && news.status !== "inReview") {
      return err(`Cannot edit ${news.status} news`, 409);
    }
    data.title = title;
  }
  if (typeof body.body === "string") {
    if (!body.body) return err("Body cannot be empty", 400);
    if (news.status !== "draft" && news.status !== "inReview") {
      return err(`Cannot edit ${news.status} news`, 409);
    }
    data.body = body.body;
  }
  if (body.divisionId !== undefined) {
    if (news.status !== "draft" && news.status !== "inReview") {
      return err(`Cannot edit ${news.status} news`, 409);
    }
    if (body.divisionId === null) {
      if (!isLocalOrSuperAdmin(caller)) return err("Only local/super admins can post all-divisions news", 403);
      data.divisionId = null;
    } else if (typeof body.divisionId === "string") {
      if (!isLocalOrSuperAdmin(caller) && body.divisionId !== caller.divisionId) {
        return err("Cannot move news outside your division", 403);
      }
      data.divisionId = body.divisionId;
    }
  }

  // Status transitions.
  if (action) {
    if (action === "submitForReview") {
      if (news.status !== "draft") return err(`Cannot submit ${news.status} news`, 409);
      if (news.authorId !== caller.id) return err("Only the author can submit for review", 403);
      data.status = "inReview";
      transitioned = { from: news.status, to: "inReview" };
    } else if (action === "approveAndPublish") {
      if (news.status !== "inReview") return err(`Cannot publish ${news.status} news`, 409);
      if (news.authorId === caller.id) return err("Two-person rule: author cannot approve own post", 403);
      data.status = "published";
      data.publishedAt = new Date();
      data.reviewerId = caller.id;
      transitioned = { from: news.status, to: "published" };
    } else if (action === "sendBackToDraft") {
      if (news.status !== "inReview") return err(`Cannot send back ${news.status} news`, 409);
      if (news.authorId === caller.id) return err("Two-person rule: author cannot review own post", 403);
      data.status = "draft";
      transitioned = { from: news.status, to: "draft" };
    } else if (action === "archive") {
      if (news.status !== "published") return err(`Cannot archive ${news.status} news`, 409);
      data.status = "archived";
      transitioned = { from: news.status, to: "archived" };
    } else if (action === "restore") {
      if (news.status !== "archived") return err(`Cannot restore ${news.status} news`, 409);
      data.status = "draft";
      data.publishedAt = null;
      data.reviewerId = null;
      transitioned = { from: news.status, to: "draft" };
    } else {
      return err(`Unknown action: ${action}`, 400);
    }
  }

  // Editor restriction: editors can only edit their own drafts; transitions
  // beyond submitForReview are admin-only.
  if (caller.role === "editor" && transitioned && transitioned.to !== "inReview") {
    return err("Editors cannot perform this transition", 403);
  }

  if (Object.keys(data).length === 0) return err("Nothing to update", 400);

  try {
    const updated = await prisma.news.update({
      where: { id: news.id },
      data,
      include: NEWS_INCLUDE,
    });
    return ok({ news: updated, transitioned });
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "news-update" }, extra: { newsId: news.id } });
    return err("Failed to update news", 500);
  }
}

// DELETE /api/admin/news/[id]
// Hard-delete only allowed for drafts; by author or local/super admin.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await loadCaller(token.userId);
  if (!caller) return err("Unauthorized", 401);

  const { id } = await params;

  const news = await prisma.news.findUnique({ where: { id } });
  if (!news) return err("News not found", 404);

  if (news.status !== "draft") return err("Only drafts can be deleted", 409);

  const isAuthor = news.authorId === caller.id;
  if (!isAuthor && !isLocalOrSuperAdmin(caller)) return err("Forbidden", 403);

  try {
    await prisma.news.delete({ where: { id: news.id } });
    return ok({ deleted: true });
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "news-delete" }, extra: { newsId: news.id } });
    return err("Failed to delete news", 500);
  }
}

export const runtime = "nodejs";
