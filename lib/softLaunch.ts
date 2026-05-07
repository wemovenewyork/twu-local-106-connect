/**
 * Soft launch division allowlist.
 *
 * SOFT_LAUNCH_DEPOT controls which divisions can register and sign in during the
 * limited rollout. The env var supports a single division code ("QV") or a
 * comma-separated list ("QV,WF,MV"). Whitespace around codes is tolerated and
 * codes are uppercased so "qv, wf , mv" works too.
 *
 * If the env var is unset or empty, no restriction applies — all divisions can
 * sign in (full launch state).
 */

/** Returns the parsed allowlist, or null if soft launch is off. */
export function getSoftLaunchDivisions(): string[] | null {
  const raw = process.env.SOFT_LAUNCH_DEPOT?.trim();
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
