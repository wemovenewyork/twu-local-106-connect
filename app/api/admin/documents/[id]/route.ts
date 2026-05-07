import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
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

  const caller = await loadCaller(token.userId);
  if (!caller) return err("Unauthorized", 401);

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: DOC_INCLUDE,
  });
  if (!document) return err("Not found", 404);

  if (!canViewDocument(caller, document)) return err("Not found", 404);

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
