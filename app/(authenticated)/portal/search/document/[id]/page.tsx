"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import MemberPortalHeader from "@/components/ui/MemberPortalHeader";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";

interface DocumentDetail {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string | null;
  documentType: string;
  division?: { id: string; code: string; name: string } | null;
}

export default function ContractViewerPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    api.get<{ document: DocumentDetail }>(`/admin/documents/${id}`)
      .then(r => {
        if (r.document.documentType !== "contract") {
          setError("Not found");
          return;
        }
        setDoc(r.document);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user, id]);

  if (loading || !user) return null;

  const backHref = q ? `/portal/search?q=${encodeURIComponent(q)}` : "/portal/search";

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg }}>
        <MemberPortalHeader>
          <NotifIcon />
          <InboxIcon />
        </MemberPortalHeader>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white }}>Document not found</h1>
          <p style={{ fontSize: 13, color: C.m, marginTop: 8, marginBottom: 16 }}>
            This document is unavailable, has been removed, or isn&apos;t a searchable contract.
          </p>
          <button
            onClick={() => router.push(backHref)}
            style={{ padding: "10px 16px", borderRadius: 12, background: C.gold, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
          >
            ← Back to search
          </button>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <MemberPortalHeader>
        <NotifIcon />
        <InboxIcon />
      </MemberPortalHeader>

      {/* Sub-header: back link + title + open-in-new-tab */}
      <div style={{ position: "sticky", top: 56, zIndex: 99, background: "rgba(26,31,77,.85)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.bd}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => router.push(backHref)}
          aria-label="Back to search"
          style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <Icon n="back" s={15} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc?.title ?? "Loading…"}
          </div>
          {doc?.division?.name && (
            <div style={{ fontSize: 10, color: C.m }}>{doc.division.name}</div>
          )}
        </div>
        {doc && (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 }}
          >
            Open ↗
          </a>
        )}
      </div>

      {/* PDF iframe */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {doc ? (
          <iframe
            src={doc.fileUrl}
            title={doc.title}
            style={{ width: "100%", height: "calc(100vh - 56px - 50px)", border: "none", background: "#1A1F4D", display: "block" }}
          />
        ) : (
          <div style={{ padding: 24, color: C.m, fontSize: 13 }}>Loading document…</div>
        )}
      </div>
    </div>
  );
}
