import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { parseBody, BODY_4KB } from "@/lib/parseBody";
import { sendEmail } from "@/lib/email";
import { brand } from "@/config/brand";

interface ContactPayload {
  officerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  honeypot?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  if (!(await rateLimit(`contact:${ip}`, 5, 3_600_000))) {
    return err("Too many contact submissions — try again later", 429);
  }

  const body = await parseBody<ContactPayload>(req, BODY_4KB);
  if (body instanceof NextResponse) return body;

  const { officerId, name, email, phone, message, honeypot } = body;

  if (honeypot) return ok({ received: true });

  if (!name?.trim()) return err("Name required", 400);
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Valid email required", 400);
  if (!message?.trim()) return err("Message required", 400);
  if (message.length > 3000) return err("Message too long", 400);

  let toAddress: string;
  let toName: string;
  if (officerId) {
    const officer = await prisma.officer.findUnique({ where: { id: officerId } });
    if (!officer) return err("Officer not found", 404);
    if (!officer.contactFormEnabled) return err("Contact form is not enabled for this officer", 403);
    if (!officer.contactEmail) return err("Officer does not have a contact email on file", 400);
    toAddress = officer.contactEmail;
    toName = officer.name;
  } else {
    toAddress = brand.contactEmail;
    toName = brand.unionName;
  }

  const subject = `[${brand.unionName}] Member contact — ${name.trim()}`;
  const html = `
    <p>A member submitted the contact form on ${escapeHtml(brand.unionName)}.</p>
    <ul>
      <li><strong>To:</strong> ${escapeHtml(toName)}</li>
      <li><strong>From:</strong> ${escapeHtml(name.trim())} &lt;${escapeHtml(email.trim())}&gt;</li>
      ${phone?.trim() ? `<li><strong>Phone:</strong> ${escapeHtml(phone.trim())}</li>` : ""}
    </ul>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message.trim()).replace(/\n/g, "<br>")}</p>
    <hr>
    <p style="color:#888;font-size:12px">Sent from ${brand.primaryUrl}/contact (IP ${escapeHtml(ip)}).</p>
  `;

  try {
    if (process.env.RESEND_API_KEY) {
      await sendEmail(toAddress, subject, html);
    } else {
      // Pre-launch fallback: capture the submission via Sentry so it's not
      // dropped on the floor while RESEND_API_KEY is unset. Replace with a
      // proper ContactSubmission model + Resend wiring before launch.
      Sentry.captureMessage("Contact form submission (Resend not configured)", {
        level: "info",
        tags: { source: "contact-form" },
        extra: {
          to: toAddress,
          from: { name: name.trim(), email: email.trim(), phone: phone?.trim() ?? null },
          message: message.trim().slice(0, 2000),
          officerId: officerId ?? null,
          ip,
        },
      });
    }
  } catch (e) {
    Sentry.captureException(e, {
      tags: { source: "contact-form" },
      extra: { officerId, ip },
    });
    return err("Could not send your message — try again", 500);
  }

  return ok({ received: true });
}
