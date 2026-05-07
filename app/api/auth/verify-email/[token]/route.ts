import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/escapeHtml";
import { brand } from "@/config/brand";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = clientIp(req);
  if (!await rateLimit(`verify-email:${ip}`, 5, 15 * 60 * 1000)) {
    Sentry.captureEvent({ message: "Verify-email rate limit hit", level: "warning", tags: { ip } });
    return err("Too many attempts — try again in 15 minutes", 429);
  }

  try {
    const { token } = await params;

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpires: { gt: new Date() },
      },
    });

    if (!user) return err("Invalid or expired verification link", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    // Welcome email — sent once, right after the user verifies their email.
    // The verify token is now cleared, so this branch can never fire twice
    // for the same user. Non-fatal: a failed send doesn't roll back verification,
    // it just gets reported to Sentry so we know if Resend is degraded.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? brand.primaryUrl;
    const safeFirstName = escapeHtml(user.firstName);
    const welcomeHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:${brand.colors.navy};color:#fff;border-radius:16px">
  <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">Welcome to ${brand.name}, ${safeFirstName} 👷</h1>
  <p style="color:rgba(255,255,255,.65);font-size:14px;line-height:1.6;margin:0 0 24px">
    Built for and by ${brand.unionName} supervisors — and you're now part of it.
  </p>

  <a href="${appUrl}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:${brand.colors.red};color:#fff;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:28px">
    Open ${brand.appShortName}
  </a>

  <h2 style="font-size:14px;font-weight:700;color:${brand.colors.red};text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 8px">The point</h2>
  <p style="color:rgba(255,255,255,.7);font-size:13px;line-height:1.7;margin:0 0 20px">
    Coordinating swaps over group texts and bulletin boards is a mess. ${brand.name} puts every available swap in one place where you can find it, message another supervisor directly, and lock the agreement in. Works for daily work swaps, RDOs, and vacation weeks.
  </p>

  <h2 style="font-size:14px;font-weight:700;color:${brand.colors.red};text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 8px">Two things to keep in mind</h2>
  <p style="color:rgba(255,255,255,.7);font-size:13px;line-height:1.7;margin:0 0 20px">
    ${brand.name} coordinates swaps but doesn't approve them — every swap still has to go through MTA / MaBSTOA / MTA Bus official approval procedures the normal way. The union does not approve or process shift swaps either. We just help you find the swap faster.
  </p>

  <h2 style="font-size:14px;font-weight:700;color:${brand.colors.red};text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 8px">Getting started</h2>
  <ol style="color:rgba(255,255,255,.7);font-size:13px;line-height:1.8;margin:0 0 20px;padding-left:20px">
    <li><strong style="color:#fff">Pick your depot.</strong> This is your home base — you'll see swaps from your depot first.</li>
    <li><strong style="color:#fff">Post a swap or browse.</strong> Need a Saturday off? Post it. Looking to pick up a Tuesday shift? Browse.</li>
    <li><strong style="color:#fff">Message, agree, print.</strong> Talk it out in-app, confirm with the other supervisor, print the agreement, follow your depot's normal approval steps.</li>
  </ol>

  <h2 style="font-size:14px;font-weight:700;color:${brand.colors.red};text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 8px">Almost done</h2>
  <p style="color:rgba(255,255,255,.7);font-size:13px;line-height:1.7;margin:0 0 12px">
    Once your division admin approves your registration, you'll have full access.
  </p>

  <h2 style="font-size:14px;font-weight:700;color:${brand.colors.red};text-transform:uppercase;letter-spacing:1.5px;margin:28px 0 8px">Stuck on something?</h2>
  <p style="color:rgba(255,255,255,.7);font-size:13px;line-height:1.7;margin:0 0 24px">
    Email <a href="mailto:${brand.contactEmail}" style="color:${brand.colors.red};text-decoration:underline">${brand.contactEmail}</a> — real human, real fast response.
  </p>

  <p style="color:rgba(255,255,255,.55);font-size:13px;line-height:1.6;margin:0 0 4px">Stay safe.</p>
  <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 18px">— ${brand.unionName}</p>

  <p style="color:rgba(255,255,255,.4);font-size:11px;line-height:1.5;margin:0;border-top:1px solid rgba(255,255,255,.08);padding-top:14px">
    ${brand.affiliationNotice}
  </p>
</div>`;

    const welcomeText = `Welcome to ${brand.name}, ${user.firstName}!

Built for and by ${brand.unionName} supervisors — and you're now part of it.

Open the app: ${appUrl}

THE POINT

Coordinating swaps over group texts and bulletin boards is a mess. ${brand.name} puts every available swap in one place where you can find it, message another supervisor directly, and lock the agreement in. Works for daily work swaps, RDOs, and vacation weeks.

TWO THINGS TO KEEP IN MIND

${brand.name} coordinates swaps but doesn't approve them — every swap still has to go through MTA / MaBSTOA / MTA Bus official approval procedures the normal way. The union does not approve or process shift swaps either. We just help you find the swap faster.

GETTING STARTED

1. Pick your depot. This is your home base — you'll see swaps from your depot first.
2. Post a swap or browse. Need a Saturday off? Post it. Looking to pick up a Tuesday shift? Browse.
3. Message, agree, print. Talk it out in-app, confirm with the other supervisor, print the agreement, follow your depot's normal approval steps.

ALMOST DONE

Once your division admin approves your registration, you'll have full access.

STUCK ON SOMETHING?

Email ${brand.contactEmail} — real human, real fast response.

Stay safe.

— ${brand.unionName}

${brand.affiliationNotice}`;

    try {
      await sendEmail(user.email, `You're in — welcome to ${brand.name}`, welcomeHtml, welcomeText);
    } catch (e) {
      Sentry.captureException(e, {
        tags: { source: "verify-email-welcome" },
        extra: { userId: user.id, email: user.email },
      });
      // Non-fatal — verification already succeeded; user can still sign in.
    }

    return ok({ verified: true });
  } catch {
    return err("Verification failed — please try again", 503);
  }
}
