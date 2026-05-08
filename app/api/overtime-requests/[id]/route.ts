import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

// PATCH /api/overtime-requests/[id]
// Caller withdraws their own pending submission. Body: { status: "withdrawn" }.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { id } = await params;

  const existing = await prisma.overtimeRequest.findUnique({
    where: { id },
    select: { id: true, submitterId: true, status: true, requestedDate: true, type: true },
  });
  if (!existing) return err("Not found", 404);
  if (existing.submitterId !== token.userId) return err("Forbidden", 403);

  let body: { status?: unknown };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  if (body.status !== "withdrawn") {
    return err("Only the 'withdrawn' status transition is supported here", 400);
  }
  if (existing.status !== "submitted") {
    return err(`Cannot withdraw a request with status '${existing.status}'`, 400);
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: { status: "withdrawn", withdrawnAt: new Date() },
  });

  const dateStr = existing.requestedDate.toISOString().slice(0, 10);
  const typeStr = existing.type === "rdo" ? "RDO" : "Double Shift";
  writeAuditLog({
    adminId: token.userId,
    action: "overtimeRequestWithdraw",
    targetId: id,
    targetType: "overtimeRequest",
    detail: `Withdrew own ${typeStr} OT for ${dateStr}`,
    ip: clientIp(req),
  });

  return ok({ id: updated.id, status: updated.status });
}

export const runtime = "nodejs";
