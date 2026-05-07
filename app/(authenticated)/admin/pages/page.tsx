"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { Page } from "@/types";

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

export default function AdminPagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAuthorized = !!user && (user.role === "localAdmin" || user.role === "superAdmin");

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    setBusy(true);
    api.get<{ pages: Page[] }>("/admin/pages")
      .then(r => setPages(r.pages))
      .catch(e => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  }, [isAuthorized]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (!isAuthorized) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Pages</h1>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>
            Editorial content rendered at <code>/&lt;slug&gt;</code> on the public site
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/admin/pages/new")} style={{ padding: "8px 14px", borderRadius: 10, background: C.gold, border: "none", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            + New Page
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

      <div style={{ display: "grid", gap: 8 }}>
        {pages.map(p => (
          <button
            key={p.id}
            onClick={() => router.push(`/admin/pages/${p.id}`)}
            style={{ textAlign: "left", padding: 14, borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, cursor: "pointer", color: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
                padding: "2px 8px", borderRadius: 999,
                background: p.published ? "rgba(46,213,115,.12)" : "rgba(255,255,255,.06)",
                border: `1px solid ${p.published ? "rgba(46,213,115,.35)" : C.bd}`,
                color: p.published ? "#2ED573" : C.m,
              }}>
                {p.published ? "Published" : "Draft"}
              </span>
              <code style={{ fontSize: 11, color: C.m }}>/{p.slug}</code>
              <span style={{ fontSize: 11, color: C.m, marginLeft: "auto" }}>{formatAge(p.updatedAt)}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{p.title}</div>
          </button>
        ))}
      </div>

      {pages.length === 0 && !busy && (
        <div style={{ padding: 32, textAlign: "center", color: C.m, fontSize: 13, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 16 }}>
          No pages yet. <a onClick={() => router.push("/admin/pages/new")} style={{ color: C.white, cursor: "pointer", textDecoration: "underline" }}>Create the first one →</a>
        </div>
      )}
    </main>
  );
}
