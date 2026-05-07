import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
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

  const me = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, divisionId: true },
  });
  if (!me) return err("Unauthorized", 401);

  const news = await prisma.news.findMany({
    where: {
      status: "published",
      OR: [
        { divisionId: null },
        ...(me.divisionId ? [{ divisionId: me.divisionId }] : []),
      ],
    },
    include: NEWS_LIST_INCLUDE,
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  return ok({ news });
}

export const runtime = "nodejs";
