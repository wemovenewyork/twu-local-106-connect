import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isLocalAdmin } from "@/lib/permissions";
import { uploadDocument } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const DOC_INCLUDE = {
  division: { select: { id: true, code: true, name: true } },
  subUnit: { select: { id: true, code: true, name: true } },
  uploader: { select: { id: true, firstName: true, lastName: true } },
} as const;

const ADMIN_ROLES = ["divisionAdmin", "localAdmin", "superAdmin"] as const;
const MEMBER_MAX_BYTES = 10 * 1024 * 1024;
const ADMIN_MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type Visibility = "all" | "division" | "subUnit" | "selfOnly";

// GET /api/admin/documents
// Lists documents visible to the caller, scoped by visibility.
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true, subUnitId: true },
  });
  if (!caller) return err("Unauthorized", 401);

  // Local/super admins see everything. Others see by-visibility OR clauses.
  const where: Record<string, unknown> = isLocalAdmin(caller)
    ? {}
    : (() => {
        const orClauses: Record<string, unknown>[] = [
          { visibility: "all" },
          { visibility: "selfOnly", ownerUserId: caller.id },
        ];
        if (caller.divisionId) {
          orClauses.push({ visibility: "division", divisionId: caller.divisionId });
        }
        if (caller.subUnitId) {
          orClauses.push({ visibility: "subUnit", subUnitId: caller.subUnitId });
        }
        return { OR: orClauses };
      })();

  const documents = await prisma.document.findMany({
    where,
    include: DOC_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok({ documents });
}

// POST /api/admin/documents
// Multipart upload. Fields: file (File), title, description?, visibility, divisionId?, subUnitId?
export async function POST(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true, subUnitId: true },
  });
  if (!caller) return err("Unauthorized", 401);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return err("Invalid multipart body", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return err("File is required", 400);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return err("Title is required", 400);
  if (title.length > 200) return err("Title too long (max 200 chars)", 400);

  const description = String(formData.get("description") ?? "").trim();
  if (description.length > 1000) return err("Description too long (max 1000 chars)", 400);

  const visibilityRaw = String(formData.get("visibility") ?? "");
  if (!["all", "division", "subUnit", "selfOnly"].includes(visibilityRaw)) {
    return err("Invalid visibility", 400);
  }
  const visibility = visibilityRaw as Visibility;

  const divisionIdRaw = formData.get("divisionId");
  const divisionId = typeof divisionIdRaw === "string" && divisionIdRaw ? divisionIdRaw : null;
  const subUnitIdRaw = formData.get("subUnitId");
  const subUnitId = typeof subUnitIdRaw === "string" && subUnitIdRaw ? subUnitIdRaw : null;

  // Authorization by visibility
  const isAdminTier = (ADMIN_ROLES as readonly string[]).includes(caller.role);
  const isLocalSuper = isLocalAdmin(caller);

  if (visibility === "all") {
    if (!isLocalSuper) return err("Only local/super admins can post all-members documents", 403);
  } else if (visibility === "division") {
    if (!divisionId) return err("divisionId required for division-scoped documents", 400);
    if (!isLocalSuper && !(caller.role === "divisionAdmin" && caller.divisionId === divisionId)) {
      return err("Forbidden — not your division", 403);
    }
  } else if (visibility === "subUnit") {
    if (!subUnitId) return err("subUnitId required for sub-unit-scoped documents", 400);
    const subUnit = await prisma.subUnit.findUnique({
      where: { id: subUnitId },
      select: { id: true, divisionId: true },
    });
    if (!subUnit) return err("Sub-unit not found", 404);
    if (!isLocalSuper && !(caller.role === "divisionAdmin" && caller.divisionId === subUnit.divisionId)) {
      return err("Forbidden — sub-unit not in your division", 403);
    }
  }
  // visibility === "selfOnly" — anyone can upload personal documents

  // File size limit by role
  const maxBytes = isAdminTier ? ADMIN_MAX_BYTES : MEMBER_MAX_BYTES;
  if (file.size > maxBytes) {
    const limitMb = Math.floor(maxBytes / (1024 * 1024));
    return err(`File too large (max ${limitMb}MB)`, 400);
  }
  if (file.size === 0) return err("File is empty", 400);

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    return err("Unsupported file type. Allowed: PDF, DOCX, XLSX, PNG, JPEG, WebP", 400);
  }

  let uploaded;
  try {
    uploaded = await uploadDocument(file, caller.id);
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "document-upload" }, extra: { userId: caller.id } });
    return err("Failed to upload file", 500);
  }

  const created = await prisma.document.create({
    data: {
      title,
      description: description || null,
      fileUrl: uploaded.url,
      fileSize: uploaded.size,
      mimeType: uploaded.mimeType,
      visibility,
      divisionId: visibility === "division" || visibility === "subUnit" ? divisionId : null,
      subUnitId: visibility === "subUnit" ? subUnitId : null,
      ownerUserId: visibility === "selfOnly" ? caller.id : null,
      uploaderId: caller.id,
    },
    include: DOC_INCLUDE,
  });

  writeAuditLog({
    adminId: caller.id,
    action: "documentUpload",
    targetId: created.id,
    targetType: "document",
    detail: `Uploaded "${created.title}" (${visibility})`,
    ip: clientIp(req),
  });

  return ok({ document: created }, 201);
}

export const runtime = "nodejs";
