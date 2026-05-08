import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isLocalOrSuperAdmin } from "@/lib/permissions";

// GET /api/admin/overtime-requests
// Lists all OT requests for localAdmin / superAdmin.
// Query params: status, from, to, q (name or payroll number search)
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const caller = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!caller) return err("Unauthorized", 401);
  if (!isLocalOrSuperAdmin(caller)) return err("Forbidden", 403);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (status && ["submitted", "withdrawn", "acknowledged"].includes(status)) {
    where.status = status;
  }
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) {
      const d = new Date(from + "T00:00:00.000Z");
      if (!Number.isNaN(d.getTime())) range.gte = d;
    }
    if (to) {
      const d = new Date(to + "T23:59:59.999Z");
      if (!Number.isNaN(d.getTime())) range.lte = d;
    }
    if (Object.keys(range).length) where.requestedDate = range;
  }
  if (q) {
    where.OR = [
      { payrollNumber: { contains: q, mode: "insensitive" } },
      { submitter: { firstName: { contains: q, mode: "insensitive" } } },
      { submitter: { lastName: { contains: q, mode: "insensitive" } } },
      { submitter: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const requests = await prisma.overtimeRequest.findMany({
    where,
    include: {
      submitter: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          division: { select: { id: true, code: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return ok({ requests });
}

export const runtime = "nodejs";
