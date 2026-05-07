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
import { notifyUser } from "@/lib/notifyUser";

// POST /api/admin/registrations/[id]/reassign
// body: { newDivisionCode: string, newSubUnitCode?: string, note?: string }
//
// v1: reassign sets status directly to approved with the new division/sub-unit
// (no user re-confirmation step). Re-confirmation is a v2 enhancement.
// Caller must be able to manage BOTH the original declared division and
// the new target division.
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
  const { newDivisionCode, newSubUnitCode, note } = body as {
    newDivisionCode?: string; newSubUnitCode?: string; note?: string;
  };
  if (!newDivisionCode) return err("newDivisionCode required", 400);
  if (note && note.length > 500) return err("Note must be 500 characters or fewer", 400);

  const reg = await prisma.registrationApproval.findUnique({
    where: { id },
    include: { user: true, declaredDivision: true },
  });
  if (!reg) return err("Registration not found", 404);
  if (reg.status !== "pending") return err(`Registration is already ${reg.status}`, 409);
  if (!reg.declaredDivisionId || !canManageDivision(admin, reg.declaredDivisionId)) {
    return err("Forbidden — outside your division scope", 403);
  }

  const newDivision = await prisma.division.findUnique({ where: { code: newDivisionCode } });
  if (!newDivision) return err("Target division not found", 404);
  if (!canManageDivision(admin, newDivision.id)) return err("Forbidden — cannot manage target division", 403);

  let newSubUnitId: string | null = null;
  if (newSubUnitCode) {
    const su = await prisma.subUnit.findUnique({ where: { code: newSubUnitCode } });
    if (!su) return err("Target sub-unit not found", 404);
    if (su.divisionId !== newDivision.id) return err("Sub-unit does not belong to target division", 400);
    newSubUnitId = su.id;
  } else {
    const subUnitCount = await prisma.subUnit.count({ where: { divisionId: newDivision.id } });
    if (subUnitCount > 0) return err("Sub-unit is required for the target division", 400);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.registrationApproval.update({
        where: { id: reg.id },
        data: {
          status: "approved",
          assignedDivisionId: newDivision.id,
          assignedSubUnitId: newSubUnitId,
          reviewerId: admin.id,
          reviewedAt: new Date(),
        },
      });
      await tx.user.update({
        where: { id: reg.userId },
        data: {
          divisionId: newDivision.id,
          subUnitId: newSubUnitId,
          verifiedMember: true,
          divisionSetAt: new Date(),
        },
      });
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "registration-reassign" }, extra: { regId: reg.id } });
    return err("Failed to reassign registration", 500);
  }

  writeAuditLog({
    adminId: admin.id,
    action: "registration_reassign",
    targetId: reg.userId,
    targetType: "user",
    detail: `Reassigned registration from ${reg.declaredDivision?.code ?? "?"} to ${newDivision.code}${newSubUnitCode ? `/${newSubUnitCode}` : ""}${note ? ` — note: ${note}` : ""}`,
    ip: clientIp(req),
  });

  const safeFirstName = escapeHtml(reg.user.firstName);
  const declaredName = escapeHtml(reg.declaredDivision?.name ?? "your declared division");
  const newName = escapeHtml(newDivision.name);
  const safeNote = note ? escapeHtml(note) : null;
  try {
    await sendEmail(
      reg.user.email,
      `Your ${brand.name} registration was approved (with a change)`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:${brand.colors.navy};color:#fff;border-radius:16px">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">Approved — with a division change</h1>
        <p style="color:rgba(255,255,255,.7);font-size:14px;line-height:1.6;margin:0 0 16px">
          Hi ${safeFirstName}, your division admin approved your registration but reassigned you from <strong>${declaredName}</strong> to <strong>${newName}</strong>.
        </p>
        ${safeNote ? `<div style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.06);margin:0 0 18px;font-size:13px;color:rgba(255,255,255,.85)"><strong>Note from your admin:</strong> ${safeNote}</div>` : ""}
        <a href="${brand.primaryUrl}/login" style="display:inline-block;padding:14px 28px;border-radius:12px;background:${brand.colors.red};color:#fff;font-weight:700;font-size:15px;text-decoration:none">
          Sign In
        </a>
      </div>`
    );
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "registration-reassign-email" }, extra: { userId: reg.userId } });
  }

  await notifyUser(reg.userId, {
    title: "Registration approved (reassigned)",
    body: `You've been added to ${newDivision.name}.`,
    url: "/divisions",
  });

  return ok({ reassigned: true });
}

export const runtime = "nodejs";
