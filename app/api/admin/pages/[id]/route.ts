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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { caller, error } = await authorize(req);
  if (error) return error;
  void caller;
  const { id } = await ctx.params;
  const page = await prisma.page.findUnique({ where: { id }, include: PAGE_INCLUDE });
  if (!page) return err("Page not found", 404);
  return ok({ page });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { caller, error } = await authorize(req);
  if (error) return error;

  const { id } = await ctx.params;
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return err("Page not found", 404);

  let body: { slug?: unknown; title?: unknown; bodyMd?: unknown; metaDescription?: unknown; published?: unknown };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  const data: Record<string, unknown> = {};

  if (typeof body.slug === "string") {
    const slug = body.slug.trim().toLowerCase();
    if (!slug) return err("Slug cannot be empty", 400);
    if (!SLUG_RE.test(slug)) return err("Slug must be kebab-case", 400);
    if (slug !== existing.slug) {
      const collision = await prisma.page.findUnique({ where: { slug } });
      if (collision) return err("A page with this slug already exists", 409);
      data.slug = slug;
    }
  }
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return err("Title cannot be empty", 400);
    data.title = t;
  }
  if (typeof body.bodyMd === "string") data.body = body.bodyMd;
  if (typeof body.metaDescription === "string" || body.metaDescription === null) {
    const md = typeof body.metaDescription === "string" ? body.metaDescription.trim().slice(0, 200) : "";
    data.metaDescription = md ? md : null;
  }
  if (typeof body.published === "boolean") {
    data.published = body.published;
    if (body.published && !existing.publishedAt) data.publishedAt = new Date();
    if (!body.published) data.publishedAt = null;
  }

  const page = await prisma.page.update({
    where: { id },
    data,
    include: PAGE_INCLUDE,
  });

  await writeAuditLog({
    adminId: caller.id,
    action: "page.update",
    targetId: page.id,
    targetType: "page",
    detail: `${page.slug}${page.published ? " (published)" : " (draft)"}`,
    ip: clientIp(req),
  });

  return ok({ page });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { caller, error } = await authorize(req);
  if (error) return error;
  const { id } = await ctx.params;
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return err("Page not found", 404);
  await prisma.page.delete({ where: { id } });
  await writeAuditLog({
    adminId: caller.id,
    action: "page.delete",
    targetId: id,
    targetType: "page",
    detail: existing.slug,
    ip: clientIp(req),
  });
  return ok({ deleted: true });
}
