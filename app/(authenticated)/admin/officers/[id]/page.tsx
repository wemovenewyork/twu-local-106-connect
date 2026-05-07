"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { Officer, OfficerScope, Division } from "@/types";

const SCOPE_OPTIONS: { value: OfficerScope; label: string }[] = [
  { value: "local", label: "Local — represents the whole local" },
  { value: "division", label: "Division — represents one division" },
  { value: "staff", label: "Staff — admin / support" },
];

export default function OfficerEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isNew = id === "new";

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<OfficerScope>("local");
  const [divisionId, setDivisionId] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState<string>("0");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactFormEnabled, setContactFormEnabled] = useState(true);
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [active, setActive] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemove, setPhotoRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAuthorized = !!user && (user.role === "localAdmin" || user.role === "superAdmin");

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    api.get<Division[]>("/divisions").then(setDivisions).catch(() => {});
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || isNew) return;
    api.get<{ officer: Officer }>(`/admin/officers/${id}`)
      .then(r => {
        const o = r.officer;
        setOfficer(o);
        setName(o.name);
        setTitle(o.title);
        setScope(o.scope);
        setDivisionId(o.divisionId ?? "");
        setDisplayOrder(String(o.displayOrder));
        setBio(o.bio ?? "");
        setContactEmail(o.contactEmail ?? "");
        setContactFormEnabled(o.contactFormEnabled);
        setTermStart(o.termStart ? o.termStart.slice(0, 10) : "");
        setTermEnd(o.termEnd ? o.termEnd.slice(0, 10) : "");
        setActive(o.active);
      })
      .catch(e => setBanner({ kind: "err", text: e instanceof Error ? e.message : "Failed to load" }));
  }, [id, isNew, isAuthorized]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (!isAuthorized) return null;

  const showError = (e: unknown) =>
    setBanner({ kind: "err", text: e instanceof Error ? e.message : "Action failed" });

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("title", title.trim());
    fd.append("scope", scope);
    fd.append("divisionId", scope === "division" ? divisionId : "");
    fd.append("displayOrder", displayOrder || "0");
    fd.append("bio", bio.trim());
    fd.append("contactEmail", contactEmail.trim());
    fd.append("contactFormEnabled", contactFormEnabled ? "true" : "false");
    fd.append("active", active ? "true" : "false");
    fd.append("termStart", termStart);
    fd.append("termEnd", termEnd);
    if (photoFile) fd.append("photo", photoFile);
    if (photoRemove && !photoFile) fd.append("photoRemove", "true");
    return fd;
  };

  const submitMultipart = async (path: string, method: "POST" | "PATCH"): Promise<Response> => {
    return fetch(`/api${path}`, {
      method,
      body: buildFormData(),
      credentials: "include",
    });
  };

  const save = async () => {
    if (!name.trim() || !title.trim()) {
      setBanner({ kind: "err", text: "Name and title are required" }); return;
    }
    if (scope === "division" && !divisionId) {
      setBanner({ kind: "err", text: "Division is required for division-scope officers" }); return;
    }
    setBusy(true); setBanner(null);
    try {
      let res: Response;
      if (isNew) {
        res = await submitMultipart("/admin/officers", "POST");
      } else {
        res = await submitMultipart(`/admin/officers/${id}`, "PATCH");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(body.error ?? "Save failed");
      }
      const data = await res.json();
      setOfficer(data.officer);
      setPhotoFile(null);
      setPhotoRemove(false);
      setBanner({ kind: "ok", text: "Saved" });
      if (isNew) router.replace(`/admin/officers/${data.officer.id}`);
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this officer? This cannot be undone.")) return;
    setBusy(true); setBanner(null);
    try {
      await api.del(`/admin/officers/${id}`);
      router.replace("/admin/officers");
    } catch (e) { showError(e); setBusy(false); }
  };

  const currentPhotoUrl = photoFile
    ? URL.createObjectURL(photoFile)
    : photoRemove ? null : (officer?.photoUrl ?? null);

  return (
    <main style={{ minHeight: "100vh", padding: "20px 16px 60px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => router.push("/admin/officers")} style={btnGhost(false)}>
          ← Officers
        </button>
        <div style={{ fontSize: 12, color: C.m }}>
          {isNew ? "New officer" : <>Editing <strong style={{ color: C.white }}>{officer?.name ?? "…"}</strong></>}
        </div>
      </div>

      {banner && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontSize: 13, background: banner.kind === "ok" ? "rgba(46,213,115,.10)" : "rgba(173,27,39,.10)", border: `1px solid ${banner.kind === "ok" ? "rgba(46,213,115,.35)" : "rgba(173,27,39,.35)"}`, color: banner.kind === "ok" ? "#9CECB4" : C.red }}>
          {banner.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, marginBottom: 16 }}>
        <div>
          <div style={fieldLabel}>Photo</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {currentPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentPhotoUrl} alt="" style={{ width: 160, height: 160, borderRadius: "50%", objectFit: "cover", border: `1px solid ${C.bd}` }} />
            ) : (
              <div style={{ width: 160, height: 160, borderRadius: "50%", background: "#1A1F4D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 36, border: `1px solid ${C.bd}` }}>
                {(name || "?").split(/\s+/).slice(0, 2).map(s => s[0] ?? "").join("").toUpperCase()}
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={e => { setPhotoFile(e.target.files?.[0] ?? null); setPhotoRemove(false); }}
              style={{ width: "100%", fontSize: 11, color: C.m }}
            />
            {(officer?.photoUrl || photoFile) && (
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoRemove(true); }}
                style={{ ...btnGhost(busy), fontSize: 11, padding: "6px 10px" }}
              >
                Remove photo
              </button>
            )}
            <div style={{ fontSize: 10, color: C.m, textAlign: "center" }}>PNG / JPEG / WebP. Max 5MB.</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={fieldLabel}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., President, Vice President, MaBSTOA Chair" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Scope</label>
              <select value={scope} onChange={e => setScope(e.target.value as OfficerScope)} style={inputStyle}>
                {SCOPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {scope === "division" && (
              <div>
                <label style={fieldLabel}>Division</label>
                <select value={divisionId} onChange={e => setDivisionId(e.target.value)} style={inputStyle}>
                  <option value="">— Select division —</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label style={fieldLabel}>Display order</label>
              <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Contact email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="officer@example.com" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Term start</label>
              <input type="date" value={termStart} onChange={e => setTermStart(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabel}>Term end</label>
              <input type="date" value={termEnd} onChange={e => setTermEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.white, cursor: "pointer" }}>
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              Active (visible on public Leadership page)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.white, cursor: "pointer" }}>
              <input type="checkbox" checked={contactFormEnabled} onChange={e => setContactFormEnabled(e.target.checked)} />
              Contact form enabled
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={fieldLabel}>Bio (markdown) — {bio.length} chars</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={10}
            placeholder="Short biographical note in markdown…"
            style={{ ...inputStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", minHeight: 220, resize: "vertical" }}
          />
        </div>
        <div>
          <label style={fieldLabel}>Preview</label>
          <div className="markdown-body" style={{ padding: 14, fontSize: 14, lineHeight: 1.6, color: C.white, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 10, minHeight: 220 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{bio || "*Bio preview*"}</ReactMarkdown>
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
          {busy ? "Saving…" : isNew ? "Create Officer" : "Save Changes"}
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
