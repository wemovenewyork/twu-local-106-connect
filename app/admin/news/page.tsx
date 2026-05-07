"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { News, NewsStatus } from "@/types";

const STATUS_ORDER: NewsStatus[] = ["draft", "inReview", "published", "archived"];

const STATUS_BADGE: Record<NewsStatus, { bg: string; bd: string; c: string; label: string }> = {
  draft: { bg: "rgba(255,255,255,.08)", bd: "rgba(255,255,255,.18)", c: C.m, label: "Draft" },
  inReview: { bg: "rgba(217,119,6,.12)", bd: "rgba(217,119,6,.35)", c: "#D97706", label: "In Review" },
  published: { bg: "rgba(46,213,115,.12)", bd: "rgba(46,213,115,.35)", c: "#2ED573", label: "Published" },
  archived: { bg: "rgba(128,128,128,.12)", bd: "rgba(128,128,128,.3)", c: "#888", label: "Archived" },
};

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminNewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [news, setNews] = useState<News[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAuthorized = !!user && ["editor", "divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    setBusy(true);
    api.get<{ news: News[] }>("/admin/news")
      .then(r => setNews(r.news))
      .catch(e => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  }, [isAuthorized]);

  const grouped = useMemo(() => {
    const out: Record<NewsStatus, News[]> = { draft: [], inReview: [], published: [], archived: [] };
    for (const n of news) out[n.status].push(n);
    return out;
  }, [news]);

  if (loading || !user) {
    return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  }
  if (!isAuthorized) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>News</h1>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>
            Drafts, reviews, and published posts
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/admin/news/new")} style={{ padding: "8px 14px", borderRadius: 10, background: C.gold, border: "none", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            + New Post
          </button>
          <button onClick={() => router.push("/admin")} style={{ padding: "8px 14px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer" }}>
            ← Admin
          </button>
        </div>
      </div>

      {err && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13, background: "rgba(173,27,39,.10)", border: `1px solid rgba(173,27,39,.35)`, color: C.red }}>
          {err}
        </div>
      )}

      {busy && <div style={{ color: C.m, fontSize: 13, marginBottom: 12 }}>Loading…</div>}

      {STATUS_ORDER.map(status => {
        const items = grouped[status];
        if (items.length === 0) return null;
        const badge = STATUS_BADGE[status];
        return (
          <section key={status} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
              {badge.label} ({items.length})
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {items.map(n => (
                <NewsRow key={n.id} news={n} onClick={() => router.push(`/admin/news/${n.id}`)} />
              ))}
            </div>
          </section>
        );
      })}

      {news.length === 0 && !busy && (
        <div style={{ padding: 32, textAlign: "center", color: C.m, fontSize: 13, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 16 }}>
          No news yet. <a onClick={() => router.push("/admin/news/new")} style={{ color: C.white, cursor: "pointer", textDecoration: "underline" }}>Create the first one →</a>
        </div>
      )}
    </main>
  );
}

function NewsRow({ news, onClick }: { news: News; onClick: () => void }) {
  const badge = STATUS_BADGE[news.status];
  const divisionLabel = news.division?.name ?? (news.divisionId === null ? "All Divisions" : "—");
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: 14,
        background: "rgba(255,255,255,.03)",
        border: `1px solid ${C.bd}`,
        color: "inherit",
        cursor: "pointer",
        display: "block",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
          padding: "2px 8px", borderRadius: 999,
          background: badge.bg, border: `1px solid ${badge.bd}`, color: badge.c,
        }}>
          {badge.label}
        </span>
        <span style={{ fontSize: 11, color: C.m }}>{divisionLabel}</span>
        <span style={{ fontSize: 11, color: C.m, marginLeft: "auto" }}>{formatAge(news.updatedAt)}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>
        {news.title || "(untitled)"}
      </div>
      <div style={{ fontSize: 12, color: C.m }}>
        by {news.author ? `${news.author.firstName} ${news.author.lastName}` : "—"}
      </div>
    </button>
  );
}
