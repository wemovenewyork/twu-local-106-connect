"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const PURPLE = "#C084FC";

interface AdminOvertimeRequest {
  id: string;
  payrollNumber: string;
  requestedDate: string;
  type: "rdo" | "doubleShift";
  preferences: string | null;
  status: "submitted" | "withdrawn" | "acknowledged";
  createdAt: string;
  submitter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    division: { id: string; code: string; name: string } | null;
  };
}

const TYPE_LABEL: Record<AdminOvertimeRequest["type"], string> = {
  rdo: "RDO",
  doubleShift: "Double",
};

const STATUS_STYLE: Record<AdminOvertimeRequest["status"], { bg: string; bd: string; c: string; label: string }> = {
  submitted:    { bg: "rgba(46,213,115,.12)",  bd: "rgba(46,213,115,.35)",  c: "#2ED573", label: "Submitted" },
  withdrawn:    { bg: "rgba(128,128,128,.12)", bd: "rgba(128,128,128,.35)", c: "#999",    label: "Withdrawn" },
  acknowledged: { bg: "rgba(2,73,181,.18)",    bd: "rgba(2,73,181,.40)",    c: "#5A9CFF", label: "Acknowledged" },
};

const STATUS_TABS = ["all", "submitted", "acknowledged", "withdrawn"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const lb: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminOvertimeRequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<AdminOvertimeRequest[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("submitted");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isAdmin = !!user && (user.role === "localAdmin" || user.role === "superAdmin");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace("/dashboard");
  }, [user, loading, isAdmin, router]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const params = new URLSearchParams();
    if (statusTab !== "all") params.set("status", statusTab);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    try {
      const data = await api.get<{ requests: AdminOvertimeRequest[] }>(`/admin/overtime-requests${qs ? `?${qs}` : ""}`);
      setRequests(data.requests);
    } catch {
      showToast("Failed to load requests");
    }
  }, [isAdmin, statusTab, from, to, q]);

  useEffect(() => { load(); }, [load]);

  if (loading || !user) {
    return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  }
  if (!isAdmin) return null;

  async function acknowledge(id: string) {
    setBusy(id);
    try {
      await api.patch(`/admin/overtime-requests/${id}`, { action: "acknowledge" });
      await load();
      showToast("Marked acknowledged");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.9)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/admin")} aria-label="Back to admin" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.white }}>Overtime Requests</div>
          <div style={{ fontSize: 10, color: PURPLE, letterSpacing: 2, textTransform: "uppercase" }}>Admin View</div>
        </div>
      </div>

      <main id="main-content" tabIndex={-1} style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
        {/* Status tabs */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUS_TABS.length}, 1fr)`, gap: 4, background: C.s, borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {STATUS_TABS.map(t => (
            <button
              key={t}
              onClick={() => setStatusTab(t)}
              style={{
                padding: "10px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: statusTab === t ? PURPLE + "22" : "transparent",
                color: statusTab === t ? PURPLE : C.m,
                boxShadow: statusTab === t ? `inset 0 0 0 1px ${PURPLE}44` : "none",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8, marginBottom: 16 }}>
          <div>
            <label htmlFor="ot-from" style={lb}>From</label>
            <input id="ot-from" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ height: 40 }} />
          </div>
          <div>
            <label htmlFor="ot-to" style={lb}>To</label>
            <input id="ot-to" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ height: 40 }} />
          </div>
          <div>
            <label htmlFor="ot-search" style={lb}>Search</label>
            <input id="ot-search" type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email, or payroll #" style={{ height: 40 }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: C.m, marginBottom: 8 }}>
          {requests.length} request{requests.length === 1 ? "" : "s"}
        </div>

        {requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: C.m, borderRadius: 14, border: `1px dashed ${C.bd}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>No requests match these filters</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Try widening the date range or clearing the search.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {requests.map(r => {
              const status = STATUS_STYLE[r.status];
              return (
                <div key={r.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.025)", border: `1px solid ${C.bd}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>
                          {r.submitter.firstName} {r.submitter.lastName}
                        </span>
                        {r.submitter.division && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, background: "rgba(173,27,39,.12)", border: "1px solid rgba(173,27,39,.30)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 1 }}>
                            {r.submitter.division.code}
                          </span>
                        )}
                        <span style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
                          padding: "2px 8px", borderRadius: 999,
                          background: status.bg, border: `1px solid ${status.bd}`, color: status.c,
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.m, marginBottom: 6 }}>
                        {r.submitter.email} · Payroll {r.payrollNumber}
                      </div>
                      <div style={{ fontSize: 13, color: C.white }}>
                        <strong>{TYPE_LABEL[r.type]}</strong> on {formatDate(r.requestedDate)}
                      </div>
                      {r.preferences && (
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,.78)", lineHeight: 1.45, marginTop: 6, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}` }}>
                          {r.preferences}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: C.m, marginTop: 6 }}>
                        Submitted {formatStamp(r.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {r.status === "submitted" && (
                        <button
                          onClick={() => acknowledge(r.id)}
                          disabled={busy === r.id}
                          style={{
                            padding: "8px 12px", borderRadius: 8, border: `1px solid ${PURPLE}44`,
                            background: PURPLE + "12", color: PURPLE,
                            cursor: busy === r.id ? "not-allowed" : "pointer",
                            fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                            opacity: busy === r.id ? 0.5 : 1,
                          }}
                        >
                          {busy === r.id ? "…" : "Mark acknowledged"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(26,31,77,.95)", backdropFilter: "blur(16px)", border: `1px solid ${C.bd}`, borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 600, color: C.white, zIndex: 500, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
