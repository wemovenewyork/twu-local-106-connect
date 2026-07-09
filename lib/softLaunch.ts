/**
 * Soft launch division allowlist.
 *
 * SOFT_LAUNCH_DIVISIONS (legacy alias: SOFT_LAUNCH_DEPOT) names the divisions
 * permitted during the limited rollout. The env var supports a single division
 * code ("QV") or a comma-separated list ("QV,WF,MV"). Whitespace around codes is
 * tolerated and codes are uppercased so "qv, wf , mv" works too.
 *
 * If the env var is unset or empty, no restriction applies (full launch state).
 *
 * The allowlist touches THREE surfaces, and enforcement is NOT uniform:
 *   1. Login (app/api/auth/login/route.ts): HARD gate — members of a
 *      non-allowlisted division get a 403 at sign-in. superAdmin/localAdmin
 *      are exempt.
 *   2. Division picker (getSoftLaunchDivisions in GET /api/divisions, consumed
 *      by the signup form): the returned division list is filtered to the
 *      allowlist, so non-listed divisions are not selectable in the UI.
 *   3. Register endpoint (POST /api/auth/register): NOT gated — it accepts any
 *      valid division code. Registration is restricted at the UI layer only; a
 *      user who bypasses the picker can create an account but still lands in the
 *      approval queue and is blocked at login by (1). See audit finding M7.
 */

/** Returns the parsed allowlist, or null if soft launch is off. */
export function getSoftLaunchDivisions(): string[] | null {
  // SOFT_LAUNCH_DIVISIONS is the current name; fall back to the legacy
  // SOFT_LAUNCH_DEPOT so the old Vercel var keeps working until it's renamed.
  const raw = (process.env.SOFT_LAUNCH_DIVISIONS ?? process.env.SOFT_LAUNCH_DEPOT)?.trim();
  if (!raw) return null;
  const codes = raw
    .split(",")
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);
  return codes.length > 0 ? codes : null;
}

/** True if the given division code is allowed to sign in right now. */
export function isDivisionInSoftLaunch(divisionCode: string | null | undefined): boolean {
  const allowlist = getSoftLaunchDivisions();
  if (!allowlist) return true;          // no soft launch → all divisions allowed
  if (!divisionCode) return false;         // user with no division → blocked
  return allowlist.includes(divisionCode.toUpperCase());
}
