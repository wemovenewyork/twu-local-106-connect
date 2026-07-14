# H2 · Production Reconcile Runsheet

**Executed by hand by Q. Claude Code never runs any command in this file.**

**Goal:** tell production "the baseline migration `00000000000000_init_local106`
is already applied" — *without executing it*. Prod already has every table; the
baseline is a description of what is already there. Nothing in this runsheet
changes a single row or column of data.

> ## ⛔ MERGE ORDER
> **This runsheet executes BEFORE the PR merges. Never after.**
>
> If the deploy pipeline lands first, the very next Vercel build runs
> `prisma migrate deploy` against a database that already has every table. The
> baseline will fail loudly at `CREATE TABLE` — or worse, half-apply the tsvector
> `ALTER` before dying. Reconcile first, merge second.

---

# 🔴 PRE-FLIGHT GATE — run immediately before Phase 4. If it fails, STOP.

The Gate 2 proof was taken against a dev branch snapshotted **at that moment**.
If production's schema has drifted since, the baseline no longer describes it —
and `migrate resolve --applied` would mark a **non-matching** baseline as applied,
permanently corrupting migration history in a way that is painful to unwind.

This gate must pass **on the day you reconcile**, not on the day it was written.

### Step 0.1 — Create a FRESH dev branch off current production

In the Neon console, branch off **production, right now**. Do **not** reuse the
earlier `h2-dev` branch — it is a stale snapshot and proves nothing about
production's current state. Name it e.g. `h2-preflight-<today>`.

Call its connection string `$FRESH_URL`.

### Step 0.2 — Build a database FROM the baseline

Create a second, empty Neon branch (e.g. `h2-preflight-baseline`) and apply only
the baseline to it. Call its connection string `$BASELINE_URL`.

```bash
# Reset it to empty first if it was branched from prod (it is disposable):
psql "$BASELINE_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

# Apply ONLY the baseline. Expect: "1 migration found" → applies exactly one.
DATABASE_URL="$BASELINE_URL" npx prisma migrate deploy
```

### Step 0.3 — Compare the catalogs. MUST be identical.

```bash
A_URL="$FRESH_URL" B_URL="$BASELINE_URL" npx tsx scripts/h2-catalog-compare.ts
```

Expected output (exit code 0):

```
### columns: A=244 B=244 IDENTICAL
### indexes: A=67 B=67 IDENTICAL
### constraints: A=70 B=70 IDENTICAL
### enums: A=14 B=14 IDENTICAL

============================================================
RESULT: IDENTICAL — safe to proceed
============================================================
```

> **Do not use `prisma migrate diff` for this check.** It is blind to anything
> Prisma's DSL cannot express, and it missed **both** raw-SQL artifacts during
> H2 (the `search_vector` generated column and the partial unique index). The
> catalog comparison is the only trustworthy check.

### 🔴 GATE

- **IDENTICAL (exit 0)** → proceed to Phase 4.
- **ANY difference (exit 1)** → **STOP.** Production has drifted since the Gate 2
  snapshot. Do **not** run `DELETE FROM _prisma_migrations`. Do **not** run
  `migrate resolve --applied`. Report the diff — the baseline needs the missing
  artifact appended (same fix as the partial unique index), then re-verify.

---

# Phase 4 — Production reconcile

## Step 1 — Record the PITR restore point

Before touching anything, write down the exact restore point:

