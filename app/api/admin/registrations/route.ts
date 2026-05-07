import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { isAdmin, getManageableDivisions } from "@/lib/permissions";

// GET /api/admin/registrations?status=pending
// Lists registration approvals scoped to the caller's manageable divisions.
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const admin = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, role: true, divisionId: true },
  });
  if (!admin || !isAdmin(admin)) return err("Forbidden", 403);

  const status = (req.nextUrl.searchParams.get("status") ?? "pending") as
    | "pending" | "approved" | "reassigned" | "rejected";
  if (!["pending", "approved", "reassigned", "rejected"].includes(status)) {
    return err("Invalid status", 400);
  }

  const manageable = getManageableDivisions(admin);
  if (manageable !== "all" && manageable.length === 0) {
    return ok({ registrations: [] });
  }

  const registrations = await prisma.registrationApproval.findMany({
    where: {
      status,
      ...(manageable === "all" ? {} : { declaredDivisionId: { in: manageable } }),
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } },
      declaredDivision: { select: { id: true, code: true, name: true } },
      declaredSubUnit: { select: { id: true, code: true, name: true } },
      assignedDivision: { select: { id: true, code: true, name: true } },
      assignedSubUnit: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok({ registrations });
}
