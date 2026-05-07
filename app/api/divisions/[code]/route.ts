import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try { requireUser(req); } catch { return err("Unauthorized", 401); }
  try {
    const { code } = await params;
    const division = await prisma.division.findUnique({ where: { code: code.toUpperCase() } });
    if (!division) return err("Division not found", 404);
    return ok(division);
  } catch {
    return err("Unable to load division — please try again", 503);
  }
}
