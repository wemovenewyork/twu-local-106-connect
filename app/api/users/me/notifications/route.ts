import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

const PREF_FIELDS = [
  "contractEnabled",
  "safetyEnabled",
  "rallyEnabled",
  "newsEnabled",
  "benefitEnabled",
  "swapMatchEnabled",
  "systemAlertEnabled",
  "pushEnabled",
] as const;

type PrefField = typeof PREF_FIELDS[number];

async function getOrCreatePrefs(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPreference.create({ data: { userId } });
}

// GET /api/users/me/notifications
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }
  const prefs = await getOrCreatePrefs(token.userId);
  return ok({ preferences: prefs });
}

// PATCH /api/users/me/notifications
// Body: any subset of the boolean fields
export async function PATCH(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  const data: Record<string, boolean> = {};
  for (const f of PREF_FIELDS) {
    if (typeof body[f] === "boolean") data[f as PrefField] = body[f] as boolean;
  }
  if (Object.keys(data).length === 0) return err("Nothing to update", 400);

  // Ensure row exists
  await getOrCreatePrefs(token.userId);

  const prefs = await prisma.notificationPreference.update({
    where: { userId: token.userId },
    data,
  });
  return ok({ preferences: prefs });
}

export const runtime = "nodejs";
