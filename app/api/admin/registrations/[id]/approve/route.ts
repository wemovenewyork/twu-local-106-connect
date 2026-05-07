import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isAdmin, canManageDivision } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/escapeHtml";
import { brand } from "@/config/brand";
import { notifyUser } from "@/lib/notifyUser";

// POST /api/admin/registrations/[id]/approve
// Approves a pending registration: assigns the declared division/sub-unit
// to the user and flips status to approved.
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

  const reg = await prisma.registrationApproval.findUnique({
    where: { id },
    include: { user: true, declaredDivision: true, declaredSubUnit: true },
  });
  if (!reg) return err("Registration not found", 404);
  if (!reg.declaredDivisionId) return err("Registration has no declared division", 400);
  if (reg.status !== "pending") return err(`Registration is already ${reg.status}`, 409);
  if (!canManageDivision(admin, reg.declaredDivisionId)) return err("Forbidden — outside your division scope", 403);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.registrationApproval.update({
        where: { id: reg.id },
        data: {
          status: "approved",
          assignedDivisionId: reg.declaredDivisionId,
          assignedSubUnitId: reg.declaredSubUnitId,
          reviewerId: admin.id,
          reviewedAt: new Date(),
        },
      });
      await tx.user.update({
        where: { id: reg.userId },
        data: {
          divisionId: reg.declaredDivisionId,
          subUnitId: reg.declaredSubUnitId,
          verifiedMember: true,
          divisionSetAt: new Date(),
        },
      });
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "registration-approve" }, extra: { regId: reg.id } });
    return err("Failed to approve registration", 500);
  }

  writeAuditLog({
    adminId: admin.id,
    action: "registration_approve",
    targetId: reg.userId,
    targetType: "user",
    detail: `Approved registration into ${reg.declaredDivision?.code ?? "?"}${reg.declaredSubUnit ? `/${reg.declaredSubUnit.code}` : ""}`,
    ip: clientIp(req),
  });

  // Notify the user — email + in-app push. Non-fatal.
  const safeFirstName = escapeHtml(reg.user.firstName);
  const divisionName = escapeHtml(reg.declaredDivision?.name ?? "your division");
  try {
    await sendEmail(
      reg.user.email,
      `Welcome to ${brand.name} — registration approved`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:${brand.colors.navy};color:#fff;border-radius:16px">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">You're in.</h1>
        <p style="color:rgba(255,255,255,.7);font-size:14px;line-height:1.6;margin:0 0 24px">
          Hi ${safeFirstName}, your division admin approved your registration for <strong>${divisionName}</strong>. You now have full access to ${brand.name}.
        </p>
        <a href="${brand.primaryUrl}/login" style="display:inline-block;padding:14px 28px;border-radius:12px;background:${brand.colors.red};color:#fff;font-weight:700;font-size:15px;text-decoration:none">
          Sign In
        </a>
      </div>`
    );
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "registration-approve-email" }, extra: { userId: reg.userId } });
  }

  await notifyUser(reg.userId, {
    title: "Registration approved",
    body: `Welcome to ${brand.appShortName}. Tap to open.`,
    url: "/divisions",
  });

  return ok({ approved: true });
}

export const runtime = "nodejs";
