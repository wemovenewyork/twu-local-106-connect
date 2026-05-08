import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// GET /api/dashboard/summary
// Returns counts and registration status used by the dashboard's
// attention strip and quick action badges. One round-trip instead of
// a fan-out from each component.
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const me = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, divisionId: true },
  });
  if (!me) return err("Unauthorized", 401);

  const [registration, unreadNotifications, pendingAgreements, activeSwaps] = await Promise.all([
    prisma.registrationApproval.findUnique({
      where: { userId: me.id },
      select: { status: true },
    }),
    prisma.notification.count({
      where: { userId: me.id, read: false },
    }),
    prisma.swapAgreement.count({
      where: {
        OR: [{ userAId: me.id }, { userBId: me.id }],
        status: { in: ["pending", "userA_confirmed"] },
      },
    }),
    prisma.swap.count({
      where: { userId: me.id, status: "open" },
    }),
  ]);

  // OT requests count: model may not yet exist — guard for older builds.
  let pendingOvertime = 0;
  try {
    const otModel = (prisma as unknown as { overtimeRequest?: { count: (a: unknown) => Promise<number> } }).overtimeRequest;
    if (otModel) {
      pendingOvertime = await otModel.count({
        where: { submitterId: me.id, status: "submitted" },
      });
    }
  } catch { /* model not present yet — fine */ }

  return ok({
    registrationStatus: registration?.status ?? null,
    unreadNotifications,
    pendingAgreements,
    activeSwaps,
    pendingOvertime,
  });
}

export const runtime = "nodejs";
