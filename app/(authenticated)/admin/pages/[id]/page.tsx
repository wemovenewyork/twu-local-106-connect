"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { Page } from "@/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isNew = id === "new";

  const [page, setPage] = useState<Page | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAuthorized = !!user && (user.role === "localAdmin" || user.role === "superAdmin");

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized || isNew) return;
    api.get<{ page: Page }>(`/admin/pages/${id}`)
      .then(r => {
        setPage(r.page);
        setSlug(r.page.slug);
        setTitle(r.page.title);
        setBodyMd(r.page.body);
        setMetaDescription(r.page.metaDescription ?? "");
        setPublished(r.page.published);
      })
      .catch(e => setBanner({ kind: "err", text: e instanceof Error ? e.message : "Failed to load" }));
  }, [id, isNew, isAuthorized]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (!isAuthorized) return null;

  const showError = (e: unknown) =>
    setBanner({ kind: "err", text: e instanceof Error ? e.message : "Action failed" });

  const slugError = slug && !SLUG_RE.test(slug) ? "Slug must be lowercase letters, digits, and single hyphens (e.g., 'mission-statement')" : null;
  const metaLeft = 160 - metaDescription.length;

  const save = async () => {
    if (!title.trim()) { setBanner({ kind: "err", text: "Title is required" }); return; }
    if (!slug.trim()) { setBanner({ kind: "err", text: "Slug is required" }); return; }
    if (slugError) { setBanner({ kind: "err", text: slugError }); return; }
    setBusy(true); setBanner(null);
    try {
      const payload = { slug: slug.trim(), title: title.trim(), bodyMd, metaDescription: metaDescription.trim(), published };
      if (isNew) {
        const r = await api.post<{ page: Page }>("/admin/pages", payload);
        setBanner({ kind: "ok", text: "Page created" });
        router.replace(`/admin/pages/${r.page.id}`);
      } else {
        const r = await api.patch<{ page: Page }>(`/admin/pages/${id}`, payload);
        setPage(r.page);
        setBanner({ kind: "ok", text: "Saved" });
      }
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setBusy(true); setBanner(null);
    try {
      await api.del(`/admin/pages/${id}`);
      router.replace("/admin/pages");
    } catch (e) { showError(e); setBusy(false); }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "20px 16px 60px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => router.push("/admin/pages")} style={btnGhost(false)}>
          ← Pages
        </button>
        <div style={{ fontSize: 12, color: C.m }}>
          {isNew ? "New page" : <>Editing <code style={{ color: C.white }}>/{page?.slug ?? "…"}</code></>}
        </div>
      </div>

      {banner && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13, background: banner.kind === "ok" ? "rgba(46,213,115,.10)" : "rgba(173,27,39,.10)", border: `1px solid ${banner.kind === "ok" ? "rgba(46,213,115,.35)" : "rgba(173,27,39,.35)"}`, color: banner.kind === "ok" ? "#9CECB4" : C.red }}>
          {banner.text}
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Page title" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
          <div>
            <label style={fieldLabel}>Slug — public URL</label>
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} placeholder="mission-statement" style={inputStyle} />
            <div style={{ fontSize: 11, color: slugError ? C.red : C.m, marginTop: 4 }}>
              {slugError ?? `Public URL: /${slug || "<slug>"}`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.white, cursor: "pointer", padding: "10px 14px", border: `1px solid ${C.bd}`, borderRadius: 10, background: "rgba(255,255,255,.03)" }}>
              <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
              Published
            </label>
          </div>
        </div>
        <div>
          <label style={fieldLabel}>
            Meta description <span style={{ color: metaLeft < 0 ? C.red : C.m }}>({metaLeft} chars left)</span>
          </label>
          <input
            value={metaDescription}
            onChange={e => setMetaDescription(e.target.value.slice(0, 200))}
            placeholder="One-line description for SEO (~160 chars max)"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "stretch" }}>
        <div>
          <label style={fieldLabel}>Body (markdown) — {bodyMd.length} chars</label>
          <textarea
            value={bodyMd}
            onChange={e => setBodyMd(e.target.value)}
            rows={22}
            placeholder="# Heading&#10;&#10;Body text in **markdown**…"
            style={{ ...inputStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", minHeight: 360, resize: "vertical" }}
          />
        </div>
        <div>
          <label style={fieldLabel}>Preview</label>
          <div className="markdown-body" style={{ padding: 14, fontSize: 14, lineHeight: 1.6, color: C.white, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 10, minHeight: 360 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMd || "*Preview will appear here.*"}</ReactMarkdown>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
        {!isNew && (
          <button onClick={remove} disabled={busy} style={btnDanger(busy)}>
            Delete
          </button>
        )}
        <button onClick={save} disabled={busy} style={btnPrimary(busy)}>
          {busy ? "Saving…" : isNew ? "Create Page" : "Save Changes"}
        </button>
      </div>
    </main>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: C.m,
  marginBottom: 6, letterSpacing: 1, textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 14, color: C.white,
  background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, borderRadius: 10,
};

function btnPrimary(busy: boolean): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: "none", background: C.gold, color: C.bg, fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 };
}
function btnGhost(busy: boolean): React.CSSProperties {
  return { padding: "6px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 };
}
function btnDanger(busy: boolean): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.red}55`, background: "transparent", color: C.red, fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 };
}
