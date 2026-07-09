## Project Context

This repo is **TWU Local 106 Connect** — the official member portal for TWU
Local 106 (Transit Supervisors Organization). It was forked on 2026-05-06
from `we-move-new-york-shift-swap@2e9d0ca` and is currently mid-rebrand.
Layer A (surface branding) is complete; Layers B (Depot → Division entity
rename) and C (schema additions: News, Document, SubUnit; admin-approval
registration; InviteCode removal) are still pending. References to "WMNY" or
"We Move NY" that survive in `prisma/migrations/`, audit-snapshot markdown
files, and explanatory code comments are intentional fork attribution and
historical context — do not blanket-rewrite them.

## Deferred

- **i18n:** ES/中文 string tables cover legacy swap screens only; switcher hidden for v1. Translating the new surfaces (dashboard, news, documents, portal, overtime, registration) is a post-launch work order.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
