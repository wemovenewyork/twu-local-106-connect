# H2 · Phase 1 Discovery — Migration Baseline Squash

**Branch:** `fix/migration-baseline` (off `main` @ `606a3b4`)
**Run:** read-only, against `DEV_DATABASE_URL` (Neon dev branch, copy of prod).
The production connection string was never used in this session.

**Outcome: GATE 1 — one UNEXPLAINED drift line. Session stopped pending review.**

---

## 1. tsvector generated column (authoritative, from the database)

Extracted via `pg_get_expr` — not from the schema comment:

```
attname        | generation_expr
---------------+--------------------------------------------
search_vector  | to_tsvector('english'::regconfig, content)
```

`pg_attribute.attgenerated = 's'` → **STORED GENERATED** column, type `tsvector`.

This matches the claim in `prisma/schema.prisma` (~line 477-482), now confirmed
against the live database. Canonical DDL for the baseline:

```sql
ALTER TABLE "document_chunks"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english'::regconfig, content)) STORED;
```

## 2. Every index on `document_chunks` (verbatim)

```
document_chunks_pkey
  CREATE UNIQUE INDEX document_chunks_pkey ON public.document_chunks USING btree (id)

document_chunks_document_id_idx
  CREATE INDEX document_chunks_document_id_idx ON public.document_chunks USING btree (document_id)

document_chunks_document_id_chunk_index_key
  CREATE UNIQUE INDEX document_chunks_document_id_chunk_index_key ON public.document_chunks USING btree (document_id, chunk_index)
```

### ⚠️ There is NO GIN index on `search_vector`

`SELECT count(*) FROM pg_indexes WHERE tablename='document_chunks' AND indexdef ILIKE '%gin%'` → **0**.

The work order assumed one existed ("presumably with a GIN index"). It does not.
All three indexes above are btree, and none covers `search_vector`. Contract
search (`dc.search_vector @@ plainto_tsquery(...)` in `app/api/search/route.ts`)
is therefore running a **sequential scan** over `document_chunks` on every query.
It works — which is why nobody noticed — but it does not scale.

**Consequence for the baseline:** the baseline must reproduce production, and
production has no GIN index. Adding one is a performance *change*, not a
packaging change, and is out of scope for H2. Decision needed (see below).

## 3. `_prisma_migrations` inventory

Table is **present**, with **10 rows** — all depot-era, all applied cleanly
(`finished_at` set, `rolled_back_at` NULL on every row):

| migration_name | finished_at |
|---|---|
| 20260401214939_init | 2026-05-06T19:51:05.292Z |
| 20260401_add_agreements_push_roles | 2026-05-06T19:51:07.226Z |
| 20260402_announcements_flexible_direct_msg | 2026-05-06T19:51:09.119Z |
| 20260402_missing_fields_tables | 2026-05-06T19:51:11.087Z |
| 20260403_depot_setup_flow | 2026-05-06T19:51:12.917Z |
| 20260403_verified_operator | 2026-05-06T19:51:14.766Z |
| 20260408_dispatcher_open_work | 2026-05-06T19:51:16.782Z |
| 20260414_agreement_unique_active | 2026-05-06T19:51:18.638Z |
| 20260416_block_enforcement | 2026-05-06T19:51:20.520Z |
| 20260416_message_text_varchar | 2026-05-06T19:51:22.398Z |

These are exactly the 10 migration directories in `prisma/migrations/`. Phase 4's
`DELETE FROM _prisma_migrations;` step therefore **does** apply.

## 4. Orphan tables — NONE

25 tables in `public`. All 24 application tables map 1:1 to a model in the
current `prisma/schema.prisma`; the 25th is `_prisma_migrations` (Prisma's own).

```
_prisma_migrations   announcements   audit_logs   blocks   divisions
document_chunks      documents       messages     news     notification_preferences
notifications        officers        overtime_requests     pages
push_subscriptions   registration_approvals       reports  reputation
reviews              saved_swaps     search_queries        sub_units
swap_agreements      swaps           users
```

**`depots` and `invite_codes` do not exist.** The work order expected them as
known orphans; the Layer B/C `db push` evidently dropped them. There is nothing
to retain and nothing to schedule a drop session for.

## 5. `docs/H2-DRIFT.sql` — complete contents

Generated with `prisma migrate diff --from-schema prisma/schema.prisma
--to-config-datasource --script` (datasource pointed at the dev branch).

> Note: the work order's flags (`--from-schema-datamodel`, `--to-url`) were both
> **removed in Prisma 7**. Current equivalents used above.

```sql
-- AlterTable
ALTER TABLE "public"."search_queries" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."document_chunks" ADD COLUMN     "search_vector" tsvector DEFAULT to_tsvector('english'::regconfig, content);
```

That is the entire file. Two statements.

## 6. Drift classification

| # | Drift line | Classification |
|---|---|---|
| 1 | `document_chunks ADD COLUMN search_vector tsvector ...` | **tsvector artifact** ✅ |
| 2 | `search_queries ALTER COLUMN created_at SET DATA TYPE TIMESTAMPTZ(3)` | **🔴 UNEXPLAINED** |

Known orphans: **none found** (none exist).

### 🔴 UNEXPLAINED: `search_queries.created_at` is `timestamptz`

`prisma/schema.prisma` declares:

```prisma
model SearchQuery {
  createdAt DateTime @default(now()) @map("created_at")
}
```

A bare `DateTime` with no `@db.Timestamptz` renders as `TIMESTAMP(3)` (without
time zone). But the live column is **`timestamp with time zone`**.

This is a genuine one-off. Across the whole database:

- **`timestamptz` columns: 4** — `_prisma_migrations.{started_at, finished_at,
  rolled_back_at}` (Prisma's own table, expected) **and `search_queries.created_at`.**
- **`timestamp` (no tz) columns: 53**, across 22 tables — i.e. every other
  application timestamp, including every other `created_at`.

So `search_queries.created_at` is the **only** application column in the entire
schema that is timezone-aware. Nothing in the audit or the work order accounts
for it. Most likely it was created by an out-of-band `ALTER` (same era as the
raw-SQL tsvector work), but that is inference, not evidence — no migration or
script in the repo creates or alters this column.

**Impact is low** (the app writes `new Date()` and never reads the column back
for display; it is an anonymized analytics log). But it is schema/DB
disagreement that the audit did not cover, which is exactly what GATE 1 exists
to catch.

---

## Decisions needed before Phase 2

1. **`search_queries.created_at`** — is this drift intentional/known, or a
   surprise? Two ways forward:
   - **(a)** Add `@db.Timestamptz(3)` to the schema field so schema and DB agree,
     and the baseline reproduces production exactly. *No data change; annotation
     only. Recommended.*
   - **(b)** Treat the DB as wrong and let the baseline emit plain `TIMESTAMP(3)`
     — this makes the baseline **not** reproduce production, and Phase 3's
     scratch↔dev diff will never come back empty.

2. **Missing GIN index** — the baseline should reproduce production (no GIN).
   Adding the index is a separate, deliberate performance change. Confirm you
   want it left out of H2 and tracked as its own work order.
