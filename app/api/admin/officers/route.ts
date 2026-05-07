import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isLocalOrSuperAdmin } from "@/lib/permissions";
import { uploadOfficerPhoto } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const OFFICER_INCLUDE = {
  division: { select: { id: true, code: true, name: true } },
} as const;

const ALLOWED_PHOTO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const VALID_SCOPES = new Set(["local", "division", "staff"]);

// GET /api/admin/officers — list all (local/super only)
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!caller || !isLocalOrSuperAdmin(caller)) return err("Forbidden", 403);

  const officers = await prisma.officer.findMany({
    include: OFFICER_INCLUDE,
    orderBy: [
      { scope: "asc" },
      { displayOrder: "asc" },
      { name: "asc" },
    ],
  });
  return ok({ officers });
}

// POST /api/admin/officers — create with optional photo (multipart/form-data)
export async function POST(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!caller || !isLocalOrSuperAdmin(caller)) return err("Forbidden", 403);

  let form: FormData;
  try { form = await req.formData(); } catch { return err("Invalid form data", 400); }

  const name = String(form.get("name") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const scope = String(form.get("scope") ?? "");
  const divisionId = (form.get("divisionId") as string | null) || null;
  const displayOrder = Number(form.get("displayOrder") ?? 0) || 0;
  const bio = (form.get("bio") as string | null)?.toString().trim() || null;
  const contactEmail = (form.get("contactEmail") as string | null)?.toString().trim() || null;
  const contactFormEnabled = String(form.get("contactFormEnabled") ?? "true") === "true";
  const termStartRaw = form.get("termStart") as string | null;
  const termEndRaw = form.get("termEnd") as string | null;
  const active = String(form.get("active") ?? "true") === "true";

  if (!name) return err("Name is required", 400);
  if (!title) return err("Title is required", 400);
  if (!VALID_SCOPES.has(scope)) return err("Invalid scope", 400);
  if (scope === "division" && !divisionId) return err("divisionId required for division scope", 400);

  let photoUrl: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_PHOTO_MIME.has(file.type)) {
      return err("Photo must be PNG, JPEG, or WebP", 400);
    }
    if (file.size > PHOTO_MAX_BYTES) {
      return err("Photo too large (max 5MB)", 400);
    }
    try {
      const uploaded = await uploadOfficerPhoto(file);
      photoUrl = uploaded.url;
    } catch (e) {
      Sentry.captureException(e);
      return err("Photo upload failed", 500);
    }
  }

  const termStart = termStartRaw ? new Date(termStartRaw) : null;
  const termEnd = termEndRaw ? new Date(termEndRaw) : null;
  if (termStart && isNaN(termStart.getTime())) return err("Invalid termStart", 400);
  if (termEnd && isNaN(termEnd.getTime())) return err("Invalid termEnd", 400);

  const officer = await prisma.officer.create({
    data: {
      name,
      title,
      scope: scope as "local" | "division" | "staff",
      divisionId: scope === "division" ? divisionId : null,
      displayOrder,
      bio,
      photoUrl,
      contactEmail,
      contactFormEnabled,
      termStart,
      termEnd,
      active,
    },
    include: OFFICER_INCLUDE,
  });

  await writeAuditLog({
    adminId: caller.id,
    action: "officer.create",
    targetId: officer.id,
    targetType: "officer",
    detail: `${officer.scope}:${officer.title} ${officer.name}`,
    ip: clientIp(req),
  });

  return ok({ officer }, 201);
}
