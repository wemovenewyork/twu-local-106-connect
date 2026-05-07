"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

interface DivisionLite { id: string; code: string; name: string }
interface SubUnitLite { id: string; code: string; name: string }
interface RegistrationRow {
  id: string;
  status: "pending" | "approved" | "reassigned" | "rejected";
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; createdAt: string };
  declaredDivision: DivisionLite | null;
  declaredSubUnit: SubUnitLite | null;
}
interface DivisionWithSubUnits extends DivisionLite { subUnits?: SubUnitLite[] }

const STATUSES = ["pending", "approved", "reassigned", "rejected"] as const;
type Status = (typeof STATUSES)[number];

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RegistrationsAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [divisions, setDivisions] = useState<DivisionWithSubUnits[]>([]);
  const [statusTab, setStatusTab] = useState<Status>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionPanel, setActionPanel] = useState<{ id: string; mode: "reassign" | "reject" } | null>(null);
  const [reassignDivision, setReassignDivision] = useState("");
  const [reassignSubUnit, setReassignSubUnit] = useState("");
  const [reassignNote, setReassignNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [bannerMsg, setBannerMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAdmin = !!user && ["divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace("/");
  }, [user, loading, isAdmin, router]);

  const loadList = useMemo(() => async (status: Status) => {
    try {
      const data = await api.get<{ registrations: RegistrationRow[] }>(`/admin/registrations?status=${status}`);
      setRegistrations(data.registrations);
    } catch (e) {
      setBannerMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed to load registrations" });
    }
  }, []);

  useEffect(() => { if (isAdmin) loadList(statusTab); }, [isAdmin, statusTab, loadList]);

  useEffect(() => {
    if (!isAdmin || divisions.length) return;
    (async () => {
      try {
        const data = await api.get<DivisionWithSubUnits[]>("/divisions?withSubUnits=1");
        setDivisions(data);
      } catch { /* allow retry on action */ }
    })();
  }, [isAdmin, divisions.length]);

  if (loading || !user) {
    return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  }
  if (!isAdmin) return null;

  const reassignDivisionObj = divisions.find(d => d.code === reassignDivision);
  const reassignNeedsSubUnit = !!reassignDivisionObj?.subUnits?.length;

  const doAction = async (action: "approve" | "reassign" | "reject", reg: RegistrationRow) => {
    setBusy(reg.id);
    setBannerMsg(null);
    try {
      if (action === "approve") {
        await api.post(`/admin/registrations/${reg.id}/approve`, {});
        setBannerMsg({ kind: "ok", text: `${reg.user.firstName} ${reg.user.lastName} approved` });
      } else if (action === "reassign") {
        if (!reassignDivision) throw new Error("Select a target division");
        if (reassignNeedsSubUnit && !reassignSubUnit) throw new Error("Select a sub-unit");
        await api.post(`/admin/registrations/${reg.id}/reassign`, {
          newDivisionCode: reassignDivision,
          newSubUnitCode: reassignSubUnit || undefined,
          note: reassignNote || undefined,
        });
        setBannerMsg({ kind: "ok", text: `${reg.user.firstName} ${reg.user.lastName} reassigned` });
        setReassignDivision(""); setReassignSubUnit(""); setReassignNote("");
      } else {
        if (!rejectReason.trim()) throw new Error("Rejection reason required");
        await api.post(`/admin/registrations/${reg.id}/reject`, { reason: rejectReason });
        setBannerMsg({ kind: "ok", text: `${reg.user.firstName} ${reg.user.lastName} rejected` });
        setRejectReason("");
      }
      setActionPanel(null);
      await loadList(statusTab);
    } catch (e) {
      setBannerMsg({ kind: "err", text: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Registrations</h1>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>Review pending member registrations</div>
        </div>
        <button onClick={() => router.push("/admin")} style={{ padding: "8px 14px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer" }}>
          ← Admin
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: C.s, borderRadius: 12, padding: 4 }}>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusTab(s)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "capitalize",
              background: statusTab === s ? C.gold : "transparent",
              color: statusTab === s ? C.bg : C.m,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {bannerMsg && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13, background: bannerMsg.kind === "ok" ? "rgba(46,213,115,.10)" : "rgba(173,27,39,.10)", border: `1px solid ${bannerMsg.kind === "ok" ? "rgba(46,213,115,.35)" : "rgba(173,27,39,.35)"}`, color: bannerMsg.kind === "ok" ? "#9CECB4" : C.red }}>
          {bannerMsg.text}
        </div>
      )}

      {registrations.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: C.m, fontSize: 13, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 16 }}>
          No {statusTab} registrations.
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {registrations.map(reg => {
          const isOpen = actionPanel?.id === reg.id;
          return (
            <div key={reg.id} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>
                    {reg.user.firstName} {reg.user.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: C.m, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {reg.user.email}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 8 }}>
                    Declared: <strong style={{ color: C.white }}>{reg.declaredDivision?.name ?? "—"}</strong>
                    {reg.declaredSubUnit && <span style={{ color: C.m }}> / {reg.declaredSubUnit.name}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.m, marginTop: 4 }}>Submitted {formatAge(reg.createdAt)}</div>
                </div>
                {statusTab === "pending" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      disabled={busy === reg.id}
                      onClick={() => doAction("approve", reg)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: C.gold, color: C.bg, fontSize: 12, fontWeight: 700, opacity: busy === reg.id ? 0.5 : 1 }}
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy === reg.id}
                      onClick={() => { setActionPanel(isOpen && actionPanel?.mode === "reassign" ? null : { id: reg.id, mode: "reassign" }); setReassignDivision(""); setReassignSubUnit(""); setReassignNote(""); }}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.bd}`, cursor: "pointer", background: "transparent", color: C.m, fontSize: 12, fontWeight: 600 }}
                    >
                      Reassign
                    </button>
                    <button
                      disabled={busy === reg.id}
                      onClick={() => { setActionPanel(isOpen && actionPanel?.mode === "reject" ? null : { id: reg.id, mode: "reject" }); setRejectReason(""); }}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.red}55`, cursor: "pointer", background: "transparent", color: C.red, fontSize: 12, fontWeight: 600 }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {isOpen && actionPanel?.mode === "reassign" && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px dashed ${C.bd}` }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <select value={reassignDivision} onChange={e => { setReassignDivision(e.target.value); setReassignSubUnit(""); }}>
                      <option value="">Pick target division…</option>
                      {divisions.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </select>
                    {reassignNeedsSubUnit && reassignDivisionObj && (
                      <select value={reassignSubUnit} onChange={e => setReassignSubUnit(e.target.value)}>
                        <option value="">Pick sub-unit…</option>
                        {reassignDivisionObj.subUnits!.map(su => <option key={su.code} value={su.code}>{su.name}</option>)}
                      </select>
                    )}
                    <textarea
                      value={reassignNote}
                      onChange={e => setReassignNote(e.target.value)}
                      placeholder="Optional note for the user"
                      maxLength={500}
                      rows={2}
                    />
                    <button
                      disabled={busy === reg.id || !reassignDivision || (reassignNeedsSubUnit && !reassignSubUnit)}
                      onClick={() => doAction("reassign", reg)}
                      style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: C.gold, color: C.bg, fontSize: 12, fontWeight: 700, opacity: busy === reg.id || !reassignDivision ? 0.5 : 1 }}
                    >
                      {busy === reg.id ? "Saving…" : "Approve with new division"}
                    </button>
                  </div>
                </div>
              )}

              {isOpen && actionPanel?.mode === "reject" && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(173,27,39,.06)", border: `1px dashed ${C.red}55` }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason (shown to the user in their email)"
                      maxLength={500}
                      rows={3}
                    />
                    <button
                      disabled={busy === reg.id || !rejectReason.trim()}
                      onClick={() => doAction("reject", reg)}
                      style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: C.red, color: "#fff", fontSize: 12, fontWeight: 700, opacity: busy === reg.id || !rejectReason.trim() ? 0.5 : 1 }}
                    >
                      {busy === reg.id ? "Saving…" : "Reject registration"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