```bash
# Record this timestamp — it is your rollback anchor.
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

Then, in the **Neon console** → project → **Branches** → `main` → confirm:

- **PITR retention window covers today.** (Neon free tier is limited; verify the
  window actually includes the timestamp above.)
- Note the current branch **LSN / restore point** shown in the console.

Record here before proceeding:

```
PITR timestamp (UTC):  ____________________________
Neon restore point:    ____________________________
Operator:              ____________________________
```

## Step 2 — Clear the stale migration history

Production's `_prisma_migrations` holds **10 depot-era rows** (verified in Phase 1):
`20260401214939_init` … `20260416_message_text_varchar`. Those migration
directories no longer exist in the repo — they were archived to
`docs/migrations-wmny-archive/`. `migrate deploy` errors on applied migrations it
cannot find, so the rows must go.

```bash
psql "$PROD_URL" -c 'DELETE FROM _prisma_migrations;'
```

Expected: `DELETE 10`

> This table is Prisma's own bookkeeping. It contains **no application data**.
> Deleting it destroys nothing but the record of which migrations ran.

## Step 3 — Mark the baseline as already applied

This **executes no SQL against your schema**. It inserts one bookkeeping row
saying "this migration is done."

```bash
DATABASE_URL="$PROD_URL" npx prisma migrate resolve --applied 00000000000000_init_local106
```

Expected: `Migration 00000000000000_init_local106 marked as applied.`

## Step 4 — Verify

```bash
DATABASE_URL="$PROD_URL" npx prisma migrate deploy
# Expected: "No pending migrations to apply."

DATABASE_URL="$PROD_URL" npx prisma migrate status
# Expected: "Database schema is up to date!"
```

If `migrate deploy` tries to **apply** anything, something is wrong — stop and
restore (below).

## Step 5 — Only now, merge the PR

The Vercel build runs `prisma migrate deploy` (added in Phase 5). With the
baseline resolved, it is a no-op. Watch the first production build succeed.

---

# Rollback — if Step 2/3/4 goes wrong

Nothing in this runsheet mutates application data, so the blast radius is limited
to Prisma's bookkeeping table. In order of preference:

### Option A — Re-resolve (almost always sufficient)

If `_prisma_migrations` ends up in a bad state, it can simply be rebuilt:

```bash
psql "$PROD_URL" -c 'DELETE FROM _prisma_migrations;'
DATABASE_URL="$PROD_URL" npx prisma migrate resolve --applied 00000000000000_init_local106
DATABASE_URL="$PROD_URL" npx prisma migrate status   # expect: up to date
```

Because the table holds no application data, this is safe to repeat.

### Option B — Neon PITR restore (only if schema/data was actually harmed)

Only needed if a command somehow altered the schema — e.g. a `migrate deploy` was
allowed to half-apply the baseline against a populated database.

1. Neon console → project → **Restore**.
2. Restore branch `main` to the **PITR timestamp recorded in Step 1**.
3. Neon creates the restore as a new branch; promote it, or repoint
   `DATABASE_URL` in Vercel at it, then redeploy.
4. Re-run the **PRE-FLIGHT GATE** from the top before attempting the reconcile again.

### Option C — Roll back the deploy

If the PR was merged before the reconcile (the failure mode this runsheet exists
to prevent): Vercel dashboard → Deployments → last known-good → **Promote to
Production**. Then run the reconcile, then re-deploy.

---

# Reference — what is being reconciled

- **Baseline:** `prisma/migrations/00000000000000_init_local106/migration.sql`
  (696 generated lines + 2 hand-appended raw-SQL artifacts).
- **Artifact 1 — tsvector.** STORED GENERATED column, verified via
  `pg_attribute.attgenerated = 's'`:
  ```sql
  ALTER TABLE "document_chunks" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  ```
- **Artifact 2 — partial unique index.** Invisible to `prisma migrate diff`;
  enforces the duplicate-agreement race guard (`P2002` in
  `app/api/swaps/[id]/agreement/route.ts`):
  ```sql
  CREATE UNIQUE INDEX "swap_agreements_swap_id_active_key"
    ON "swap_agreements" ("swap_id")
    WHERE status IN ('pending', 'userA_confirmed');
  ```
- **No GIN index** — production has none; the baseline reproduces production
  exactly. Adding one is a separate performance work order.
- **Old migrations:** archived to `docs/migrations-wmny-archive/` (not deleted).
