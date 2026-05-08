import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isLocalOrSuperAdmin } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

// PATCH /api/admin/overtime-requests/[id]
// Body: { action: "acknowledge" }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!caller) return err("Unauthorized", 401);
  if (!isLocalOrSuperAdmin(caller)) return err("Forbidden", 403);

  const { id } = await params;

  let body: { action?: unknown };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  if (body.action !== "acknowledge") {
    return err("Unsupported action", 400);
  }

  const existing = await prisma.overtimeRequest.findUnique({
    where: { id },
    select: {
      id: true, status: true, requestedDate: true, type: true,
      submitter: { select: { firstName: true, lastName: true } },
    },
  });
  if (!existing) return err("Not found", 404);
  if (existing.status !== "submitted") {
    return err(`Cannot acknowledge a request with status '${existing.status}'`, 400);
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: {
      status: "acknowledged",
      acknowledgedAt: new Date(),
      acknowledgedById: caller.id,
    },
  });

  const dateStr = existing.requestedDate.toISOString().slice(0, 10);
  const typeStr = existing.type === "rdo" ? "RDO" : "Double Shift";
  const submitterName = `${existing.submitter.firstName} ${existing.submitter.lastName}`.trim();
  writeAuditLog({
    adminId: caller.id,
    action: "overtimeRequestAcknowledge",
    targetId: id,
    targetType: "overtimeRequest",
    detail: `Acknowledged ${typeStr} OT for ${dateStr} (submitter: ${submitterName})`,
    ip: clientIp(req),
  });

  return ok({ id: updated.id, status: updated.status });
}

export const runtime = "nodejs";
