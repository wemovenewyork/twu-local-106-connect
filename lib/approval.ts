import { prisma } from "@/lib/prisma";

/**
 * Roles that bypass the RegistrationApproval check. Editors and admins are
 * provisioned directly and may not have an approval record.
 */
const APPROVAL_BYPASS_ROLES = ["editor", "divisionAdmin", "localAdmin", "superAdmin"];

export type ApprovedMember = {
  id: string;
  role: string;
  divisionId: string | null;
  subUnitId: string | null;
  email: string;
  suspendedUntil: Date | null;
};

type GateResult =
  | { user: ApprovedMember; error?: never; status?: never }
  | { user?: never; error: string; status: number };

/**
 * Single server-side gate for member feature routes. Verifies, in order:
 *   1. the user row exists (rejects stale tokens)
 *   2. the account is not deleted or suspended (folds in lib/auth checkActive)
 *   3. the registration is admin-approved (admin tiers bypass)
 *
 * Returns { user } on success — includes divisionId/subUnitId/role so callers
 * can do division-containment checks without a second query.
 *
 * RegistrationGuard on the client is a UX convenience only; THIS is the
 * enforcement layer (audit findings B1 + M1 + M2).
 */
export async function requireApprovedMember(userId: string): Promise<GateResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      divisionId: true,
      subUnitId: true,
      email: true,
      suspendedUntil: true,
    },
  });
  if (!user) return { error: "Unauthorized", status: 401 };
  if (user.email.endsWith("@deleted.invalid")) return { error: "Account not found", status: 401 };
  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    const mins = Math.ceil((user.suspendedUntil.getTime() - Date.now()) / 60_000);
    return {
      error: `Account suspended. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
      status: 403,
    };
  }
  if (APPROVAL_BYPASS_ROLES.includes(user.role)) return { user };

  const approval = await prisma.registrationApproval.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });
  if (!approval || approval.status !== "approved") {
    return {
      error: "Your registration must be approved by your division admin first",
      status: 403,
    };
  }
  return { user };
}
