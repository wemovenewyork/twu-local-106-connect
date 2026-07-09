"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { News } from "@/types";
import { C } from "@/constants/colors";
import MemberPortalHeader from "@/components/ui/MemberPortalHeader";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";
import Icon from "@/components/ui/Icon";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function PortalNewsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ news: News[] }>("/news")
      .then(r => setNews(r.news))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;

  return (
    <div className="page-enter" style={{ minHeight: "100vh", background: C.bg }}>
      <MemberPortalHeader>
        <NotifIcon />
        <InboxIcon />
        <button onClick={() => router.push("/profile")} aria-label="Profile" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="usr" s={15} />
        </button>
      </MemberPortalHeader>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Union News</h1>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>Updates from TWU Local 106 and your division</div>
        </div>

        {loaded && news.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: C.m, fontSize: 14, borderRadius: 14, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.03)" }}>
            No news yet. Updates from Local 106 will appear here.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {news.map(n => (
              <button
                key={n.id}
                onClick={() => router.push(`/portal/news/${n.id}`)}
                style={{ textAlign: "left", padding: 16, borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, cursor: "pointer", display: "block", width: "100%", color: "inherit" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  {n.divisionId && n.division?.name && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: "rgba(2,73,181,.18)", border: "1px solid rgba(2,73,181,.35)", color: C.blue }}>
                      {n.division.name}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: C.m, marginLeft: "auto" }}>{formatDate(n.publishedAt ?? n.createdAt)}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{n.title}</div>
                <div style={{ fontSize: 12, color: C.gold, marginTop: 10, fontWeight: 700 }}>Read more →</div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
