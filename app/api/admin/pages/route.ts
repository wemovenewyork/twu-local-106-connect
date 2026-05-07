import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isLocalOrSuperAdmin } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const PAGE_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true } },
} as const;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function authorize(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return { error: err("Unauthorized", 401) }; }
  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!caller || !isLocalOrSuperAdmin(caller)) return { error: err("Forbidden", 403) };
  return { caller };
}

export async function GET(req: NextRequest) {
  const { caller, error } = await authorize(req);
  if (error) return error;
  void caller;
  const pages = await prisma.page.findMany({
    include: PAGE_INCLUDE,
    orderBy: [{ updatedAt: "desc" }],
  });
  return ok({ pages });
}

export async function POST(req: NextRequest) {
  const { caller, error } = await authorize(req);
  if (error) return error;

  let body: { slug?: unknown; title?: unknown; bodyMd?: unknown; metaDescription?: unknown; published?: unknown };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyMd = typeof body.bodyMd === "string" ? body.bodyMd : "";
  const metaDescription = typeof body.metaDescription === "string" ? body.metaDescription.trim().slice(0, 200) : null;
  const published = body.published === true;

  if (!slug) return err("Slug is required", 400);
  if (!SLUG_RE.test(slug)) return err("Slug must be kebab-case (a-z, 0-9, hyphens)", 400);
  if (!title) return err("Title is required", 400);

  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) return err("A page with this slug already exists", 409);

  const page = await prisma.page.create({
    data: {
      slug,
      title,
      body: bodyMd,
      metaDescription: metaDescription || null,
      published,
      publishedAt: published ? new Date() : null,
      authorId: caller.id,
    },
    include: PAGE_INCLUDE,
  });

  await writeAuditLog({
    adminId: caller.id,
    action: "page.create",
    targetId: page.id,
    targetType: "page",
    detail: `${page.slug}${page.published ? " (published)" : " (draft)"}`,
    ip: clientIp(req),
  });

  return ok({ page }, 201);
}
