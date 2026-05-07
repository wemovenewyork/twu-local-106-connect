"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { Division } from "@/types";

type Visibility = "all" | "division" | "subUnit" | "selfOnly";

interface SubUnitLite {
  id: string;
  code: string;
  name: string;
  divisionId: string;
}

interface DocFull {
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
  publiclyVisible: boolean;
  createdAt: string;
  updatedAt: string;
  division?: { id: string; code: string; name: string } | null;
  subUnit?: { id: string; code: string; name: string } | null;
  uploader?: { id: string; firstName: string; lastName: string };
}

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [doc, setDoc] = useState<DocFull | null>(null);
  const [canManage, setCanManage] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subUnits, setSubUnits] = useState<SubUnitLite[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("division");
  const [divisionId, setDivisionId] = useState<string>("");
  const [subUnitId, setSubUnitId] = useState<string>("");
  const [publiclyVisible, setPubliclyVisible] = useState(false);

  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAuthorized = !!user && ["divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);
  const isLocalSuper = !!user && (user.role === "localAdmin" || user.role === "superAdmin");

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    type DivisionWithSubs = Division & { subUnits?: { id: string; code: string; name: string }[] };
    api.get<DivisionWithSubs[]>("/divisions?withSubUnits=1")
      .then(divs => {
        setDivisions(divs);
        const flat: SubUnitLite[] = [];
        for (const d of divs) {
          for (const su of d.subUnits ?? []) {
            flat.push({ id: su.id, code: su.code, name: su.name, divisionId: d.id });
          }
        }
        setSubUnits(flat);
      })
      .catch(() => {});
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    api.get<{ document: DocFull; canManage: boolean }>(`/admin/documents/${id}`)
      .then(r => {
        setDoc(r.document);
        setCanManage(r.canManage);
        setTitle(r.document.title);
        setDescription(r.document.description ?? "");
        setVisibility(r.document.visibility);
        setDivisionId(r.document.divisionId ?? "");
        setSubUnitId(r.document.subUnitId ?? "");
        setPubliclyVisible(r.document.publiclyVisible);
      })
      .catch(e => setBanner({ kind: "err", text: e instanceof Error ? e.message : "Failed to load" }));
  }, [id, isAuthorized]);

  const subUnitOptions = useMemo(() => {
    if (!divisionId) return [];
    return subUnits.filter(su => su.divisionId === divisionId);
  }, [subUnits, divisionId]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (!isAuthorized) return null;

  const showError = (e: unknown) =>
    setBanner({ kind: "err", text: e instanceof Error ? e.message : "Action failed" });

  const save = async () => {
    if (!title.trim()) { setBanner({ kind: "err", text: "Title is required" }); return; }
    if (visibility === "division" && !divisionId) {
      setBanner({ kind: "err", text: "Division is required for division visibility" }); return;
    }
    if (visibility === "subUnit" && !subUnitId) {
      setBanner({ kind: "err", text: "Sub-unit is required for sub-unit visibility" }); return;
    }
    setBusy(true); setBanner(null);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        visibility,
        divisionId: visibility === "division" ? divisionId : (visibility === "subUnit" ? (subUnits.find(s => s.id === subUnitId)?.divisionId ?? null) : null),
        subUnitId: visibility === "subUnit" ? subUnitId : null,
      };
      if (isLocalSuper) payload.publiclyVisible = publiclyVisible;
      const r = await api.patch<{ document: DocFull; canManage: boolean }>(`/admin/documents/${id}`, payload);
      setDoc(r.document);
      setCanManage(r.canManage);
      setBanner({ kind: "ok", text: "Saved" });
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this document? The file will be removed from storage. This cannot be undone.")) return;
    setBusy(true); setBanner(null);
    try {
      await api.del(`/admin/documents/${id}`);
      router.replace("/admin/documents");
    } catch (e) { showError(e); setBusy(false); }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "20px 16px 60px", maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => router.push("/admin/documents")} style={btnGhost(false)}>
          ← Documents
        </button>
        <div style={{ fontSize: 12, color: C.m }}>
          {doc ? <>Editing <strong style={{ color: C.white }}>{doc.title}</strong></> : "Loading…"}
        </div>
      </div>

      {banner && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13, background: banner.kind === "ok" ? "rgba(46,213,115,.10)" : "rgba(173,27,39,.10)", border: `1px solid ${banner.kind === "ok" ? "rgba(46,213,115,.35)" : "rgba(173,27,39,.35)"}`, color: banner.kind === "ok" ? "#9CECB4" : C.red }}>
          {banner.text}
        </div>
      )}

      {!canManage && (
        <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, color: C.m }}>
          Read-only — this document is outside your scope.
        </div>
      )}

      {doc && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 16, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, fontSize: 12, color: C.m }}>
          <strong style={{ color: C.white }}>File:</strong>{" "}
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>
            Open {doc.mimeType ?? "file"} ({formatBytes(doc.fileSize)})
          </a>
          <div style={{ marginTop: 4, fontSize: 11 }}>
            To replace the file, delete this record and upload a new one.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={fieldLabel}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} disabled={!canManage} style={inputStyle} />
        </div>
        <div>
          <label style={fieldLabel}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!canManage}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
          />
        </div>
        <div>
          <label style={fieldLabel}>Visibility</label>
          <select
            value={visibility}
            disabled={!canManage}
            onChange={e => setVisibility(e.target.value as Visibility)}
            style={inputStyle}
          >
            {isLocalSuper && <option value="all">All members (any division)</option>}
            <option value="division">Division</option>
            <option value="subUnit">Sub-unit</option>
            <option value="selfOnly">Self only</option>
          </select>
        </div>

        {visibility === "division" && (
          <div>
            <label style={fieldLabel}>Division</label>
            <select value={divisionId} disabled={!canManage} onChange={e => setDivisionId(e.target.value)} style={inputStyle}>
              <option value="">— Select division —</option>
              {divisions.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
        )}

        {visibility === "subUnit" && (
          <>
            <div>
              <label style={fieldLabel}>Division</label>
              <select value={divisionId} disabled={!canManage} onChange={e => { setDivisionId(e.target.value); setSubUnitId(""); }} style={inputStyle}>
                <option value="">— Select division —</option>
                {divisions.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Sub-unit</label>
              <select value={subUnitId} disabled={!canManage || !divisionId} onChange={e => setSubUnitId(e.target.value)} style={inputStyle}>
                <option value="">— Select sub-unit —</option>
                {subUnitOptions.map(su => (<option key={su.id} value={su.id}>{su.name}</option>))}
              </select>
            </div>
          </>
        )}

        {isLocalSuper && (
          <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.02)" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: canManage ? "pointer" : "not-allowed" }}>
              <input type="checkbox" checked={publiclyVisible} disabled={!canManage} onChange={e => setPubliclyVisible(e.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ fontSize: 13, color: C.white, lineHeight: 1.5 }}>
                <strong style={{ display: "block", marginBottom: 2 }}>Publicly visible</strong>
                <span style={{ color: C.m, fontSize: 12 }}>
                  When enabled, this document appears on the public site at{" "}
                  <code>/resources/documents</code> and is downloadable without login.
                  Local/super admins only.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
        {canManage && (
          <button onClick={remove} disabled={busy} style={btnDanger(busy)}>
            Delete
          </button>
        )}
        {canManage && (
          <button onClick={save} disabled={busy} style={btnPrimary(busy)}>
            {busy ? "Saving…" : "Save Changes"}
          </button>
        )}
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
