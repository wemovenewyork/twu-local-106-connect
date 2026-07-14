import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireApprovedMember } from "@/lib/approval";
import { ok, err } from "@/lib/apiResponse";

interface CountsRow {
  searchable: number;
  notSearchable: number;
  total: number;
}

interface UnsearchableRow {
  id: string;
  title: string;
  division: string | null;
}

// GET /api/search/coverage
//
// Tells the member how much of the contract corpus search can actually see.
// Contract search deliberately excludes scanned documents (`needs_ocr = true`)
// because they have no text layer and would return nothing useful — but without
// these numbers a "No results" is indistinguishable from "that clause doesn't
// exist". This endpoint exists so the UI can tell the truth.
//
// Approval-gated and visibility-scoped identically to GET /api/search, so a
// member never sees a count or a title for a document they could not open.
export async function GET(req: NextRequest) {
  let token;
  try { token = requireUser(req); } catch { return err("Unauthorized", 401); }

  const gate = await requireApprovedMember(token.userId);
  if (!gate.user) return err(gate.error, gate.status);

  // Same visibility filter as GET /api/search. Kept in lockstep on purpose:
  // if search can't return it, we must not count or name it here either.
  const seesAll = ["localAdmin", "superAdmin"].includes(gate.user.role);
  const visibilityFilter = seesAll
    ? Prisma.sql`TRUE`
    : Prisma.sql`(
        d.visibility = 'all'
        OR (d.visibility = 'division' AND d.division_id = ${gate.user.divisionId})
        OR (d.visibility = 'subUnit'  AND d.sub_unit_id  = ${gate.user.subUnitId})
        OR (d.visibility = 'selfOnly' AND d.owner_user_id = ${gate.user.id})
      )`;

  // "searchable" mirrors exactly what the search query can return: not a scan,
  // AND actually has indexed chunks. A contract that extracted to nothing is
  // counted in neither bucket — it is in `total`, which is why the copy says
  // "X of TOTAL" rather than implying the two buckets sum to the whole.
  const [counts] = await prisma.$queryRaw<CountsRow[]>`
    SELECT
      count(*) FILTER (
        WHERE d.needs_ocr = false
          AND EXISTS (SELECT 1 FROM document_chunks dc WHERE dc.document_id = d.id)
      )::int AS "searchable",
      count(*) FILTER (WHERE d.needs_ocr = true)::int AS "notSearchable",
      count(*)::int AS "total"
    FROM documents d
    WHERE d.document_type = 'contract'
      AND ${visibilityFilter}
  `;

  // The titles of the scans, so a member who knows a document exists can ask a
  // rep for it by name instead of concluding it isn't there.
  const unsearchable = await prisma.$queryRaw<UnsearchableRow[]>`
    SELECT d.id, d.title, div.name AS "division"
    FROM documents d
    LEFT JOIN divisions div ON div.id = d.division_id
    WHERE d.document_type = 'contract'
      AND d.needs_ocr = true
      AND ${visibilityFilter}
    ORDER BY d.title ASC
  `;

  return ok({
    searchable: counts?.searchable ?? 0,
    notSearchable: counts?.notSearchable ?? 0,
    total: counts?.total ?? 0,
    unsearchable,
  });
}

export const runtime = "nodejs";
