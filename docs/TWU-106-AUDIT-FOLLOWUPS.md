# TWU Local 106 Connect — Audit Follow-Ups

Findings discovered *after* the TWU-106 pre-launch audit (2026-07-06) while
executing its work orders. The source audit document lives outside the repo;
this file tracks additional findings raised during the fix/polish sessions.

---

## M7 · Soft-launch registration restriction is UI-only

**Severity:** MEDIUM · **Status:** open · **Not a launch blocker.**

**Where:** `lib/softLaunch.ts`, `app/api/auth/register/route.ts`,
`app/api/divisions/route.ts`, `app/api/auth/login/route.ts`.

**What:** The `SOFT_LAUNCH_DIVISIONS` allowlist (legacy alias
`SOFT_LAUNCH_DEPOT`) is enforced unevenly across three surfaces:

1. **Login** (`app/api/auth/login/route.ts`) — HARD gate: a member of a
   non-allowlisted division is blocked at sign-in with a `403`
   (`superAdmin`/`localAdmin` exempt).
2. **Division picker** (`getSoftLaunchDivisions` in `GET /api/divisions`, used by
   the signup form) — the returned division list is filtered to the allowlist,
   so non-listed divisions are not selectable in the UI.
3. **Register endpoint** (`POST /api/auth/register`) — **NOT gated.** It looks up
   the division by code and accepts any valid one. The registration restriction
   is therefore UI-layer only.

**Impact:** A user who bypasses the filtered picker (crafting the
`POST /api/auth/register` request directly with a non-allowlisted `divisionCode`)
can create an account during a soft launch. This is low-risk: the account still
lands in the admin approval queue and is blocked at login by surface (1), so no
unauthorized access is granted — it's an enforcement-boundary inconsistency, not
an access-control breach.

**Recommendation:** Have the register endpoint call
`isDivisionInSoftLaunch(division.code)` on the submitted division before creating
the user, returning the same soft-launch message as login. Deferred — this is an
API behavior change and was intentionally kept out of the `polish/ship-ready`
branch (docs/polish only).
