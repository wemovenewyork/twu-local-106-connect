import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { sendEmail } from "@/lib/email";
import { brand } from "@/config/brand";

// GET /api/cron/registration-reminders
//
// Hourly cron. Walks pending RegistrationApproval records and sends a
// reminder email to division admins at 12h / 24h / 72h post-creation.
// Each reminder fires at most once per registration via dedicated boolean
// columns on RegistrationApproval.
//
// Tighter cadence than WMNY's 3/7/14-day swap reminders — shift swap is
// the headline feature for TSO members, so a slow registration approval
// directly blocks members from the value of the app.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return err("Unauthorized", 401);

  const now = Date.now();
  const T_12H = 12 * 60 * 60 * 1000;
  const T_24H = 24 * 60 * 60 * 1000;
  const T_72H = 72 * 60 * 60 * 1000;

  const pending = await prisma.registrationApproval.findMany({
    where: { status: "pending" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      declaredDivision: { select: { id: true, code: true, name: true } },
      declaredSubUnit: { select: { code: true, name: true } },
    },
  });

  let sent = 0;
  for (const reg of pending) {
    const ageMs = now - new Date(reg.createdAt).getTime();
    let level: "12h" | "24h" | "72h" | null = null;
    if (ageMs >= T_72H && !reg.reminderSent72h) level = "72h";
    else if (ageMs >= T_24H && !reg.reminderSent24h) level = "24h";
    else if (ageMs >= T_12H && !reg.reminderSent12h) level = "12h";
    if (!level || !reg.declaredDivisionId) continue;

    // Find division admins (own division) + local/super admins (all)
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ["localAdmin", "superAdmin"] } },
          { role: "divisionAdmin", divisionId: reg.declaredDivisionId },
        ],
      },
      select: { id: true, email: true, firstName: true },
    });
    if (!admins.length) continue;

    const subject = level === "72h"
      ? `Final reminder: ${reg.user.firstName} ${reg.user.lastName} pending approval (3+ days)`
      : `Reminder: ${reg.user.firstName} ${reg.user.lastName} pending approval (${level === "24h" ? "1 day" : "12 hours"})`;
    const ageLabel = level === "72h" ? "more than 3 days" : level === "24h" ? "more than 1 day" : "more than 12 hours";

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:${brand.colors.navy};color:#fff;border-radius:16px">
      <h1 style="font-size:20px;font-weight:800;margin:0 0 8px">Pending registration — ${ageLabel}</h1>
      <p style="color:rgba(255,255,255,.7);font-size:14px;line-height:1.6;margin:0 0 16px">
        ${reg.user.firstName} ${reg.user.lastName} (${reg.user.email}) signed up for ${reg.declaredDivision?.name ?? "your division"}${reg.declaredSubUnit ? ` / ${reg.declaredSubUnit.name}` : ""} and is waiting for admin review.
      </p>
      <a href="${brand.primaryUrl}/admin/registrations" style="display:inline-block;padding:14px 28px;border-radius:12px;background:${brand.colors.red};color:#fff;font-weight:700;font-size:15px;text-decoration:none">
        Review Queue
      </a>
    </div>`;

    for (const admin of admins) {
      try {
        await sendEmail(admin.email, subject, html);
        sent++;
      } catch (e) {
        Sentry.captureException(e, { tags: { source: "registration-reminder" }, extra: { regId: reg.id, level, adminEmail: admin.email } });
      }
    }

    // Mark reminder sent (per-level). We mark all lower levels too so a
    // skipped earlier reminder (e.g. cron lag past 12h boundary) doesn't
    // re-fire after the 24h reminder has already gone out.
    const mark: Partial<Record<"reminderSent12h" | "reminderSent24h" | "reminderSent72h", boolean>> = {};
    if (level === "12h") mark.reminderSent12h = true;
    if (level === "24h") { mark.reminderSent12h = true; mark.reminderSent24h = true; }
    if (level === "72h") { mark.reminderSent12h = true; mark.reminderSent24h = true; mark.reminderSent72h = true; }
    await prisma.registrationApproval.update({ where: { id: reg.id }, data: mark });
  }

  return ok({ scanned: pending.length, sent });
}

export const runtime = "nodejs";
