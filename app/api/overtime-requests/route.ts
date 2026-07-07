import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { requireApprovedMember } from "@/lib/approval";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const PAYROLL_PATTERN = /^[A-Za-z0-9-]+$/;

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// GET /api/overtime-requests
// Returns the caller's own OT requests (last 30 days, all statuses).
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const gate = await requireApprovedMember(token.userId);
  if (gate.error) return err(gate.error, gate.status);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const requests = await prisma.overtimeRequest.findMany({
    where: { submitterId: gate.user.id, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({ requests });
}

// POST /api/overtime-requests
// Body: { requestedDate, type: "rdo"|"doubleShift", payrollNumber, preferences? }
export async function POST(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const gate = await requireApprovedMember(token.userId);
  if (gate.error) return err(gate.error, gate.status);
  const me = gate.user;

  let body: { requestedDate?: unknown; type?: unknown; payrollNumber?: unknown; preferences?: unknown };
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  // Validation
  const requestedDateStr = typeof body.requestedDate === "string" ? body.requestedDate.trim() : "";
  if (!requestedDateStr) return err("Date is required", 400);
  const requestedDate = new Date(requestedDateStr + "T00:00:00.000Z");
  if (Number.isNaN(requestedDate.getTime())) return err("Invalid date", 400);
  if (requestedDate < startOfTodayUTC()) return err("Date must be today or in the future", 400);

  const type = body.type;
  if (type !== "rdo" && type !== "doubleShift") return err("Type must be 'rdo' or 'doubleShift'", 400);

  const payrollNumber = typeof body.payrollNumber === "string" ? body.payrollNumber.trim() : "";
  if (!payrollNumber) return err("Payroll number is required", 400);
  if (payrollNumber.length > 32) return err("Payroll number is too long (max 32 chars)", 400);
  if (!PAYROLL_PATTERN.test(payrollNumber)) return err("Payroll number may contain letters, digits, and dashes only", 400);

  let preferences: string | null = null;
  if (body.preferences != null) {
    if (typeof body.preferences !== "string") return err("Preferences must be a string", 400);
    const trimmed = body.preferences.trim();
    if (trimmed.length > 500) return err("Preferences must be 500 chars or fewer", 400);
    preferences = trimmed.length === 0 ? null : trimmed;
  }

  try {
    const created = await prisma.overtimeRequest.create({
      data: {
        submitterId: me.id,
        payrollNumber,
        requestedDate,
        type,
        preferences,
        status: "submitted",
      },
    });

    // Mask the payroll number — last 3 chars only — so audit logs don't
    // become a secondary store of payroll numbers (the whole point of
    // keeping them per-request rather than on User).
    const masked = payrollNumber.length <= 3
      ? "***"
      : `***${payrollNumber.slice(-3)}`;

    writeAuditLog({
      adminId: me.id,
      action: "overtimeRequestCreate",
      targetId: created.id,
      targetType: "overtimeRequest",
      detail: `Submitted ${type === "rdo" ? "RDO" : "Double Shift"} OT for ${requestedDateStr} (payroll ${masked})`,
      ip: clientIp(req),
    });

    return ok({
      id: created.id,
      requestedDate: created.requestedDate,
      type: created.type,
      status: created.status,
    }, 201);
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "overtime-create" } });
    return err("Failed to submit request", 500);
  }
}

export const runtime = "nodejs";
