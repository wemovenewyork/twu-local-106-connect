"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { Division } from "@/types";

const ALLOWED_ACCEPT = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp";

type Visibility = "all" | "division" | "subUnit" | "selfOnly";

interface SubUnitLite {
  id: string;
  code: string;
  name: string;
  divisionId: string;
}

export default function NewDocumentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("selfOnly");
  const [divisionId, setDivisionId] = useState<string>("");
  const [subUnitId, setSubUnitId] = useState<string>("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subUnits, setSubUnits] = useState<SubUnitLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const isLocalSuper = !!user && (user.role === "localAdmin" || user.role === "superAdmin");
  const isDivisionAdmin = !!user && user.role === "divisionAdmin";
  const isAdminTier = !!user && ["divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);
  const maxMb = isAdminTier ? 25 : 10;

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  // Default division for division/subUnit visibility — auto-fill caller's division.
  useEffect(() => {
    if (!user) return;
    if ((visibility === "division" || visibility === "subUnit") && !divisionId) {
      if (user.divisionId) setDivisionId(user.divisionId);
    }
  }, [visibility, user, divisionId]);

  const subUnitOptions = useMemo(() => {
    if (!divisionId) return [];
    return subUnits.filter(su => su.divisionId === divisionId);
  }, [subUnits, divisionId]);

  const onFileChange = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > maxMb * 1024 * 1024) {
      setBanner({ kind: "err", text: `File too large (max ${maxMb}MB)` });
      setFile(null);
      return;
    }
    setBanner(null);
    setFile(f);
  };

  const submit = async () => {
    setBanner(null);
    if (!title.trim()) { setBanner({ kind: "err", text: "Title is required" }); return; }
    if (!file) { setBanner({ kind: "err", text: "File is required" }); return; }
    if (visibility === "division" && !divisionId) {
      setBanner({ kind: "err", text: "Division is required" }); return;
    }
    if (visibility === "subUnit" && !subUnitId) {
      setBanner({ kind: "err", text: "Sub-unit is required" }); return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      fd.append("visibility", visibility);
      if (visibility === "division") fd.append("divisionId", divisionId);
      if (visibility === "subUnit") {
        fd.append("subUnitId", subUnitId);
        // Also include divisionId for redundancy / future filters
        const sub = subUnits.find(s => s.id === subUnitId);
        if (sub) fd.append("divisionId", sub.divisionId);
      }

      const res = await fetch("/api/admin/documents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error ?? "Upload failed");
      }
      const data = await res.json();
      setBanner({ kind: "ok", text: "Document uploaded" });
      router.replace(`/documents/${data.document.id}`);
    } catch (e) {
      setBanner({ kind: "err", text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={() => router.push("/documents")} style={{ padding: "6px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer" }}>
          ← Documents
        </button>
        <div style={{ fontSize: 12, color: C.m }}>Max {maxMb}MB</div>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 4 }}>Upload Document</h1>
      <div style={{ fontSize: 12, color: C.m, marginBottom: 20 }}>
        PDF, DOCX, XLSX, PNG, JPEG, or WebP.
      </div>

      {banner && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13, background: banner.kind === "ok" ? "rgba(46,213,115,.10)" : "rgba(173,27,39,.10)", border: `1px solid ${banner.kind === "ok" ? "rgba(46,213,115,.35)" : "rgba(173,27,39,.35)"}`, color: banner.kind === "ok" ? "#9CECB4" : C.red }}>
          {banner.text}
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Title">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Document title"
            style={inputStyle}
          />
        </Field>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Short description shown in listings"
            style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
          />
        </Field>

        <Field label="Visibility">
          <select
            value={visibility}
            onChange={e => {
              const v = e.target.value as Visibility;
              setVisibility(v);
              if (v !== "subUnit") setSubUnitId("");
            }}
            style={inputStyle}
          >
            <option value="selfOnly">Personal (only you)</option>
            {(isLocalSuper || isDivisionAdmin) && <option value="division">Division</option>}
            {(isLocalSuper || isDivisionAdmin) && <option value="subUnit">Sub-Unit</option>}
            {isLocalSuper && <option value="all">All Members</option>}
          </select>
        </Field>

        {visibility === "division" && (
          <Field label="Division">
            <select
              value={divisionId}
              onChange={e => setDivisionId(e.target.value)}
              disabled={isDivisionAdmin && !isLocalSuper}
              style={inputStyle}
            >
              <option value="">Select…</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        )}

        {visibility === "subUnit" && (
          <>
            <Field label="Division">
              <select
                value={divisionId}
                onChange={e => { setDivisionId(e.target.value); setSubUnitId(""); }}
                disabled={isDivisionAdmin && !isLocalSuper}
                style={inputStyle}
              >
                <option value="">Select…</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sub-Unit">
              <select value={subUnitId} onChange={e => setSubUnitId(e.target.value)} style={inputStyle}>
                <option value="">Select…</option>
                {subUnitOptions.map(su => (
                  <option key={su.id} value={su.id}>{su.name}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label="File">
          <input
            type="file"
            accept={ALLOWED_ACCEPT}
            onChange={e => onFileChange(e.target.files?.[0] ?? null)}
            style={{ ...inputStyle, padding: 8 }}
          />
          {file && (
            <div style={{ marginTop: 6, fontSize: 12, color: C.m }}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </div>
          )}
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
          <button
            onClick={() => router.push("/documents")}
            disabled={busy}
            style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.white, fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim() || !file}
            style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: C.gold, color: C.bg, fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy || !title.trim() || !file ? 0.5 : 1 }}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.m, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 14,
  color: C.white,
  background: "rgba(255,255,255,.03)",
  border: `1px solid ${C.bd}`,
  borderRadius: 10,
};
