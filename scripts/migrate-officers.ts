#!/usr/bin/env tsx
/**
 * Migrate the TWU Local 106 officer roster from twu106.org's
 * Executive Council page (/test-staff-page/) into the Officer model.
 *
 * Idempotent: matches existing officers by (name, title) and updates
 * rather than duplicating.
 *
 * Usage:
 *   DATABASE_URL=<direct-url> BLOB_READ_WRITE_TOKEN=<token> \
 *     npx tsx scripts/migrate-officers.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import { randomBytes } from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const SOURCE_URL = "https://twu106.org/test-staff-page/";

type Scope = "local" | "division" | "staff";

interface ParsedOfficer {
  firstName: string;
  lastName: string;
  job: string;
  photoUrl: string | null;
  email: string | null;
  detailUrl: string | null;
  section: "General Officers" | "Division Chairs" | "At-Large Board Members";
}

// Decode HTML entities used by twu106.org's email obfuscation
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
    .replace(/&#8211;/g, "-");
}

function decodeEmail(href: string): string | null {
  // mailto:&#106;de&#106;e... → resolve entities, strip mailto:
  const decoded = decodeHtmlEntities(href);
  const m = decoded.match(/^mailto:(.+)$/);
  if (!m) return null;
  const email = m[1].trim();
  return email.includes("@") ? email : null;
}

/**
 * Parse the Executive Council page HTML into a list of officers.
 * Splits the page on the three section headings, then extracts each
 * `<div class="tmm_member">` within.
 */
function parseRoster(html: string): ParsedOfficer[] {
  const out: ParsedOfficer[] = [];
  const sectionHeading = /<h1 class="wp-block-heading has-text-align-center">([^<]+)<\/h1>/g;
  const headings: { name: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionHeading.exec(html)) !== null) {
    headings.push({ name: decodeHtmlEntities(m[1]).trim(), index: m.index });
  }
  // Slice html into sections
  const sections: { name: string; body: string }[] = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : html.length;
    sections.push({ name: headings[i].name, body: html.slice(start, end) });
  }

  // Within each section, find tmm_member blocks
  // The block ends at </div></div></div> (3 closing divs after textblock)
  // Easier: match the whole block with a non-greedy regex up to the next member or section end.
  const memberRe = /<div class="tmm_member"[^>]*>([\s\S]*?)(?=<div class="tmm_member"|<\/div><\/div><\/div>)/g;

  for (const section of sections) {
    if (!["General Officers", "Division Chairs", "At-Large Board Members"].includes(section.name)) continue;
    let mm: RegExpExecArray | null;
    while ((mm = memberRe.exec(section.body)) !== null) {
      const block = mm[1];

      const fnameMatch = block.match(/<span class="tmm_fname">([^<]+)<\/span>/);
      const lnameMatch = block.match(/<span class="tmm_lname">([^<]+)<\/span>/);
      if (!fnameMatch || !lnameMatch) continue;
      const firstName = decodeHtmlEntities(fnameMatch[1]).trim();
      const lastName = decodeHtmlEntities(lnameMatch[1]).trim();
      if (!firstName || !lastName) continue;

      const jobMatch = block.match(/<div class="tmm_job">([^<]+)<\/div>/);
      const job = jobMatch ? decodeHtmlEntities(jobMatch[1]).replace(/\s+/g, " ").trim() : "Officer";

      const photoMatch = block.match(/background:\s*url\(([^)]+)\)/);
      let photoUrl = photoMatch ? photoMatch[1].trim() : null;
      if (photoUrl) {
        photoUrl = photoUrl.replace(/^['"]|['"]$/g, "");
        // Skip generic flag/placeholder images
        if (/AmericanFlagWatercolor|placeholder/i.test(photoUrl)) photoUrl = null;
      }

      const mailtoMatch = block.match(/href="(mailto:[^"]+)"/);
      const email = mailtoMatch ? decodeEmail(mailtoMatch[1]) : null;

      const detailUrlMatch = block.match(/<a target="_blank"[^>]+href="(https:\/\/twu106\.org\/[^"]+)"/);
      const detailUrl = detailUrlMatch ? detailUrlMatch[1] : null;

      out.push({
        firstName,
        lastName,
        job,
        photoUrl,
        email,
        detailUrl,
        section: section.name as ParsedOfficer["section"],
      });
    }
    memberRe.lastIndex = 0; // reset for next section
  }

  return out;
}

