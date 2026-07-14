# TWU Local 106 Connect — Operations Runbook

## Quick Reference

| Service | Dashboard |
|---|---|
| Vercel (hosting) | vercel.com → wemovenewyork team |
| Neon (database) | console.neon.tech |
| Upstash (Redis) | console.upstash.com |
| Resend (email) | resend.com/emails |
| Sentry (errors) | sentry.io |

Contact: wemovenewyork.net@gmail.com

---

## Local Setup

Fresh checkouts require generating the Prisma client before TypeScript or builds will work:

    npm install
    npx prisma generate

The `postinstall` script attempts this automatically, but can silently fail in some
environments (notably some IDE-managed terminals and devcontainer first-runs). If
`npx tsc --noEmit` reports `TS2305: has no exported member 'PrismaClient'`, run
`npx prisma generate` manually.

CI (.github/workflows/ci.yml) runs `npx prisma generate` explicitly before build,
so deployments are unaffected.

---

## Rollback a Bad Deploy

### Option A — Instant rollback via Vercel dashboard (preferred)
1. Vercel dashboard → Project → Deployments tab
2. Find the last known-good deployment
3. Click the `…` menu → **Promote to Production**
4. Production traffic shifts in ~30 seconds. No code change, no git history affected.

### Option B — Git revert
```bash
git log --oneline -10          # find the bad commit hash
git revert <bad-commit-hash>   # creates a revert commit
git push origin main           # triggers new Vercel deploy
```

### Option C — Hard reset (last resort — destroys history)
```bash
git reset --hard <good-commit-hash>
git push --force-with-lease origin main
```
Only use Option C if the bad commit contains secrets that must be scrubbed from history.

---

## Migrations

**How deploys apply them.** The `vercel-build` script is
`prisma migrate deploy && next build`. Every production deploy applies any pending
migration *before* the app builds. A failed migration fails the build, so a broken
migration never reaches users.

**The baseline.** `prisma/migrations/` holds a single squashed baseline,
`00000000000000_init_local106`, which reproduces production exactly. The
depot-era WMNY migrations were archived to `docs/migrations-wmny-archive/`
(kept for the audit trail, never applied again). Background: `docs/H2-DISCOVERY.md`.

**Two artifacts Prisma cannot express** live as raw SQL at the end of the
baseline's `migration.sql`, and must survive any future squash:

1. `document_chunks.search_vector` — a **STORED GENERATED** tsvector column
   (`GENERATED ALWAYS AS (to_tsvector('english', content)) STORED`). Powers
   contract search.
2. `swap_agreements_swap_id_active_key` — a **partial** unique index
   (`WHERE status IN ('pending','userA_confirmed')`). Enforces the
   duplicate-agreement race guard that `app/api/swaps/[id]/agreement/route.ts`
   depends on via its `P2002` catch.

> ⚠️ **`prisma migrate diff` cannot see either of them.** It is blind to anything
> outside Prisma's DSL. If you ever squash migrations again, diff the
> **pg_catalog** instead: `scripts/h2-catalog-compare.ts` (columns, indexes,
> constraints, enums). Trusting the differ silently drops both artifacts — and
> dropping #2 reintroduces a data-integrity race.

### Check migration state

```bash
DATABASE_URL="<direct-url>" npx prisma migrate status
# healthy: "Database schema is up to date!"
```

### Adding a schema change

```bash
npx prisma migrate dev --name descriptive_name   # local; creates the migration
git add prisma/migrations/ prisma/schema.prisma
```

Never use `db push` against a shared or production database — it mutates the
schema without leaving a migration behind. That is how this repo's history
drifted out of sync with production in the first place.

### PITR first — before anything destructive

Before any migration that drops or alters a column, **record a Neon restore
point** (Neon console → project → Branches → note the timestamp/LSN) and confirm
the PITR window covers today. Restoring is the only real undo; the section below
is a manual, best-effort path.

---

## Database Rollback

Migrations are **not automatically reversible**.

Preferred: **Neon PITR restore** to the timestamp recorded above (console →
Restore). This is the only reliable undo for a destructive migration.

### Manual reverse migration (best-effort):
1. Write a reverse migration SQL manually (e.g. `DROP TABLE blocks;` to undo `20260416_block_enforcement`)
2. Save it as `prisma/migrations/YYYYMMDD_rollback_<name>/migration.sql`
3. Apply with:
```bash
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```
4. Update `prisma/schema.prisma` to match

