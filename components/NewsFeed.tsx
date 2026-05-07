"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { News } from "@/types";

const PREVIEW_CHARS = 200;

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

function formatAge(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsFeed() {
  const router = useRouter();
  const [news, setNews] = useState<News[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<{ news: News[] }>("/news")
      .then(r => setNews(r.news))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;
  if (news.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2 }}>
          Union News
        </h2>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {news.map(n => {
          const preview = stripMarkdown(n.body).slice(0, PREVIEW_CHARS);
          const truncated = stripMarkdown(n.body).length > PREVIEW_CHARS;
          const divisionLabel = n.division?.name ?? "All Divisions";
          return (
            <button
              key={n.id}
              onClick={() => router.push(`/news/${n.id}`)}
              style={{
                textAlign: "left",
                padding: 16,
                borderRadius: 14,
                background: "rgba(255,255,255,.03)",
                border: `1px solid ${C.bd}`,
                cursor: "pointer",
                display: "block",
                width: "100%",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: n.divisionId === null ? "rgba(173,27,39,.12)" : "rgba(2,73,181,.18)", border: `1px solid ${n.divisionId === null ? "rgba(173,27,39,.35)" : "rgba(2,73,181,.35)"}`, color: n.divisionId === null ? C.red : C.blue }}>
                  {divisionLabel}
                </span>
                <span style={{ fontSize: 11, color: C.m, marginLeft: "auto" }}>{formatAge(n.publishedAt)}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 6 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.5 }}>
                {preview}{truncated ? "…" : ""}
              </div>
              <div style={{ fontSize: 12, color: C.gold, marginTop: 10, fontWeight: 700 }}>Read more →</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
