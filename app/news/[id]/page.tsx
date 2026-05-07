"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { News } from "@/types";
import Footer from "@/components/ui/Footer";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [news, setNews] = useState<News | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ news: News }>(`/news/${id}`)
      .then(r => setNews(r.news))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id, user]);

  if (loading || !user) {
    return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  }
  if (error) {
    return (
      <main style={{ padding: "40px 24px", maxWidth: 720, margin: "0 auto", color: C.m, textAlign: "center" }}>
        <div style={{ fontSize: 18, color: C.white, fontWeight: 700, marginBottom: 8 }}>News not found</div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>{error}</div>
        <button onClick={() => router.push("/divisions")} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.white, fontSize: 13, cursor: "pointer" }}>
          Back home
        </button>
      </main>
    );
  }
  if (!news) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;

  const isAdminTier = ["editor", "divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);
  const canEdit =
    user.role === "superAdmin" ||
    user.role === "localAdmin" ||
    (user.role === "divisionAdmin" && news.divisionId && news.divisionId === user.divisionId) ||
    (isAdminTier && news.authorId === user.id);

  const divisionLabel = news.division?.name ?? "All Divisions";

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ padding: "6px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer" }}>
          ← Back
        </button>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.white, letterSpacing: 2 }}>NEWS</div>
        {canEdit && (
          <button onClick={() => router.push(`/admin/news/${news.id}`)} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.gold, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
            Edit
          </button>
        )}
      </div>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", padding: "3px 10px", borderRadius: 999, background: news.divisionId === null ? "rgba(173,27,39,.12)" : "rgba(2,73,181,.18)", border: `1px solid ${news.divisionId === null ? "rgba(173,27,39,.35)" : "rgba(2,73,181,.35)"}`, color: news.divisionId === null ? C.red : C.blue }}>
            {divisionLabel}
          </span>
          <span style={{ fontSize: 12, color: C.m }}>{formatDate(news.publishedAt)}</span>
          {news.author && (
            <span style={{ fontSize: 12, color: C.m }}>· by {news.author.firstName} {news.author.lastName}</span>
          )}
        </div>
        <h1 style={{ fontSize: "clamp(24px,6vw,36px)", fontWeight: 800, color: C.white, lineHeight: 1.15, marginBottom: 24 }}>
          {news.title}
        </h1>
        <article className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,.85)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{news.body}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </div>
  );
}
