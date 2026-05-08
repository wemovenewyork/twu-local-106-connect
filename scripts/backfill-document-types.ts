#!/usr/bin/env tsx
/**
 * Heuristic backfill of Document.documentType for the migrated 124+ docs.
 *
 * Most-specific match wins:
 *   constitution > contract > form > memo > (fallback) other
 *
 * Admins can correct misclassifications via the document edit UI later.
 *
 * Idempotent guard: only updates rows where documentType is still 'other'
 * (the schema default), so re-running won't overwrite admin corrections.
 *
 * Usage:
 *   DATABASE_URL="$DATABASE_URL_DIRECT" npx tsx scripts/backfill-document-types.ts
 */

import { PrismaClient, DocumentType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Patterns run on a NORMALIZED title (lowercased; underscores and hyphens
// converted to spaces) so token-based \b word boundaries actually work —
// `Integrated_agreement_7-1-84` and `MOU_CBA` are otherwise indistinguishable
// from `\w+` blobs.
const RULES: Array<{ pattern: RegExp; type: DocumentType }> = [
  // Constitution / bylaws — most specific first
  { pattern: /\b(constitution|by\s?laws|bylaws)\b/i, type: "constitution" },
  // Contracts: CBAs, MOAs, MOUs, integrated agreements, arbitration/impasse
  // awards (those establish contract terms in this corpus), wage schedules.
  { pattern: /\b(contract|cba|collective\s+bargaining|memorandum\s+of\s+agreement|memorandum\s+of\s+understanding|moa|mou|agreement|wage\s+schedule|arbitration\s+award|impasse\s+(panel|award))\b/i, type: "contract" },
  // Forms
  { pattern: /\b(form|application|enrollment|withdrawal|claim|request|authorization|waiver|designation\s+of\s+beneficiary|dues\s+auth)\b/i, type: "form" },
  // Memos / letters / announcements
  { pattern: /\b(memo|letter|notice|announcement|bulletin)\b/i, type: "memo" },
];

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[_\-]+/g, " ");
}

async function main() {
  const docs = await prisma.document.findMany({
    where: { documentType: "other" },
    select: { id: true, title: true },
  });

  console.log(`Backfilling ${docs.length} documents (type='other')…\n`);

  const counts: Record<DocumentType, number> = {
    contract: 0, form: 0, constitution: 0, memo: 0, other: 0,
  };
  const samples: Record<DocumentType, string[]> = {
    contract: [], form: [], constitution: [], memo: [], other: [],
  };

  for (const doc of docs) {
    const normalized = normalizeTitle(doc.title);
    let matched: DocumentType = "other";
    for (const rule of RULES) {
      if (rule.pattern.test(normalized)) { matched = rule.type; break; }
    }

    if (matched !== "other") {
      await prisma.document.update({
        where: { id: doc.id },
        data: { documentType: matched },
      });
    }
    counts[matched]++;
    if (samples[matched].length < 6) samples[matched].push(doc.title);
  }

  console.log("Backfill complete. Distribution:");
  for (const k of Object.keys(counts) as DocumentType[]) {
    console.log(`  ${k.padEnd(13)} ${counts[k]}`);
  }
  console.log("");
  for (const k of Object.keys(samples) as DocumentType[]) {
    if (samples[k].length === 0) continue;
    console.log(`Sample ${k}:`);
    samples[k].forEach((t) => console.log(`  - ${t}`));
    console.log("");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
