import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isAdmin, canManageDivision } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { parseBody, BODY_4KB } from "@/lib/parseBody";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/escapeHtml";
import { brand } from "@/config/brand";

// POST /api/admin/registrations/[id]/reject
// body: { reason: string }
//
// Marks the registration rejected with a reason; the user remains in the DB
// but is blocked from re-registering with the same email (the register
// endpoint checks this).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const admin = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!admin || !isAdmin(admin)) return err("Forbidden", 403);

  const { id } = await params;
  const body = await parseBody(req, BODY_4KB);
  if (body instanceof NextResponse) return body;
  const { reason } = body as { reason?: string };
  if (!reason?.trim()) return err("Rejection reason required", 400);
  if (reason.trim().length > 500) return err("Reason must be 500 characters or fewer", 400);

  const reg = await prisma.registrationApproval.findUnique({
    where: { id },
    include: { user: true, declaredDivision: true },
  });
  if (!reg) return err("Registration not found", 404);
  if (reg.status !== "pending") return err(`Registration is already ${reg.status}`, 409);
  if (!reg.declaredDivisionId || !canManageDivision(admin, reg.declaredDivisionId)) {
    return err("Forbidden — outside your division scope", 403);
  }

  try {
    await prisma.registrationApproval.update({
      where: { id: reg.id },
      data: {
        status: "rejected",
        rejectionReason: reason.trim(),
        reviewerId: admin.id,
        reviewedAt: new Date(),
      },
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "registration-reject" }, extra: { regId: reg.id } });
    return err("Failed to reject registration", 500);
  }

  writeAuditLog({
    adminId: admin.id,
    action: "registration_reject",
    targetId: reg.userId,
    targetType: "user",
    detail: `Rejected registration for ${reg.declaredDivision?.code ?? "?"} — reason: ${reason.trim()}`,
    ip: clientIp(req),
  });

  const safeFirstName = escapeHtml(reg.user.firstName);
  const safeReason = escapeHtml(reason.trim());
  try {
    await sendEmail(
      reg.user.email,
      `${brand.name} registration update`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:${brand.colors.navy};color:#fff;border-radius:16px">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">Registration not approved</h1>
        <p style="color:rgba(255,255,255,.7);font-size:14px;line-height:1.6;margin:0 0 16px">
          Hi ${safeFirstName}, your division admin reviewed your ${brand.name} registration and was unable to approve it.
        </p>
        <div style="padding:12px 14px;border-radius:12px;background:rgba(173,27,39,.15);border:1px solid rgba(173,27,39,.45);margin:0 0 18px;font-size:13px;color:rgba(255,255,255,.85)">
          <strong style="color:#fff">Reason:</strong> ${safeReason}
        </div>
        <p style="color:rgba(255,255,255,.55);font-size:13px;line-height:1.6;margin:0">
          If you believe this is an error, contact your division admin directly.
        </p>
      </div>`
    );
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "registration-reject-email" }, extra: { userId: reg.userId } });
  }

  return ok({ rejected: true });
}

export const runtime = "nodejs";
