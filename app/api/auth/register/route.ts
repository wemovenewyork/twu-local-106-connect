import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { parseBody, BODY_4KB } from "@/lib/parseBody";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/escapeHtml";
import { brand } from "@/config/brand";

export async function POST(req: NextRequest) {
  // Validate env at the top — if this throws after user creation (old position) it
  // returns HTML 500 which the client can't parse, producing "Request failed".
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    Sentry.captureMessage("NEXT_PUBLIC_APP_URL is not set", "error");
    return err("Server configuration error — contact support", 500);
  }

  const ip = clientIp(req);
  if (!await rateLimit(`register:${ip}`, 5, 3_600_000)) {
    Sentry.captureEvent({ message: "Register rate limit hit", level: "warning", tags: { ip } });
    return err("Too many registration attempts — try again in an hour", 429);
  }

  const body = await parseBody(req, BODY_4KB);
  if (body instanceof NextResponse) return body;
  const { firstName, lastName, email, password } = body as {
    firstName: string; lastName: string; email: string; password: string;
  };

  if (!firstName || !lastName || !email || !password) {
    return err("All fields are required", 400);
  }
  if (!email.includes("@")) return err("Invalid email", 400);
  if (firstName.trim().length > 50) return err("First name must be 50 characters or fewer", 400);
  if (lastName.trim().length > 50) return err("Last name must be 50 characters or fewer", 400);
  if (password.length < 12) return err("Password must be at least 12 characters", 400);
  if (password.length > 128) return err("Password must be 128 characters or fewer", 400);

  // Reject passwords that are purely numeric or common patterns
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialOrMixed = /[^a-zA-Z0-9]/.test(password) || (hasLetter && hasNumber);
  if (!hasSpecialOrMixed) return err("Password must contain letters and numbers", 400);

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return err("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString("hex");

  // Layer C2 will wire admin-approval registration: account exists in unverified
  // pending state, division admin reviews, then approves/reassigns/rejects.
  // For now, registration creates a user and sends the verification email; the
  // approval queue and verification → approved gating land in C2.
  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        verified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  } catch (e: unknown) {
    Sentry.captureException(e, { tags: { source: "register-create-user" } });
    return err("Registration failed — please try again", 500);
  }

  // Initialize reputation — upsert is safe if this runs more than once (e.g. after a retry)
  try {
    await prisma.reputation.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "register-reputation" }, extra: { userId: user.id } });
  }

  // Send verification email — HTML-escape user-supplied name fields
  const verifyLink = `${appUrl}/verify-email/${verifyToken}`;
  const safeFirstName = escapeHtml(user.firstName);
  try {
    await sendEmail(
      user.email,
      `Verify your ${brand.name} email`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:${brand.colors.navy};color:#fff;border-radius:16px">
        <h1 style="font-size:22px;font-weight:800;margin-bottom:8px">Verify your email</h1>
        <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:24px">
          Hi ${safeFirstName}, thanks for joining ${brand.name}! Please verify your email address. After verification, your division admin will review your registration to confirm your TSO membership.
          This link expires in 24 hours.
        </p>
        <a href="${verifyLink}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:${brand.colors.red};color:#fff;font-weight:700;font-size:15px;text-decoration:none">
          Verify Email
        </a>
        <p style="color:rgba(255,255,255,.4);font-size:12px;margin-top:24px">
          If you didn't create a ${brand.name} account, you can safely ignore this email.
        </p>
      </div>`
    );
  } catch (e) {
    Sentry.captureException(e, {
      tags: { source: "register-verify-email" },
      extra: { userId: user.id, email: user.email },
    });
    // Non-fatal: user is created, they can use "Resend verification email" if needed
  }

  // No auto-login on register — user must verify email and then await admin approval.
  const res = NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      divisionId: user.divisionId,
      role: user.role,
      language: user.language,
    },
    emailVerificationRequired: true,
  }, { status: 201 });

  return res;
}
