"use client";

import { useEffect, useMemo, useState } from "react";
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
  visibility: Visibility;
  divisionId: string | null;
  subUnitId: string | null;
  ownerUserId: string | null;
  uploaderId: string;
  createdAt: string;
  division?: { id: string; code: string; name: string } | null;
  subUnit?: { id: string; code: string; name: string } | null;
  uploader?: { id: string; firstName: string; lastName: string };
}

const VISIBILITY_GROUPS: { key: Visibility; label: string }[] = [
  { key: "all", label: "All Members" },
  { key: "division", label: "Division" },
  { key: "subUnit", label: "Sub-Unit" },
  { key: "selfOnly", label: "Your Documents" },
];

function fileIcon(mime: string | null): string {
  if (!mime) return "📄";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("wordprocessingml")) return "📝";
  if (mime.includes("spreadsheetml")) return "📊";
  if (mime.startsWith("image/")) return "🖼️";
  return "📄";
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    api.get<{ documents: DocLite[] }>("/admin/documents")
      .then(r => setDocs(r.documents))
      .catch(e => setErrorMsg(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  }, [user]);

  const grouped = useMemo(() => {
    const out: Record<Visibility, DocLite[]> = { all: [], division: [], subUnit: [], selfOnly: [] };
    for (const d of docs) out[d.visibility].push(d);
    return out;
  }, [docs]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Documents</h1>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>
            Forms, schedules, and union resources
          </div>
        </div>
        <button
          onClick={() => router.push("/admin/documents/new")}
          style={{ padding: "8px 14px", borderRadius: 10, background: C.gold, border: "none", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
        >
          + Upload
        </button>
      </div>

      {errorMsg && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13, background: "rgba(173,27,39,.10)", border: `1px solid rgba(173,27,39,.35)`, color: C.red }}>
          {errorMsg}
        </div>
      )}

      {busy && <div style={{ color: C.m, fontSize: 13, marginBottom: 12 }}>Loading…</div>}

      {VISIBILITY_GROUPS.map(g => {
        const items = grouped[g.key];
        if (items.length === 0) return null;
        return (
          <section key={g.key} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
              {g.label} ({items.length})
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {items.map(d => (
                <DocCard key={d.id} doc={d} onClick={() => router.push(`/documents/${d.id}`)} />
              ))}
            </div>
          </section>
        );
      })}

      {docs.length === 0 && !busy && (
        <div style={{ padding: 32, textAlign: "center", color: C.m, fontSize: 13, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 16 }}>
          No documents yet.{" "}
          <a onClick={() => router.push("/admin/documents/new")} style={{ color: C.white, cursor: "pointer", textDecoration: "underline" }}>
            Upload the first one →
          </a>
        </div>
      )}
    </main>
  );
}

function DocCard({ doc, onClick }: { doc: DocLite; onClick: () => void }) {
  const scopeLabel =
    doc.visibility === "all"
      ? "All Members"
      : doc.visibility === "division"
      ? doc.division?.name ?? "Division"
      : doc.visibility === "subUnit"
      ? doc.subUnit?.name ?? "Sub-Unit"
      : "Personal";

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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>{fileIcon(doc.mimeType)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: C.m, marginBottom: 2 }}>
            {scopeLabel}
            {doc.fileSize ? ` · ${formatSize(doc.fileSize)}` : ""}
            {` · ${formatDate(doc.createdAt)}`}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.title}
          </div>
          {doc.description && (
            <div style={{ fontSize: 12, color: C.m, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {doc.description}
            </div>
          )}
          <div style={{ fontSize: 11, color: C.m, marginTop: 6 }}>
            Uploaded by {doc.uploader ? `${doc.uploader.firstName} ${doc.uploader.lastName}` : "—"}
          </div>
        </div>
      </div>
    </button>
  );
}
