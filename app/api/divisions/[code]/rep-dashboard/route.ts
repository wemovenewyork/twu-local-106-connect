import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// Read-only division overview for division reps and admins.
// Returns swap stats, top operators by reputation, recent agreements.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { code } = await params;

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);
  if (dbUser.role !== "divisionAdmin" && dbUser.role !== "superAdmin") return err("Forbidden", 403);

  const division = await prisma.division.findUnique({ where: { code } });
  if (!division) return err("Division not found", 404);

  if (dbUser.role === "divisionAdmin" && dbUser.divisionId !== division.id) {
    return err("You can only view your own division", 403);
  }

  const [swapCounts, recentAgreements, topOperators, reportCount] = await Promise.all([
    // Swap counts by status
    prisma.swap.groupBy({
      by: ["status", "category"],
      where: { divisionId: division.id },
      _count: true,
    }),

    // Recent completed agreements
    prisma.swapAgreement.findMany({
      where: { swap: { divisionId: division.id }, status: { in: ["completed", "userA_confirmed"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        swap: { select: { id: true, details: true, category: true, posterName: true } },
        userA: { select: { id: true, firstName: true, lastName: true } },
        userB: { select: { id: true, firstName: true, lastName: true } },
      },
    }),

    // Top operators by completed swaps
    prisma.reputation.findMany({
      where: { user: { divisionId: division.id } },
      orderBy: { completed: "desc" },
      take: 10,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    }),

    // Open reports count
    prisma.report.count({
      where: { swap: { divisionId: division.id }, status: "pending" },
    }),
  ]);

  return ok({ division, swapCounts, recentAgreements, topOperators, reportCount });
}
