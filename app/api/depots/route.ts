import { prisma } from "@/lib/prisma";
import { err } from "@/lib/apiResponse";
import { getSoftLaunchDivisions } from "@/lib/softLaunch";

export async function GET() {
  try {
    const allowlist = getSoftLaunchDivisions();
    const divisions = await prisma.division.findMany({
      where: allowlist ? { code: { in: allowlist } } : undefined,
      orderBy: { name: "asc" },
    });
    const counts = await prisma.swap.groupBy({
      by: ["divisionId"],
      _count: { id: true },
      where: { status: "open" },
    });
    const countMap = Object.fromEntries(counts.map((c) => [c.divisionId, c._count.id]));
    const data = divisions.map((d) => ({ ...d, openSwaps: countMap[d.id] ?? 0 }));

    return Response.json(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache at Vercel's edge CDN for 5 minutes, allow stale for 30s while revalidating
        "Cache-Control": "s-maxage=300, stale-while-revalidate=30",
      },
    });
  } catch {
    return err("Unable to load divisions — please try again", 503);
  }
}
