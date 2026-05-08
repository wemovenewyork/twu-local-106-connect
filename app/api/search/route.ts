import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

interface SearchRow {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  snippet: string;
  rank: number;
  documentTitle: string;
  documentFileUrl: string;
  documentDivision: string | null;
}

// GET /api/search?q=<query>&limit=<n>
// Postgres full-text search across contract chunks. Snippet via ts_headline,
// relevance via ts_rank. Scoped to documentType='contract' for v1.
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  // Sanity-check the user is real (rejects stale tokens fast).
  const me = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true },
  });
  if (!me) return err("Unauthorized", 401);

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;

  if (query.length < 2) {
    return ok({ results: [], total: 0 });
  }

  // plainto_tsquery handles arbitrary user input safely (no operator parsing).
  // ts_headline emits <b>…</b> around matched terms — frontend renders these
  // via dangerouslySetInnerHTML with a CSS rule that styles <b> as a highlight.
  const rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT
      dc.id                                   AS "id",
      dc.document_id                          AS "documentId",
      dc.chunk_index                          AS "chunkIndex",
      dc.content                              AS "content",
      dc.page_number                          AS "pageNumber",
      ts_headline(
        'english',
        dc.content,
        plainto_tsquery('english', ${query}),
        'MaxWords=40, MinWords=20, ShortWord=3, MaxFragments=2, FragmentDelimiter=" … "'
      )                                       AS "snippet",
      ts_rank(dc.search_vector, plainto_tsquery('english', ${query})) AS "rank",
      d.title                                 AS "documentTitle",
      d.file_url                              AS "documentFileUrl",
      div.name                                AS "documentDivision"
    FROM document_chunks dc
    JOIN documents d  ON d.id  = dc.document_id
    LEFT JOIN divisions div ON div.id = d.division_id
    WHERE dc.search_vector @@ plainto_tsquery('english', ${query})
      AND d.document_type = 'contract'
      AND d.needs_ocr = false
    ORDER BY rank DESC, d.title ASC, dc.chunk_index ASC
    LIMIT ${limit}
  `;

  // Anonymized log — captures query + result count, never the user.
  prisma.searchQuery.create({
    data: { query, resultCount: rows.length },
  }).catch(() => { /* non-fatal */ });

  return ok({
    results: rows.map(r => ({
      chunkId: r.id,
      documentId: r.documentId,
      chunkIndex: r.chunkIndex,
      pageNumber: r.pageNumber,
      content: r.content,
      snippet: r.snippet,
      documentTitle: r.documentTitle,
      documentFileUrl: r.documentFileUrl,
      documentDivision: r.documentDivision,
    })),
    total: rows.length,
  });
}

export const runtime = "nodejs";
