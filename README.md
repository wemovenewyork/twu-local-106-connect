# TWU Local 106 Connect

The official member portal for TWU Local 106 — the union representing NYC transit supervisors.

A Progressive Web App that lets members:

- Find shift swap partners in their division
- Read union news, contracts, and benefits info
- Access forms and documents
- Get push notifications about contract updates and rallies
- Contact their unit officers

## Status

🚧 Pre-launch — being built for presentation to union leadership.

## Architecture

Next.js 16 App Router · Prisma 7 · PostgreSQL (Neon) · Upstash Redis · Web Push · Resend · Sentry · Vercel.

Forked from [we-move-new-york-shift-swap](https://github.com/wemovenewyork/we-move-new-york-shift-swap) — see `RUNBOOK.md` and `AGENTS.md` for engineering context.

## Local Setup

    npm install
    npx prisma generate    # required after fresh install — see RUNBOOK.md
    cp .env.example .env.local
    # Fill in .env.local — see .env.example for the full variable list
    npx prisma migrate dev  # builds the schema from prisma/migrations/
    npm run dev

`prisma migrate dev` against a fresh database applies the single baseline
migration `00000000000000_init_local106`, which reproduces production exactly —
including two raw-SQL artifacts Prisma cannot express in its DSL (the
`document_chunks.search_vector` STORED GENERATED column, and a partial unique
index on `swap_agreements`). Both live at the end of the baseline's
`migration.sql`.

> **Schema changes MUST ship as migrations** (`prisma migrate dev --name …`).
> `db push` is for throwaway experiments on personal branches only — it mutates
> a database without leaving a migration behind, which is exactly how this repo
> ended up with a migration history that no longer matched production.

Deploys apply migrations automatically: the `vercel-build` script runs
`prisma migrate deploy && next build`. See RUNBOOK.md → **Migrations**.

## Documentation

- `AGENTS.md` — agent/AI working conventions
- `RUNBOOK.md` — operations: rollback, env rotation, maintenance mode
- `docs/staging-setup.md` — staging environment provisioning

---

Built for and by TWU Local 106. Not affiliated with the MTA, MaBSTOA, or MTA Bus Company.
