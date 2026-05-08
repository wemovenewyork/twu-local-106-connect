import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
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

  const me = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true },
  });
  if (!me) return err("Unauthorized", 401);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const requests = await prisma.overtimeRequest.findMany({
    where: { submitterId: me.id, createdAt: { gte: since } },
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

  const me = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true },
  });
  if (!me) return err("Unauthorized", 401);

  // Approval gate: only verified users can submit. Admin tiers bypass the
  // RegistrationApproval check (some superAdmins/staff don't have one).
  const isAdminTier = ["editor", "divisionAdmin", "localAdmin", "superAdmin"].includes(me.role);
  if (!isAdminTier) {
    const approval = await prisma.registrationApproval.findUnique({
      where: { userId: me.id },
      select: { status: true },
    });
    if (!approval || approval.status !== "approved") {
      return err("Your registration must be approved before submitting OT requests", 403);
    }
  }

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

    writeAuditLog({
      adminId: me.id,
      action: "overtimeRequestCreate",
      targetId: created.id,
      targetType: "overtimeRequest",
      detail: `Submitted ${type} OT for ${requestedDateStr}`,
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
