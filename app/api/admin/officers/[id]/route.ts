import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isLocalOrSuperAdmin } from "@/lib/permissions";
import { uploadOfficerPhoto, deleteOfficerPhoto } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const OFFICER_INCLUDE = {
  division: { select: { id: true, code: true, name: true } },
} as const;

const ALLOWED_PHOTO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const VALID_SCOPES = new Set(["local", "division", "staff"]);

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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { caller, error } = await authorize(req);
  if (error) return error;

  const { id } = await ctx.params;
  const officer = await prisma.officer.findUnique({
    where: { id },
    include: OFFICER_INCLUDE,
  });
  if (!officer) return err("Officer not found", 404);
  void caller;
  return ok({ officer });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { caller, error } = await authorize(req);
  if (error) return error;

  const { id } = await ctx.params;
  const existing = await prisma.officer.findUnique({ where: { id } });
  if (!existing) return err("Officer not found", 404);

  let form: FormData;
  try { form = await req.formData(); } catch { return err("Invalid form data", 400); }

  const data: Record<string, unknown> = {};

  const name = form.get("name");
  if (typeof name === "string") {
    const t = name.trim();
    if (!t) return err("Name cannot be empty", 400);
    data.name = t;
  }
  const title = form.get("title");
  if (typeof title === "string") {
    const t = title.trim();
    if (!t) return err("Title cannot be empty", 400);
    data.title = t;
  }
  const scopeRaw = form.get("scope");
  let scope = existing.scope;
  if (typeof scopeRaw === "string") {
    if (!VALID_SCOPES.has(scopeRaw)) return err("Invalid scope", 400);
    scope = scopeRaw as "local" | "division" | "staff";
    data.scope = scope;
  }
  if (form.has("divisionId")) {
    const divisionId = (form.get("divisionId") as string | null) || null;
    if (scope === "division" && !divisionId) return err("divisionId required for division scope", 400);
    data.divisionId = scope === "division" ? divisionId : null;
  } else if (form.has("scope") && scope !== "division") {
    data.divisionId = null;
  }
  if (form.has("displayOrder")) {
    data.displayOrder = Number(form.get("displayOrder") ?? 0) || 0;
  }
  if (form.has("bio")) {
    const bio = (form.get("bio") as string | null)?.toString().trim();
    data.bio = bio ? bio : null;
  }
  if (form.has("contactEmail")) {
    const email = (form.get("contactEmail") as string | null)?.toString().trim();
    data.contactEmail = email ? email : null;
  }
  if (form.has("contactFormEnabled")) {
    data.contactFormEnabled = String(form.get("contactFormEnabled")) === "true";
  }
  if (form.has("active")) {
    data.active = String(form.get("active")) === "true";
  }
  if (form.has("termStart")) {
    const v = form.get("termStart") as string | null;
    if (!v) data.termStart = null;
    else {
      const d = new Date(v);
      if (isNaN(d.getTime())) return err("Invalid termStart", 400);
      data.termStart = d;
    }
  }
  if (form.has("termEnd")) {
    const v = form.get("termEnd") as string | null;
    if (!v) data.termEnd = null;
    else {
      const d = new Date(v);
      if (isNaN(d.getTime())) return err("Invalid termEnd", 400);
      data.termEnd = d;
    }
  }

  // Photo handling: if a new file is uploaded, delete the old one.
  // If photoRemove=true and no new file, clear the photo.
  const file = form.get("photo");
  const photoRemove = String(form.get("photoRemove") ?? "false") === "true";
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_PHOTO_MIME.has(file.type)) {
      return err("Photo must be PNG, JPEG, or WebP", 400);
    }
    if (file.size > PHOTO_MAX_BYTES) {
      return err("Photo too large (max 5MB)", 400);
    }
    try {
      const uploaded = await uploadOfficerPhoto(file);
      data.photoUrl = uploaded.url;
      if (existing.photoUrl) {
        await deleteOfficerPhoto(existing.photoUrl).catch(() => {});
      }
    } catch (e) {
      Sentry.captureException(e);
      return err("Photo upload failed", 500);
    }
  } else if (photoRemove && existing.photoUrl) {
    await deleteOfficerPhoto(existing.photoUrl).catch(() => {});
    data.photoUrl = null;
  }

  const officer = await prisma.officer.update({
    where: { id },
    data,
    include: OFFICER_INCLUDE,
  });

  await writeAuditLog({
    adminId: caller.id,
    action: "officer.update",
    targetId: officer.id,
    targetType: "officer",
    detail: `${officer.scope}:${officer.title} ${officer.name}`,
    ip: clientIp(req),
  });

  return ok({ officer });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { caller, error } = await authorize(req);
  if (error) return error;

  const { id } = await ctx.params;
  const existing = await prisma.officer.findUnique({ where: { id } });
  if (!existing) return err("Officer not found", 404);

  if (existing.photoUrl) {
    await deleteOfficerPhoto(existing.photoUrl).catch(() => {});
  }
  await prisma.officer.delete({ where: { id } });

  await writeAuditLog({
    adminId: caller.id,
    action: "officer.delete",
    targetId: id,
    targetType: "officer",
    detail: `${existing.scope}:${existing.title} ${existing.name}`,
    ip: clientIp(req),
  });

  return ok({ deleted: true });
}
