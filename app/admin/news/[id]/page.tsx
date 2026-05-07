"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { News, NewsStatus, Division } from "@/types";
import { isLocalOrSuperAdmin } from "@/lib/permissions";

const STATUS_LABEL: Record<NewsStatus, string> = {
  draft: "Draft",
  inReview: "In Review",
  published: "Published",
  archived: "Archived",
};

export default function NewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isNew = id === "new";

  const [news, setNews] = useState<News | null>(null);
  const [canManage, setCanManage] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [divisionId, setDivisionId] = useState<string | null>("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAuthorized = !!user && ["editor", "divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    api.get<Division[]>("/divisions").then(setDivisions).catch(() => {});
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || isNew) return;
    api.get<{ news: News; canManage: boolean }>(`/admin/news/${id}`)
      .then(r => {
        setNews(r.news);
        setCanManage(r.canManage);
        setTitle(r.news.title);
        setBody(r.news.body);
        setDivisionId(r.news.divisionId);
      })
      .catch(e => setBanner({ kind: "err", text: e instanceof Error ? e.message : "Failed to load" }));
  }, [id, isNew, isAuthorized]);

  // Default division for new posts: caller's division.
  useEffect(() => {
    if (isNew && user && divisionId === "" && divisions.length > 0) {
      setDivisionId(user.divisionId ?? null);
    }
  }, [isNew, user, divisionId, divisions]);

  const status: NewsStatus = news?.status ?? "draft";
  const isAuthor = !!news && !!user && news.authorId === user.id;
  const isAdminTier = !!user && ["divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);
  const canEdit = useMemo(() => {
    if (isNew) return true;
    if (!canManage) return false;
    if (status === "draft") return isAuthor;
    if (status === "inReview") return !isAuthor && isAdminTier;
    return false;
  }, [isNew, canManage, status, isAuthor, isAdminTier]);

  const canSetAllDivisions = !!user && isLocalOrSuperAdmin(user);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (!isAuthorized) return null;

  const showError = (e: unknown) =>
    setBanner({ kind: "err", text: e instanceof Error ? e.message : "Action failed" });

  const saveDraft = async () => {
    setBusy(true); setBanner(null);
    try {
      if (isNew) {
        const created = await api.post<{ news: News }>(`/admin/news`, {
          title, body, divisionId,
        });
        setBanner({ kind: "ok", text: "Draft saved" });
        router.replace(`/admin/news/${created.news.id}`);
      } else {
        const r = await api.patch<{ news: News }>(`/admin/news/${id}`, {
          title, body, divisionId,
        });
        setNews(r.news);
        setBanner({ kind: "ok", text: "Draft saved" });
      }
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  };

  const submitForReview = async () => {
    setBusy(true); setBanner(null);
    try {
      let workingId = id;
      if (isNew) {
        const created = await api.post<{ news: News }>(`/admin/news`, { title, body, divisionId });
        workingId = created.news.id;
      } else {
        await api.patch(`/admin/news/${id}`, { title, body, divisionId });
      }
      const r = await api.patch<{ news: News }>(`/admin/news/${workingId}`, { action: "submitForReview" });
      setNews(r.news);
      setBanner({ kind: "ok", text: "Submitted for review" });
      if (isNew) router.replace(`/admin/news/${workingId}`);
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  };

  const transition = async (action: "approveAndPublish" | "sendBackToDraft" | "archive" | "restore") => {
    setBusy(true); setBanner(null);
    try {
      // For approveAndPublish or sendBackToDraft, also persist any edits made.
      if ((action === "approveAndPublish" || action === "sendBackToDraft") && !isNew) {
        await api.patch(`/admin/news/${id}`, { title, body, divisionId });
      }
      const r = await api.patch<{ news: News }>(`/admin/news/${id}`, { action });
      setNews(r.news);
      setBanner({ kind: "ok", text: `Status: ${STATUS_LABEL[r.news.status]}` });
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  };

  const deleteDraft = async () => {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    setBusy(true); setBanner(null);
    try {
      await api.del(`/admin/news/${id}`);
      router.replace("/admin/news");
    } catch (e) { showError(e); setBusy(false); }
  };

  const charCount = body.length;
  const titleLeft = 200 - title.length;

  return (
    <main style={{ minHeight: "100vh", padding: "20px 16px 60px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => router.push("/admin/news")} style={{ padding: "6px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer" }}>
          ← News
        </button>
        <div style={{ fontSize: 12, color: C.m }}>
          Status: <strong style={{ color: C.white }}>{STATUS_LABEL[status]}</strong>
          {news?.author && <> · by {news.author.firstName} {news.author.lastName}</>}
        </div>
      </div>

      {banner && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13, background: banner.kind === "ok" ? "rgba(46,213,115,.10)" : "rgba(173,27,39,.10)", border: `1px solid ${banner.kind === "ok" ? "rgba(46,213,115,.35)" : "rgba(173,27,39,.35)"}`, color: banner.kind === "ok" ? "#9CECB4" : C.red }}>
          {banner.text}
        </div>
      )}

      {!isNew && status === "inReview" && isAuthor && (
        <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13, background: "rgba(217,119,6,.10)", border: `1px solid rgba(217,119,6,.35)`, color: "#FBBF24" }}>
          Awaiting review by another admin. You can&apos;t edit or approve your own post.
        </div>
      )}

      {!isNew && !canManage && (
        <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, color: C.m }}>
          Read-only — this post is outside your division. You can view it but not edit or change its status.
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.m, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
            Title <span style={{ color: titleLeft < 0 ? C.red : C.m }}>({titleLeft})</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!canEdit}
            maxLength={200}
            placeholder="News title"
            style={{ width: "100%", padding: "10px 14px", fontSize: 15, fontWeight: 700, color: C.white, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, borderRadius: 10 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.m, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
            Audience
          </label>
          <select
            value={divisionId === null ? "__all__" : divisionId ?? ""}
            disabled={!canEdit}
            onChange={e => {
              const v = e.target.value;
              if (v === "__all__") setDivisionId(null);
              else setDivisionId(v);
            }}
            style={{ width: "100%", padding: "10px 14px", fontSize: 13, color: C.white, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, borderRadius: 10 }}
          >
            {canSetAllDivisions && <option value="__all__">All Divisions</option>}
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "stretch" }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.m, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
            Body (markdown) — {charCount} chars
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={!canEdit}
            rows={22}
            placeholder="# Heading&#10;&#10;Body text in **markdown**…"
            style={{ width: "100%", padding: 14, fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: C.white, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, borderRadius: 10, resize: "vertical", minHeight: 360 }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.m, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
            Preview
          </label>
          <div className="markdown-body" style={{ padding: 14, fontSize: 14, lineHeight: 1.6, color: C.white, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 10, minHeight: 360 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || "*Preview will appear here.*"}</ReactMarkdown>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
        {(isNew || status === "draft") && canEdit && (
          <>
            <button onClick={saveDraft} disabled={busy || !title.trim() || !body.trim()} style={btnSecondary(busy)}>
              {busy ? "Saving…" : "Save Draft"}
            </button>
            <button onClick={submitForReview} disabled={busy || !title.trim() || !body.trim()} style={btnPrimary(busy)}>
              {busy ? "…" : "Submit for Review"}
            </button>
            {!isNew && (
              <button onClick={deleteDraft} disabled={busy} style={btnDanger(busy)}>
                Delete Draft
              </button>
            )}
          </>
        )}
        {status === "inReview" && !isAuthor && canEdit && (
          <>
            <button onClick={() => transition("sendBackToDraft")} disabled={busy} style={btnSecondary(busy)}>
              Send Back to Draft
            </button>
            <button onClick={() => transition("approveAndPublish")} disabled={busy} style={btnPrimary(busy)}>
              Approve &amp; Publish
            </button>
          </>
        )}
        {status === "published" && (
          <button onClick={() => transition("archive")} disabled={busy} style={btnSecondary(busy)}>
            Archive
          </button>
        )}
        {status === "archived" && (
          <button onClick={() => transition("restore")} disabled={busy} style={btnSecondary(busy)}>
            Restore to Draft
          </button>
        )}
      </div>
    </main>
  );
}

function btnPrimary(busy: boolean): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: "none", background: C.gold, color: C.bg, fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 };
}
function btnSecondary(busy: boolean): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.white, fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 };
}
function btnDanger(busy: boolean): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.red}55`, background: "transparent", color: C.red, fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 };
}