**Never run `prisma migrate reset` in production** — it drops all data.

---

## Environment Variable Rotation

### Rotate JWT secrets (forces all users to re-login):
1. Vercel → Project → Settings → Environment Variables
2. Update `JWT_SECRET` and/or `JWT_REFRESH_SECRET` with a new random value:
   ```bash
   openssl rand -base64 48
   ```
3. Redeploy (new deployments pick up the new value; existing sessions expire within 15 min for access tokens, 7 days for refresh tokens)

### Rotate Neon DB password:
1. Neon console → Project → Roles → Reset password for `neondb_owner`
2. Update `DATABASE_URL` in Vercel env vars with the new password
3. Redeploy

### Rotate Upstash Redis credentials:
1. Upstash console → Database → Reset token
2. Update `UPSTASH_REDIS_REST_TOKEN` and `UPSTASH_REDIS_REST_URL` in Vercel
3. Redeploy

---

## Maintenance Mode

Set `MAINTENANCE_MODE=true` in Vercel environment variables, then redeploy.
All traffic is redirected to `/maintenance` except `/api/health` and static assets.

To disable: remove or set to `false`, redeploy.

---

## Soft launch

`SOFT_LAUNCH_DIVISIONS` (legacy alias: `SOFT_LAUNCH_DEPOT`) is a comma-separated
list of division codes permitted during a limited rollout (e.g. `QV,WF,MV`).
Empty or unset = all divisions (full launch). Set it in Vercel env, then redeploy.

**Enforcement is not uniform — it touches three surfaces:**

1. **Login — hard gate.** A member of a division *not* on the allowlist is blocked
   at sign-in with a `403` ("limited soft launch… we'll be at your division soon").
   `superAdmin` and `localAdmin` are exempt so support can always get in.
2. **Division picker — filtered.** `GET /api/divisions` (which the signup form
   consumes) only returns allowlisted divisions, so non-listed divisions are not
   selectable in the UI.
3. **Register endpoint — NOT gated.** `POST /api/auth/register` accepts any valid
   division code. Registration is restricted at the UI layer only: someone who
   bypasses the picker (crafting the request directly) can create an account —
   but they still land in the approval queue and are blocked at login by (1). This
   gap is tracked as audit finding **M7**; the recommended fix is to have the
   register endpoint call `isDivisionInSoftLaunch()` on the submitted code.

To go to full launch: clear `SOFT_LAUNCH_DIVISIONS` (and remove the legacy
`SOFT_LAUNCH_DEPOT` if still set), then redeploy.

---

## Emergency User Actions

All admin actions require an account with `role = "admin"` or `"subAdmin"`.

### Suspend a user immediately:
Admin dashboard → Users → find user → set `suspendedUntil` to a future date.
Or directly via Neon SQL console:
```sql
UPDATE users SET suspended_until = NOW() + INTERVAL '30 days' WHERE email = 'user@example.com';
```

### Delete/anonymize a user:
Admin dashboard → Users → Delete. This anonymizes (does not hard-delete) the account.

### Revoke an invite code:
Admin dashboard → Invite Codes → Revoke.

---

## Monitoring

- **Errors**: Sentry dashboard — set up alerts for new issues and spike detection
- **Uptime**: `/api/health` returns `{"status":"ok"}` when DB is reachable; use an external uptime monitor (e.g. Better Uptime, UptimeRobot) to ping this endpoint every minute
- **Redis failures**: Watch Vercel function logs for `[rateLimit] Redis error` — rate limiting is failing open when this appears
- **Email deliverability**: Resend dashboard → Emails tab — check bounce/complaint rates

---

## Cron Jobs

Cron schedules are in `vercel.json`. All require the `CRON_SECRET` env var as a Bearer token.

| Job | Schedule | Purpose |
|---|---|---|
| `/api/cron/expire-swaps` | Daily | Mark past-date swaps as expired |
| `/api/cron/expiring-soon` | Daily | Notify members of swaps expiring tomorrow (NYC time) |
| `/api/cron/cleanup-swaps` | Weekly | Delete swaps expired >7 days ago |
| `/api/cron/expire-announcements` | Daily | Delete expired depot announcements |
| `/api/cron/daily-digest` | Daily morning | Send new-swaps digest to subscribers |

To manually trigger a cron during an incident:
```bash
curl -X GET https://<your-domain>/api/cron/expire-swaps \
  -H "Authorization: Bearer <CRON_SECRET>"
```
