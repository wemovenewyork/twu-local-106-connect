"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

interface SearchResult {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  snippet: string;
  documentTitle: string;
  documentFileUrl: string;
  documentDivision: string | null;
}

interface UnsearchableDoc {
  id: string;
  title: string;
  division: string | null;
}

interface Coverage {
  searchable: number;
  notSearchable: number;
  total: number;
  unsearchable: UnsearchableDoc[];
}

// Amber, matching the admin document list's OCR warning. Deliberately not brand
// red — this is a limitation to be aware of, not an error or an alarm.
const AMBER = {
  text: "#FFD088",
  bg: "rgba(217,119,6,.10)",
  bgActive: "rgba(217,119,6,.18)",
  border: "rgba(217,119,6,.35)",
  borderActive: "rgba(217,119,6,.55)",
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const HIGHLIGHT_STYLE = `
  .ot-search-snippet b {
    background: rgba(173,27,39,.30);
    color: #FFE9EB;
    padding: 0 2px;
    border-radius: 3px;
    font-weight: 700;
  }
`;

export default function ContractSearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // How much of the contract corpus search can actually see. Always from the
  // API — never hardcoded, because these numbers move as documents are added
  // or OCR'd later.
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    api.get<Coverage>("/search/coverage")
      .then(setCoverage)
      .catch(() => { /* non-fatal: search still works, we just can't caveat it */ });
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setHasSearched(true);
    setError(null);
    try {
      const data = await api.get<{ results: SearchResult[]; total: number }>(
        `/search?q=${encodeURIComponent(q)}&limit=20`
      );
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    router.push(`/portal/search?q=${encodeURIComponent(query.trim())}`);
    runSearch(query.trim());
  }

  return (
    <>
      <style>{HIGHLIGHT_STYLE}</style>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. sixth day overtime"
            aria-label="Search union contracts"
            style={{
              flex: 1, height: 44, padding: "0 14px", borderRadius: 12,
              border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.04)",
              color: C.white, fontSize: 15, outline: "none",
            }}
            autoFocus={!initialQuery}
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            style={{
              padding: "0 18px", borderRadius: 12, border: "none",
              background: query.trim().length < 2 ? "rgba(173,27,39,.4)" : C.gold,
              color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: 0.4,
              cursor: query.trim().length < 2 ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            {loading ? "…" : "Search"}
          </button>
        </div>
      </form>

      {/* Persistent coverage note — shown before and after any search, so the
          limits of the corpus are never a surprise discovered on empty results. */}
      {coverage && coverage.notSearchable > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ padding: "12px 14px", borderRadius: 12, background: AMBER.bg, border: `1px solid ${AMBER.border}`, color: AMBER.text, fontSize: 13, lineHeight: 1.55, display: "flex", gap: 10 }}>
            <span aria-hidden="true">⚠</span>
            <div style={{ flex: 1 }}>
              <strong>
                Searching {coverage.searchable} of {coverage.total}{" "}
                {plural(coverage.total, "contract", "contracts")}.
              </strong>{" "}
              {coverage.notSearchable}{" "}
              {plural(coverage.notSearchable, "is a scanned copy", "are scanned copies")}{" "}
              with no readable text, so search can&apos;t look inside{" "}
              {plural(coverage.notSearchable, "it", "them")} yet. If you can&apos;t find
              something, it may still be in one of those — ask your rep.
              {coverage.unsearchable.length > 0 && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setListOpen(v => !v)}
                    aria-expanded={listOpen}
                    style={{ background: "none", border: "none", padding: 0, color: AMBER.text, fontWeight: 800, cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
                  >
                    {listOpen ? "Hide the list" : "List them"} →
                  </button>
                </>
              )}
            </div>
          </div>

          {listOpen && coverage.unsearchable.length > 0 && (
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: "10px 12px", borderRadius: 12, background: AMBER.bgActive, border: `1px solid ${AMBER.borderActive}`, display: "grid", gap: 6 }}>
              {coverage.unsearchable.map(d => (
                <li key={d.id} style={{ fontSize: 12, color: AMBER.text, lineHeight: 1.45 }}>
                  {d.title}
                  {d.division && <span style={{ color: C.m }}> · {d.division}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,71,87,.10)", border: "1px solid rgba(255,71,87,.40)", color: "#FF8896", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 24, color: C.m, fontSize: 13 }}>
          Searching…
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && !error && (
        <div style={{ padding: "24px 18px", borderRadius: 14, border: `1px dashed ${C.bd}`, color: C.m, fontSize: 13, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, color: C.white, marginBottom: 6 }}>
            No matches found
          </div>
          {coverage && coverage.notSearchable > 0 ? (
            <>
              We searched the {coverage.searchable}{" "}
              {plural(coverage.searchable, "contract", "contracts")} that{" "}
              {plural(coverage.searchable, "has", "have")} readable text and
              didn&apos;t find that term.{" "}
              <strong style={{ color: AMBER.text }}>
                That doesn&apos;t mean it isn&apos;t in your contract.
              </strong>{" "}
              {coverage.notSearchable} of {coverage.total}{" "}
              {plural(coverage.total, "contract", "contracts")}{" "}
              {plural(coverage.notSearchable, "is a scanned copy", "are scanned copies")}{" "}
              that search can&apos;t read yet — what you&apos;re looking for may be in{" "}
              {plural(coverage.notSearchable, "it", "one of them")}. Try different
              wording, or ask your rep, who can check the{" "}
              {plural(coverage.notSearchable, "document", "documents")} directly.
            </>
          ) : (
            <>
              Try different terms, or check that you&apos;re asking about something
              covered by the contract. If you still can&apos;t find it, ask your rep.
            </>
          )}
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
            {results.length} {results.length === 1 ? "match" : "matches"}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {results.map(r => (
              <SearchResultCard key={r.chunkId} result={r} query={query} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SearchResultCard({ result, query }: { result: SearchResult; query: string }) {
  const router = useRouter();
  // Carry the matching page through to the viewer so the PDF opens at the hit
  // rather than page 1. Omitted entirely when null — never sent as "null".
  const pageParam = result.pageNumber != null ? `&page=${result.pageNumber}` : "";
  const href = `/portal/search/document/${result.documentId}?chunk=${result.chunkIndex}&q=${encodeURIComponent(query)}${pageParam}`;

  return (
    <button
      onClick={() => router.push(href)}
      style={{
        textAlign: "left", padding: 16, borderRadius: 14,
        background: "rgba(255,255,255,.025)", border: `1px solid ${C.bd}`,
        color: "inherit", cursor: "pointer", display: "block", width: "100%",
        transition: "border-color .15s, background .15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(173,27,39,.40)";
        e.currentTarget.style.background = "rgba(255,255,255,.045)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.bd;
        e.currentTarget.style.background = "rgba(255,255,255,.025)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, lineHeight: 1.3, minWidth: 0 }}>
          {result.documentTitle}
        </div>
        <div style={{ display: "flex", gap: 6, fontSize: 10, color: C.m, flexShrink: 0 }}>
          {result.pageNumber != null && (
            <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}` }}>
              p. {result.pageNumber}
            </span>
          )}
          {result.documentDivision && (
            <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(2,73,181,.12)", border: "1px solid rgba(2,73,181,.30)", color: "#7CB1FF" }}>
              {result.documentDivision}
            </span>
          )}
        </div>
      </div>
      <p
        className="ot-search-snippet"
        style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,.85)", margin: 0 }}
        dangerouslySetInnerHTML={{ __html: result.snippet }}
      />
      <div style={{ fontSize: 11, color: C.gold, marginTop: 10, fontWeight: 700 }}>
        Read in document →
      </div>
    </button>
  );
}
