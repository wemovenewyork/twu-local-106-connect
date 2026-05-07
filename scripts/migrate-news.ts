#!/usr/bin/env tsx
/**
 * Migrate the 25 most recent news posts from twu106.org into the News model.
 *
 * - Pulls each post URL from /tmp/twu106-inventory/news.md (most-recent-first
 *   order is preserved by the inventory).
 * - Extracts <div class="single-post-wrap entry-content">, strips the inline
 *   title/author block, and converts the remainder to markdown via Turndown.
 * - Re-hosts every twu106.org/wp-content/uploads/ asset (images + PDFs) on
 *   our public Blob store and rewrites the markdown reference accordingly.
 * - Creates News records: status=published, publiclyVisible=true,
 *   authorId=<superAdmin>, divisionId=null, publicSlug derived from URL slug.
 *
 * Idempotent on publicSlug — re-running updates the existing record.
 *
 * Usage:
 *   DATABASE_URL=<direct> BLOB_READ_WRITE_TOKEN=<token> \
 *     npx tsx scripts/migrate-news.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import TurndownService from "turndown";
// @ts-expect-error - no types shipped
import { gfm } from "turndown-plugin-gfm";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const INVENTORY_PATH = "/tmp/twu106-inventory/news.md";
const SOURCE_HOST = "twu106.org";
const ASSET_PREFIX = "/wp-content/uploads/";
const POST_LIMIT = 25;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&hellip;/g, "…");
}

function listInventoryUrls(): string[] {
  const text = readFileSync(INVENTORY_PATH, "utf8");
  const urls: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^URL:\s*(https:\/\/twu106\.org\/[^\s]+)/);
    if (m) urls.push(m[1].trim());
  }
  return urls;
}

function slugFromUrl(url: string): string {
  const u = new URL(url);
  return u.pathname.replace(/^\/+|\/+$/g, "").split("/").pop() || "post";
}

const blobCache = new Map<string, string>();

async function rehostAsset(srcUrl: string): Promise<string | null> {
  const cached = blobCache.get(srcUrl);
  if (cached) return cached;

  try {
    const res = await fetch(srcUrl);
    if (!res.ok) {
      console.warn(`    ! asset fetch ${res.status}: ${srcUrl}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    const u = new URL(srcUrl);
    const filename = (u.pathname.split("/").pop() || "asset").replace(/[^a-zA-Z0-9._-]/g, "_");
    const prefix = randomBytes(8).toString("base64url");
    const path = `news/${prefix}/${filename}`;
    const blob = await put(path, buf, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    blobCache.set(srcUrl, blob.url);
    return blob.url;
  } catch (e) {
    console.warn(`    ! asset upload failed: ${(e as Error).message}`);
    return null;
  }
}

interface FetchedPost {
  title: string;
  publishedAt: Date | null;
  bodyHtml: string;
}

function parsePost(html: string): FetchedPost {
  const titleMatch = html.match(
    /<h1 class="hestia-title title-in-content entry-title"[^>]*>([\s\S]*?)<\/h1>/,
  );
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, "")).trim()
    : "Untitled";

  const dateMatch = html.match(/<time class="entry-date published"[^>]*datetime="([^"]+)"/);
  const publishedAt = dateMatch ? new Date(dateMatch[1]) : null;

  // Pull the entry-content body. Strip the leading row that contains the title
  // + "Published by" line, since the page template already renders these.
  const bodyMatch = html.match(
    /<div class="single-post-wrap entry-content">([\s\S]*?)<div class="entry-categories">/,
  );
  let bodyHtml = bodyMatch ? bodyMatch[1] : "";

  // Drop the title/author row block.
  bodyHtml = bodyHtml.replace(
    /<div class="row"><div class="col-md-12">[\s\S]*?<\/div><\/div>/,
    "",
  );

  return { title, publishedAt, bodyHtml };
}

async function rewriteAssetsInHtml(html: string): Promise<string> {
  const imgRe = /<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g;
  const aRe = /<a\b[^>]*\bhref="([^"]+)"[^>]*>/g;
  const srcsetRe = /\bsrcset="([^"]+)"/g;

  const replacements: Array<[string, string]> = [];

  // Collect image src
  for (const m of html.matchAll(imgRe)) {
    if (m[1].includes(SOURCE_HOST) && m[1].includes(ASSET_PREFIX)) {
      const newUrl = await rehostAsset(m[1]);
      if (newUrl) replacements.push([m[1], newUrl]);
    }
  }
  // Collect anchor href (PDFs, docs)
  for (const m of html.matchAll(aRe)) {
    if (m[1].includes(SOURCE_HOST) && m[1].includes(ASSET_PREFIX)) {
      const newUrl = await rehostAsset(m[1]);
      if (newUrl) replacements.push([m[1], newUrl]);
    }
  }

  let out = html;
  for (const [from, to] of replacements) {
    out = out.split(from).join(to);
  }

  // Strip srcset attributes — we only re-hosted the primary src, so leaving
  // the srcset would point browsers back to twu106.org.
  out = out.replace(srcsetRe, "");

  return out;
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  td.use(gfm);
  td.addRule("stripWpClasses", {
    filter: (node) => node.nodeName === "DIV" || node.nodeName === "FIGURE" || node.nodeName === "SECTION",
    replacement: (content) => content,
  });
  td.addRule("stripFigcaption", {
    filter: "figcaption",
    replacement: (content) => (content.trim() ? `\n\n*${content.trim()}*\n\n` : ""),
  });
  td.remove(["script", "style", "noscript"]);
  return td;
}

async function migrateOne(
  url: string,
  authorId: string,
  td: TurndownService,
): Promise<{ created: boolean; updated: boolean; skipped?: string }> {
  const slug = slugFromUrl(url);
  console.log(` • ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`   ! fetch ${res.status}`);
    return { created: false, updated: false, skipped: `fetch ${res.status}` };
  }
  const html = await res.text();
  const { title, publishedAt, bodyHtml } = parsePost(html);
  if (!bodyHtml.trim()) {
    return { created: false, updated: false, skipped: "empty body" };
  }

  const rewritten = await rewriteAssetsInHtml(bodyHtml);
  const markdown = td.turndown(rewritten).trim();

  const existing = await prisma.news.findFirst({ where: { publicSlug: slug } });

  const data = {
    title,
    body: markdown,
    status: "published" as const,
    publiclyVisible: true,
    publicSlug: slug,
    publishedAt,
    authorId,
    divisionId: null,
  };

  if (existing) {
    await prisma.news.update({ where: { id: existing.id }, data });
    console.log(`   ~ updated "${title}"`);
    return { created: false, updated: true };
  }

  await prisma.news.create({ data });
  console.log(`   + created "${title}"`);
  return { created: true, updated: false };
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

  const allUrls = listInventoryUrls();
  const urls = allUrls.slice(0, POST_LIMIT);
  console.log(`Migrating ${urls.length} of ${allUrls.length} posts (author=${superAdmin.email})`);

  const td = buildTurndown();
  let created = 0,
    updated = 0,
    skipped = 0;

  for (const url of urls) {
    try {
      const r = await migrateOne(url, superAdmin.id, td);
      if (r.created) created++;
      else if (r.updated) updated++;
      else skipped++;
    } catch (e) {
      skipped++;
      console.warn(`   ! failed: ${(e as Error).message}`);
    }
  }

  console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
