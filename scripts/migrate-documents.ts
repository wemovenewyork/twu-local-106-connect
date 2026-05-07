#!/usr/bin/env tsx
/**
 * Migrate publicly-relevant documents from twu106.org into the Document model.
 *
 * Source: /tmp/twu106-inventory/documents.md (parsed as a list of
 *   {title, url, linkedFrom} triples).
 *
 * Inclusion criteria (conservative — we skip transient news-post attachments
 * and third-party CDN files; everything we keep is something a member would
 * still want to look up months later):
 *   1. URL is on twu106.org/wp-content/uploads (their own asset library)
 *   2. linkedFrom matches one of the standing resource pages: contracts,
 *      forms, benefits, pensions, scholarships, policies, medicare, dental,
 *      vision, WTC, retirement, etc.
 *
 * Each kept doc is downloaded, re-hosted on the public Blob store, and
 * inserted as Document(publiclyVisible=true, visibility='all',
 * divisionId=<inferred from linkedFrom>). Idempotent on title — re-running
 * updates rather than duplicating.
 *
 * Usage:
 *   DATABASE_URL=<direct> BLOB_READ_WRITE_TOKEN=<token> \
 *     npx tsx scripts/migrate-documents.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const INVENTORY_PATH = "/tmp/twu106-inventory/documents.md";
const SOURCE_HOST = "twu106.org";
const ASSET_PREFIX = "/wp-content/uploads/";

interface Entry {
  title: string;
  url: string;
  linkedFrom: string;
}

function parseInventory(): Entry[] {
  const text = readFileSync(INVENTORY_PATH, "utf8");
  const lines = text.split("\n");
  const out: Entry[] = [];
  let current: Partial<Entry> = {};
  for (const line of lines) {
    const titleM = line.match(/^- \*\*(.+?)\*\*$/);
    if (titleM) {
      if (current.title && current.url && current.linkedFrom) out.push(current as Entry);
      current = { title: titleM[1].trim() };
      continue;
    }
    const urlM = line.match(/^\s+- URL:\s*(\S+)\s*$/);
    if (urlM) current.url = urlM[1];
    const linkedM = line.match(/^\s+- Linked from:\s*(\S+)\s*$/);
    if (linkedM) current.linkedFrom = linkedM[1];
  }
  if (current.title && current.url && current.linkedFrom) out.push(current as Entry);
  return out;
}

// Pages that hold standing reference material (contracts, forms, benefits).
// These are our keep-list for deciding which inventoried PDFs to import.
const KEEP_LINKED_FROM = [
  /\/oa-contracts\/?$/,
  /\/queens-division-contracts\/?$/,
  /\/queens-division-policies\/?$/,
  /\/mta-bus-contracts\/?$/,
  /\/mta-bus-policies\/?$/,
  /\/mta-bus-pension\/?$/,
  /\/station-supervisor-ii-contracts\/?$/,
  /\/maintenance-supervisors-ii-contract\/?$/,
  /\/tsc-contracts\/?$/,
  /\/tsc-i-ii-benefits\/?$/,
  /\/transit-authority-forms\/?$/,
  /\/sick-leave-forms\/?$/,
  /\/medical-forms\/?$/,
  /\/supervisors-forms\/?$/,
  /\/new-member-forms\/?$/,
  /\/dental-and-vision\/?$/,
  /\/vision-coverage\/?$/,
  /\/medicare-info\/?$/,
  /\/oa-unit-benefits\/?$/,
  /\/wtc\/?$/,
  /\/nycers-25-55-transit-operating-tier-4-pension\/?$/,
  /\/medical-and-pension-tracking-all-units\/?$/,
  /\/mabstoa\/?$/,
  /\/queens\/?$/,
  /\/mta-bus\/?$/,
  /\/tsc\/?$/,
  /\/maintenance-supervisors-ii\/?$/,
  /\/dying-before-retiring\/?$/,
  /\/application-railroad-commuter-pass\/?$/,
];

function isKeeper(e: Entry): boolean {
  const u = e.url;
  if (!u.includes(SOURCE_HOST) || !u.includes(ASSET_PREFIX)) return false;
  const ext = (u.split("?")[0].split(".").pop() || "").toLowerCase();
  if (!["pdf", "doc", "docx", "xlsx", "ppt", "pptx"].includes(ext)) return false;
  return KEEP_LINKED_FROM.some((re) => re.test(e.linkedFrom));
}

function inferDivisionCode(linkedFrom: string): string | null {
  const lf = linkedFrom.toLowerCase();
  if (/\/(mabstoa|oa-contracts|oa-unit-benefits)/.test(lf)) return "MABSTOA";
  if (/\/(queens-division-contracts|queens-division-policies|queens)/.test(lf)) return "QUEENS";
  if (/\/(mta-bus-contracts|mta-bus-policies|mta-bus-pension|mta-bus)/.test(lf)) return "MTABUS";
  if (
    /\/(station-supervisor-ii-contracts|maintenance-supervisors-ii-contract|maintenance-supervisors-ii)/.test(
      lf,
    )
  )
    return "MSII";
  if (/\/(tsc-contracts|tsc-i-ii-benefits|tsc)/.test(lf)) return "TSC";
  return null;
}

function inferMimeType(url: string): string {
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return "application/octet-stream";
  }
}

async function rehost(srcUrl: string): Promise<{ url: string; size: number; contentType: string } | null> {
  try {
    const res = await fetch(srcUrl);
    if (!res.ok) {
      console.warn(`   ! fetch ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? inferMimeType(srcUrl);
    const filename = (new URL(srcUrl).pathname.split("/").pop() || "doc").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const prefix = randomBytes(8).toString("base64url");
    const path = `documents/${prefix}/${filename}`;
    const blob = await put(path, buf, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return { url: blob.url, size: buf.byteLength, contentType };
  } catch (e) {
    console.warn(`   ! upload failed: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set");
    process.exit(1);
  }

  const superAdmin = await prisma.user.findFirst({ where: { role: "superAdmin" } });
  if (!superAdmin) {
    console.error("No superAdmin user found");
    process.exit(1);
  }

  const divisions = await prisma.division.findMany();
  const divisionByCode: Record<string, string> = {};
  for (const d of divisions) divisionByCode[d.code] = d.id;

  const all = parseInventory();
  const keepers = all.filter(isKeeper);

  // De-duplicate by URL — multiple linkedFrom entries may share a URL.
  const byUrl = new Map<string, Entry>();
  for (const e of keepers) {
    if (!byUrl.has(e.url)) byUrl.set(e.url, e);
  }
  const queue = [...byUrl.values()];
  console.log(
    `Inventory: ${all.length}; eligible: ${keepers.length}; unique-by-url: ${queue.length}`,
  );

  let created = 0,
    updated = 0,
    skipped = 0;

  for (const e of queue) {
    console.log(` • ${e.title}`);
    try {
      const code = inferDivisionCode(e.linkedFrom);
      const divisionId = code ? divisionByCode[code] ?? null : null;

      const existing = await prisma.document.findFirst({ where: { title: e.title } });
      if (existing && existing.fileUrl.includes("public.blob.vercel-storage.com")) {
        console.log(`   ~ already migrated, skipping`);
        skipped++;
        continue;
      }

      const rehosted = await rehost(e.url);
      if (!rehosted) {
        skipped++;
        continue;
      }

      const data = {
        title: e.title,
        description: `Imported from ${e.linkedFrom}`,
        fileUrl: rehosted.url,
        fileSize: rehosted.size,
        mimeType: rehosted.contentType,
        visibility: "all" as const,
        divisionId,
        publiclyVisible: true,
        uploaderId: superAdmin.id,
      };

      if (existing) {
        await prisma.document.update({ where: { id: existing.id }, data });
        console.log(`   ~ updated (${(rehosted.size / 1024).toFixed(0)} KB)`);
        updated++;
      } else {
        await prisma.document.create({ data });
        console.log(`   + created (${(rehosted.size / 1024).toFixed(0)} KB)`);
        created++;
      }
    } catch (err) {
      console.warn(`   ! failed: ${(err as Error).message}`);
      skipped++;
    }
  }

  console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
