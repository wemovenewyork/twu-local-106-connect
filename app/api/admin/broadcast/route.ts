import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser, notifyMany } from "@/lib/notifyUser";
import { parseBody, BODY_4KB } from "@/lib/parseBody";

// POST /api/admin/broadcast
// body: { target: "all" | "user" | "division", userId?: string, divisionCode?: string, text: string }
export async function POST(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const admin = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!admin || !["superAdmin", "localAdmin"].includes(admin.role)) return err("Forbidden", 403);

  // Cap broadcasts per admin. Even with role gating, an attacker who phishes
  // an admin account could otherwise blast push notifications to every member
  // in a tight loop. 10/hour is well above any realistic legitimate cadence.
  if (!await rateLimit(`broadcast:${token.userId}`, 10, 3_600_000)) {
    return err("Too many broadcasts — try again later", 429);
  }

  const isLocalAdmin = admin.role === "localAdmin";

  const body = await parseBody(req, BODY_4KB);
  if (body instanceof NextResponse) return body;
  const { target, userId, divisionCode, text } = body as { target: string; userId?: string; divisionCode?: string; text: string };

  if (!text?.trim()) return err("Message text required", 400);
  if (text.trim().length > 1000) return err("Max 1000 characters", 400);
  if (!["all", "user", "division"].includes(target)) return err("Invalid target", 400);
  if (isLocalAdmin && target === "all") return err("Local Admins cannot broadcast to all users", 403);

  const trimmed = text.trim();

  if (target === "user") {
    if (!userId) return err("userId required for user target", 400);
    const recipient = await prisma.user.findUnique({ where: { id: userId } });
    if (!recipient) return err("User not found", 404);
    if (userId === token.userId) return err("Cannot message yourself", 400);

    await prisma.message.create({
      data: { fromUserId: token.userId, toUserId: userId, text: trimmed, swapId: null },
    });
    await notifyUser(userId, {
      title: "Message from Admin",
      body: trimmed.substring(0, 80),
      url: "/inbox",
    });
    return ok({ sent: 1 });
  }

  if (target === "division") {
    if (!divisionCode) return err("divisionCode required for division target", 400);
    const division = await prisma.division.findUnique({ where: { code: divisionCode } });
    if (!division) return err("Division not found", 404);

    const recipients = await prisma.user.findMany({
      where: { divisionId: division.id, id: { not: token.userId } },
      select: { id: true },
    });
    if (!recipients.length) return ok({ sent: 0 });

    const recipientIds = recipients.map(r => r.id);
    await prisma.message.createMany({
      data: recipientIds.map(toUserId => ({
        fromUserId: token.userId, toUserId, text: trimmed, swapId: null,
      })),
    });
    await notifyMany(recipientIds, {
      title: "Message from Admin",
      body: trimmed.substring(0, 80),
      url: "/inbox",
    });
    return ok({ sent: recipientIds.length });
  }

  // target === "all"
  const allUsers = await prisma.user.findMany({
    where: { id: { not: token.userId } },
    select: { id: true },
  });
  if (!allUsers.length) return ok({ sent: 0 });

  const allIds = allUsers.map(u => u.id);
  await prisma.message.createMany({
    data: allIds.map(toUserId => ({
      fromUserId: token.userId, toUserId, text: trimmed, swapId: null,
    })),
  });
  await notifyMany(allIds, {
    title: "Message from Admin",
    body: trimmed.substring(0, 80),
    url: "/inbox",
  });
  return ok({ sent: allIds.length });
}
