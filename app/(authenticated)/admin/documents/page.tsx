"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

type Visibility = "all" | "division" | "subUnit" | "selfOnly";

interface DocLite {
  id: string;
  title: string;
  description: string | null;
  fileSize: number | null;
  mimeType: string | null;
  fileUrl: string;
  visibility: Visibility;
  publiclyVisible: boolean;
  divisionId: string | null;
  subUnitId: string | null;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  division?: { id: string; code: string; name: string } | null;
  subUnit?: { id: string; code: string; name: string } | null;
  uploader?: { id: string; firstName: string; lastName: string };
}

const VIS_LABEL: Record<Visibility, string> = {
  all: "All members",
  division: "Division",
  subUnit: "Sub-unit",
  selfOnly: "Self only",
};

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminDocumentsListPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAuthorized = !!user && ["divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    setBusy(true);
    api.get<{ documents: DocLite[] }>("/admin/documents")
      .then(r => setDocs(r.documents))
      .catch(e => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  }, [isAuthorized]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (!isAuthorized) return null;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Documents</h1>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>
            Forms, contracts, constitutions, and other shared files
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/admin/documents/new")} style={{ padding: "8px 14px", borderRadius: 10, background: C.gold, border: "none", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            + Upload Document
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
        {docs.map(d => (
          <button
            key={d.id}
            onClick={() => router.push(`/admin/documents/${d.id}`)}
            style={{ textAlign: "left", padding: 14, borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, cursor: "pointer", color: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
                padding: "2px 8px", borderRadius: 999,
                background: "rgba(255,255,255,.06)", border: `1px solid ${C.bd}`, color: C.m,
              }}>
                {VIS_LABEL[d.visibility]}
              </span>
              {d.publiclyVisible && (
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 999,
                  background: "rgba(46,213,115,.10)", border: `1px solid rgba(46,213,115,.35)`, color: "#2ED573",
                }}>
                  Public
                </span>
              )}
              {d.division && (
                <span style={{ fontSize: 11, color: C.m }}>{d.division.name}</span>
              )}
              <span style={{ fontSize: 11, color: C.m, marginLeft: "auto" }}>
                {formatBytes(d.fileSize)} · {formatDate(d.createdAt)}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{d.title}</div>
            {d.description && (
              <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>{d.description}</div>
            )}
          </button>
        ))}
      </div>

      {docs.length === 0 && !busy && (
        <div style={{ padding: 32, textAlign: "center", color: C.m, fontSize: 13, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 16 }}>
          No documents yet. <a onClick={() => router.push("/admin/documents/new")} style={{ color: C.white, cursor: "pointer", textDecoration: "underline" }}>Upload the first one →</a>
        </div>
      )}
    </main>
  );
}
