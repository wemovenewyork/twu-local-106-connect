import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/pushNotify";
import { ok, err } from "@/lib/apiResponse";

// Runs every morning at 7 AM — sends each subscribed operator a summary of
// new open swaps posted in their division in the last 24 hours.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return err("Unauthorized", 401);

  try {
  const since = new Date(Date.now() - 86_400_000);

  // Group new swaps by divisionId
  const newSwaps = await prisma.swap.findMany({
    where: { status: "open", createdAt: { gte: since } },
    select: { divisionId: true, category: true },
  });

  const countsByDivision = new Map<string, number>();
  for (const s of newSwaps) {
    countsByDivision.set(s.divisionId, (countsByDivision.get(s.divisionId) ?? 0) + 1);
  }

  if (countsByDivision.size === 0) return ok({ sent: 0, message: "No new swaps" });

  // Get all push subscriptions for users in affected divisions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { divisionId: { in: Array.from(countsByDivision.keys()) } } },
    include: { user: { select: { divisionId: true, firstName: true } } },
  });

  let sent = 0;
  const failed: string[] = [];

  for (const sub of subscriptions) {
    const divisionId = sub.user.divisionId;
    if (!divisionId) continue;
    const count = countsByDivision.get(divisionId) ?? 0;
    if (count === 0) continue;

    const success = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        title: "TWU Local 106 Connect — Daily Digest",
        body: `${count} new swap${count === 1 ? "" : "s"} posted at your division today.`,
        url: "/divisions",
      }
    );

    if (success) {
      sent++;
    } else {
      failed.push(sub.id);
    }
  }

  // Clean up dead subscriptions (delivery failed)
  if (failed.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: failed } } });
  }

  return ok({ sent, cleaned: failed.length });
  } catch (e) {
    return err(`Cron failed: ${e instanceof Error ? e.message : "unknown error"}`, 500);
  }
}
