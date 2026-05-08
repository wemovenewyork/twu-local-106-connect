#!/usr/bin/env tsx
/**
 * Text extraction pipeline for Contract Search v1.
 *
 * For each contract document:
 *   1. Fetch the PDF from Vercel Blob
 *   2. Extract per-page text via pdf-parse v2 (PDFParse class)
 *   3. Chunk by paragraph (with sentence-aware splitting for very long
 *      paragraphs) and persist to document_chunks
 *   4. Update Document.extractedAt / extractedTextLength / needsOCR
 *
 * Documents that yield <MIN_TEXT_LENGTH characters total are flagged
 * needsOCR=true and skipped (likely scanned PDFs without an OCR layer).
 *
 * Idempotent: existing chunks for a document are deleted before fresh
 * ones are inserted, so re-runs are safe.
 *
 * Usage:
 *   DATABASE_URL="$DATABASE_URL_DIRECT" npx tsx scripts/extract-document-text.ts
 *   DATABASE_URL="$DATABASE_URL_DIRECT" npx tsx scripts/extract-document-text.ts <documentId>
 *     (single-doc mode for re-extraction after fixes)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PDFParse } from "pdf-parse";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const MIN_TEXT_LENGTH = 200;       // below this, document is probably scanned
const MAX_CHUNK_LENGTH = 2000;     // split very long paragraphs
const MIN_CHUNK_LENGTH = 20;       // skip trivial fragments

async function fetchDocumentBytes(fileUrl: string): Promise<Buffer> {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

function chunkParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= MIN_CHUNK_LENGTH);

  const chunks: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= MAX_CHUNK_LENGTH) {
      chunks.push(p);
      continue;
    }
    // Sentence-aware split for long paragraphs
    const sentences = p.match(/[^.!?]+[.!?]+/g) ?? [p];
    let current = "";
    for (const s of sentences) {
      if ((current + s).length > MAX_CHUNK_LENGTH && current) {
        chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks;
}

interface DocSlim {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string | null;
  documentType: string;
}

async function extractDocument(doc: DocSlim): Promise<{
  status: "ok" | "skip" | "ocr" | "error";
  chunks?: number;
  length?: number;
  reason?: string;
}> {
  if (doc.documentType !== "contract") {
    return { status: "skip", reason: "not contract" };
  }
  if (!doc.mimeType?.includes("pdf")) {
    return { status: "skip", reason: `not pdf (${doc.mimeType ?? "unknown"})` };
  }

  let bytes: Buffer;
  try {
    bytes = await fetchDocumentBytes(doc.fileUrl);
  } catch (e) {
    return { status: "error", reason: e instanceof Error ? e.message : String(e) };
  }

  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  let totalText = "";
  // Per-page chunks let us preserve page numbers for citation. pdf-parse v2's
  // TextResult exposes per-page text; we chunk each page independently and
  // tag each chunk with its source page.
  const allChunks: Array<{ content: string; pageNumber: number }> = [];

  try {
    const result = await parser.getText();
    for (const page of result.pages) {
      totalText += page.text + "\n";
      const pageChunks = chunkParagraphs(page.text);
      for (const c of pageChunks) {
        allChunks.push({ content: c, pageNumber: page.num });
      }
    }
  } catch (e) {
    await parser.destroy().catch(() => {});
    return { status: "error", reason: e instanceof Error ? e.message : String(e) };
  } finally {
    await parser.destroy().catch(() => {});
  }

  const length = totalText.length;

  if (length < MIN_TEXT_LENGTH) {
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        extractedAt: new Date(),
        extractedTextLength: length,
        needsOCR: true,
      },
    });
    // Make sure no stale chunks remain
    await prisma.documentChunk.deleteMany({ where: { documentId: doc.id } });
    return { status: "ocr", length };
  }

  // Idempotent re-extraction: clear old chunks first.
  await prisma.documentChunk.deleteMany({ where: { documentId: doc.id } });
  if (allChunks.length > 0) {
    await prisma.documentChunk.createMany({
      data: allChunks.map((c, chunkIndex) => ({
        documentId: doc.id,
        chunkIndex,
        content: c.content,
        pageNumber: c.pageNumber,
      })),
    });
  }

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      extractedAt: new Date(),
      extractedTextLength: length,
      needsOCR: false,
    },
  });

  return { status: "ok", chunks: allChunks.length, length };
}

async function main() {
  const targetId = process.argv[2];

  const where = targetId
    ? { id: targetId }
    : { documentType: "contract" as const };

  const docs = await prisma.document.findMany({
    where,
    select: { id: true, title: true, fileUrl: true, mimeType: true, documentType: true },
    orderBy: { title: "asc" },
  });

  console.log(`Extracting ${docs.length} document(s)…\n`);

  const tally = { ok: 0, ocr: 0, skip: 0, error: 0 };
  let totalChunks = 0;

  for (const doc of docs) {
    const truncated = doc.title.length > 60 ? doc.title.slice(0, 57) + "…" : doc.title;
    process.stdout.write(`  ${truncated.padEnd(62)} `);
    const r = await extractDocument(doc);
    tally[r.status]++;
    if (r.status === "ok") {
      totalChunks += r.chunks ?? 0;
      console.log(`✓ ${r.chunks} chunks (${r.length} chars)`);
    } else if (r.status === "ocr") {
      console.log(`⚠ NEEDS OCR (only ${r.length} chars)`);
    } else if (r.status === "skip") {
      console.log(`SKIP (${r.reason})`);
    } else {
      console.log(`✗ ERROR: ${r.reason}`);
    }
  }

  console.log("\nSummary:");
  console.log(`  extracted: ${tally.ok}`);
  console.log(`  needs OCR: ${tally.ocr}`);
  console.log(`  skipped:   ${tally.skip}`);
  console.log(`  errored:   ${tally.error}`);

  const chunkCount = await prisma.documentChunk.count();
  console.log(`\nTotal chunks in document_chunks: ${chunkCount}`);
  console.log(`Total chunks added this run:     ${totalChunks}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
