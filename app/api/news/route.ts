import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireApprovedMember } from "@/lib/approval";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

const NEWS_LIST_INCLUDE = {
  division: { select: { id: true, code: true, name: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
} as const;

// GET /api/news
// Public-to-members news feed: published posts visible to the caller.
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const gate = await requireApprovedMember(token.userId);
  if (!gate.user) return err(gate.error, gate.status);

  const news = await prisma.news.findMany({
    where: {
      status: "published",
      OR: [
        { divisionId: null },
        ...(gate.user.divisionId ? [{ divisionId: gate.user.divisionId }] : []),
      ],
    },
    include: NEWS_LIST_INCLUDE,
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  return ok({ news });
}

export const runtime = "nodejs";
