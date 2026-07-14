/**
 * H2 catalog comparison — structural diff between two Postgres databases.
 *
 * WHY THIS EXISTS (do not replace it with `prisma migrate diff`):
 * Prisma's differ is blind to anything its DSL cannot express. During H2 it
 * missed TWO production artifacts — the `search_vector` STORED GENERATED column
 * and the partial unique index `swap_agreements_swap_id_active_key`. This script
 * compares the pg_catalog directly (columns / indexes / constraints / enums), so
 * raw-SQL artifacts are visible.
 *
 * Read-only. Writes nothing to either database.
 *
 * Usage:
 *   A_URL='postgres://…' B_URL='postgres://…' npx tsx scripts/h2-catalog-compare.ts
 *
 * Exit code: 0 = identical, 1 = differences found (or error).
 */
import { Client } from "pg";

const A = process.env.A_URL;
const B = process.env.B_URL;
if (!A || !B) {
  console.error("Set A_URL and B_URL (two Postgres connection strings).");
  process.exit(1);
}

// _prisma_migrations is excluded: its rows differ by design between a
// freshly-migrated database and production.
const QUERIES: Record<string, string> = {
  columns: `
    SELECT c.relname AS tbl, a.attname AS col,
           format_type(a.atttypid, a.atttypmod) AS typ,
           a.attnotnull AS nn, a.attgenerated AS gen,
           pg_get_expr(ad.adbin, ad.adrelid) AS def
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped
      AND c.relname <> '_prisma_migrations'
    ORDER BY 1, 2`,
  indexes: `
    SELECT tablename || ' :: ' || indexdef AS d
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY 1`,
  constraints: `
    SELECT c.relname || ' :: ' || con.conname || ' :: ' || pg_get_constraintdef(con.oid) AS d
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname <> '_prisma_migrations'
    ORDER BY 1`,
  enums: `
    SELECT t.typname || ' :: ' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS d
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY 1`,
};

interface ColRow {
  tbl: string; col: string; typ: string;
  nn: boolean; gen: string | null; def: string | null;
}

async function snapshot(url: string): Promise<Record<string, string[]>> {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const out: Record<string, string[]> = {};
  for (const [key, sql] of Object.entries(QUERIES)) {
    const r = await c.query(sql);
    out[key] = r.rows.map((x) => {
      if (key !== "columns") return (x as { d: string }).d;
      const col = x as ColRow;
      return `${col.tbl}.${col.col} ${col.typ} nn=${col.nn} gen=${col.gen || "-"} def=${col.def || "-"}`;
    });
  }
  await c.end();
  return out;
}

async function main() {
  const [a, b] = await Promise.all([snapshot(A!), snapshot(B!)]);
  let identical = true;

  for (const key of Object.keys(QUERIES)) {
    const SA = new Set(a[key]);
    const SB = new Set(b[key]);
    const onlyA = [...SA].filter((x) => !SB.has(x));
    const onlyB = [...SB].filter((x) => !SA.has(x));
    const ok = onlyA.length === 0 && onlyB.length === 0;
    console.log(`### ${key}: A=${SA.size} B=${SB.size} ${ok ? "IDENTICAL" : "DIFFER"}`);
    if (!ok) {
      identical = false;
      onlyA.forEach((x) => console.log("   ONLY IN A : " + x));
      onlyB.forEach((x) => console.log("   ONLY IN B : " + x));
    }
  }

  console.log("\n============================================================");
  console.log(identical ? "RESULT: IDENTICAL — safe to proceed" : "RESULT: DIFFERENCES FOUND — STOP");
  console.log("============================================================");
  process.exit(identical ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
