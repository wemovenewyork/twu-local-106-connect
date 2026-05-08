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
          Try different terms, or check that you&apos;re asking about something
          covered by the contract. Older contracts may not be fully searchable
          yet — those are flagged for OCR.
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
  const href = `/portal/search/document/${result.documentId}?chunk=${result.chunkIndex}&q=${encodeURIComponent(query)}`;

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