function inferDivisionCode(title: string): string | null {
  const t = title.toLowerCase();
  if (/mta bus/.test(t)) return "MTABUS";
  if (/maintenance supervisors? ii|stations? supervisors? ii|msii/.test(t)) return "MSII";
  if (/queens/.test(t)) return "QUEENS";
  if (/o\/?a |operating authority|mabstoa/.test(t)) return "MABSTOA";
  if (/transit services|tsc/.test(t)) return "TSC";
  return null;
}

function inferScope(section: ParsedOfficer["section"]): Scope {
  if (section === "General Officers") return "local";
  return "division";
}

async function uploadPhoto(srcUrl: string): Promise<string | null> {
  try {
    const res = await fetch(srcUrl);
    if (!res.ok) {
      console.warn(`  ! photo fetch ${res.status}: ${srcUrl}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    // Filename from URL
    const filename = (srcUrl.split("/").pop() ?? "photo.jpg").split("?")[0].replace(/[^a-zA-Z0-9._-]/g, "_");
    const prefix = randomBytes(16).toString("base64url");
    const path = `officers/${prefix}/${filename}`;
    const blob = await put(path, buf, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return blob.url;
  } catch (e) {
    console.warn(`  ! photo upload failed: ${(e as Error).message}`);
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

  console.log(`Fetching ${SOURCE_URL}…`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    console.error(`Failed to fetch source: ${res.status}`);
    process.exit(1);
  }
  const html = await res.text();
  const officers = parseRoster(html);
  console.log(`Parsed ${officers.length} officers from roster page`);

  const divisions = await prisma.division.findMany();
  const divisionByCode: Record<string, string> = {};
  for (const d of divisions) divisionByCode[d.code] = d.id;

  let displayOrder = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const o of officers) {
    const fullName = `${o.firstName} ${o.lastName}`.replace(/\s+/g, " ").trim();
    try {
      const scope = inferScope(o.section);
      let divisionId: string | null = null;
      if (scope === "division") {
        const code = inferDivisionCode(o.job);
        if (code && divisionByCode[code]) {
          divisionId = divisionByCode[code];
        } else {
          console.warn(`  ! could not map "${o.job}" to a division for ${fullName} — leaving null`);
        }
      }

      const existing = await prisma.officer.findFirst({
        where: { name: fullName, title: o.job },
      });

      let photoUrl = existing?.photoUrl ?? null;
      if (o.photoUrl && !existing?.photoUrl) {
        photoUrl = await uploadPhoto(o.photoUrl);
      }

      const data = {
        name: fullName,
        title: o.job,
        scope,
        divisionId,
        displayOrder: displayOrder++,
        photoUrl,
        contactEmail: o.email ?? existing?.contactEmail ?? null,
        contactFormEnabled: true,
        active: true,
      };

      if (existing) {
        await prisma.officer.update({ where: { id: existing.id }, data });
        updatedCount++;
        console.log(`  ~ updated ${fullName} (${o.job})`);
      } else {
        await prisma.officer.create({ data });
        createdCount++;
        console.log(`  + created ${fullName} (${o.job})${photoUrl ? " [+photo]" : ""}`);
      }
    } catch (e) {
      skippedCount++;
      console.warn(`  ! failed ${fullName}: ${(e as Error).message}`);
    }
  }

  console.log(`\nDone. created=${createdCount} updated=${updatedCount} skipped=${skippedCount}`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
