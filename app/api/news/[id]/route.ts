import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// GET /api/news/[id]
// Returns a published news article if it's visible to the caller.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const me = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, divisionId: true },
  });
  if (!me) return err("Unauthorized", 401);

  const { id } = await params;
  const news = await prisma.news.findUnique({
    where: { id },
    include: {
      division: { select: { id: true, code: true, name: true } },
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!news || news.status !== "published") return err("News not found", 404);

  // Visibility: all-divisions news is visible to anyone; division-scoped
  // news is only visible to members of that division.
  const visible = news.divisionId === null || news.divisionId === me.divisionId;
  if (!visible) return err("News not found", 404);

  return ok({ news });
}

export const runtime = "nodejs";
