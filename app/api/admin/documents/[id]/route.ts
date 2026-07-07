import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { requireApprovedMember } from "@/lib/approval";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { canManageDocument, canViewDocument } from "@/lib/permissions";
import { deleteDocument } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const DOC_INCLUDE = {
  division: { select: { id: true, code: true, name: true } },
  subUnit: { select: { id: true, code: true, name: true } },
  uploader: { select: { id: true, firstName: true, lastName: true } },
} as const;

async function loadCaller(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, divisionId: true, subUnitId: true },
  });
}

// GET /api/admin/documents/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const gate = await requireApprovedMember(token.userId);
  if (gate.error) return err(gate.error, gate.status);
  const caller = gate.user;

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: DOC_INCLUDE,
  });
  if (!document) return err("Not found", 404);

  if (!canViewDocument(caller, document)) return err("Not found", 404);

  return ok({ document, canManage: canManageDocument(caller, document) });
}

// PATCH /api/admin/documents/[id]
// Edit metadata only. To replace the file, delete and re-upload.
// Body: { title?, description?, visibility?, divisionId?, subUnitId?, publiclyVisible? }
// publiclyVisible can only be set by localAdmin/superAdmin.
const VALID_VIS = new Set(["all", "division", "subUnit", "selfOnly"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await loadCaller(token.userId);
  if (!caller) return err("Unauthorized", 401);

  const { id } = await params;
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return err("Not found", 404);
  if (!canManageDocument(caller, existing)) return err("Forbidden", 403);

  let body: {
    title?: unknown; description?: unknown; visibility?: unknown;
    divisionId?: unknown; subUnitId?: unknown; publiclyVisible?: unknown;
  };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return err("Title cannot be empty", 400);
    data.title = t;
  }
  if (typeof body.description === "string" || body.description === null) {
    const d = typeof body.description === "string" ? body.description.trim() : "";
    data.description = d ? d : null;
  }
  if (typeof body.visibility === "string") {
    if (!VALID_VIS.has(body.visibility)) return err("Invalid visibility", 400);
    data.visibility = body.visibility;
  }
  if ("divisionId" in body) {
    data.divisionId = (typeof body.divisionId === "string" && body.divisionId) ? body.divisionId : null;
  }
  if ("subUnitId" in body) {
    data.subUnitId = (typeof body.subUnitId === "string" && body.subUnitId) ? body.subUnitId : null;
  }
  if (typeof body.publiclyVisible === "boolean") {
    if (caller.role !== "localAdmin" && caller.role !== "superAdmin") {
      return err("Only local/super admin can change publiclyVisible", 403);
    }
    data.publiclyVisible = body.publiclyVisible;
  }

  const document = await prisma.document.update({
    where: { id },
    data,
    include: DOC_INCLUDE,
  });

  writeAuditLog({
    adminId: caller.id,
    action: "documentUpdate",
    targetId: document.id,
    targetType: "document",
    detail: `Updated "${document.title}"`,
    ip: clientIp(req),
  });

  return ok({ document, canManage: canManageDocument(caller, document) });
}

// DELETE /api/admin/documents/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await loadCaller(token.userId);
  if (!caller) return err("Unauthorized", 401);

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return err("Not found", 404);

  if (!canManageDocument(caller, document)) return err("Forbidden", 403);

  // Delete the DB record first; if the blob delete fails, the orphan
  // is acceptable (cron cleanup can sweep later) and the user-facing
  // record is gone.
  try {
    await prisma.document.delete({ where: { id: document.id } });
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "document-delete-db" }, extra: { id: document.id } });
    return err("Failed to delete document", 500);
  }

  try {
    await deleteDocument(document.fileUrl);
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "document-delete-blob" }, extra: { id: document.id, url: document.fileUrl } });
    // Non-fatal — DB record is gone, blob will be orphaned.
  }

  writeAuditLog({
    adminId: caller.id,
    action: "documentDelete",
    targetId: document.id,
    targetType: "document",
    detail: `Deleted "${document.title}"`,
    ip: clientIp(req),
  });

  return new Response(null, { status: 204 });
}

export const runtime = "nodejs";
