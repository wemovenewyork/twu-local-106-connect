"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

type Visibility = "all" | "division" | "subUnit" | "selfOnly";

interface Doc {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  visibility: Visibility;
  divisionId: string | null;
  subUnitId: string | null;
  ownerUserId: string | null;
  uploaderId: string;
  createdAt: string;
  updatedAt: string;
  division?: { id: string; code: string; name: string } | null;
  subUnit?: { id: string; code: string; name: string } | null;
  uploader?: { id: string; firstName: string; lastName: string };
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ document: Doc; canManage: boolean }>(`/admin/documents/${id}`)
      .then(r => { setDoc(r.document); setCanManage(r.canManage); })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id, user]);

  const onDelete = async () => {
    if (!doc) return;
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.del(`/admin/documents/${doc.id}`);
      router.replace("/documents");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setBusy(false);
    }
  };

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (error) {
    return (
      <main style={{ padding: "40px 24px", maxWidth: 720, margin: "0 auto", color: C.m, textAlign: "center" }}>
        <div style={{ fontSize: 18, color: C.white, fontWeight: 700, marginBottom: 8 }}>Document not found</div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>{error}</div>
        <button onClick={() => router.push("/documents")} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.white, fontSize: 13, cursor: "pointer" }}>
          Back to Documents
        </button>
      </main>
    );
  }
  if (!doc) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;

  const scopeLabel =
    doc.visibility === "all"
      ? "All Members"
      : doc.visibility === "division"
      ? `Division: ${doc.division?.name ?? "—"}`
      : doc.visibility === "subUnit"
      ? `Sub-Unit: ${doc.subUnit?.name ?? "—"}`
      : "Personal (private)";

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <button onClick={() => router.push("/documents")} style={{ padding: "6px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer", marginBottom: 18 }}>
        ← Documents
      </button>

      <div style={{ fontSize: 11, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
        {scopeLabel}
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 8 }}>
        {doc.title}
      </h1>
      <div style={{ fontSize: 12, color: C.m, marginBottom: 24 }}>
        Uploaded by {doc.uploader ? `${doc.uploader.firstName} ${doc.uploader.lastName}` : "—"} on {formatDate(doc.createdAt)}
        {doc.fileSize ? ` · ${formatSize(doc.fileSize)}` : ""}
      </div>

      {doc.description && (
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.85)", lineHeight: 1.6, marginBottom: 24 }}>
          {doc.description}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: C.gold, color: C.bg, fontWeight: 800, fontSize: 13, textDecoration: "none" }}
        >
          Download
        </a>
        {canManage && (
          <button
            onClick={onDelete}
            disabled={busy}
            style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.red}55`, background: "transparent", color: C.red, fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 }}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </main>
  );
}
