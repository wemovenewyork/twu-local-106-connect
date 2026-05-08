"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

interface OvertimeRequest {
  id: string;
  payrollNumber: string;
  requestedDate: string;
  type: "rdo" | "doubleShift";
  preferences: string | null;
  status: "submitted" | "withdrawn" | "acknowledged";
  createdAt: string;
  withdrawnAt: string | null;
  acknowledgedAt: string | null;
}

const TYPE_LABEL: Record<OvertimeRequest["type"], string> = {
  rdo: "Regular Day Off",
  doubleShift: "Double Shift",
};

const STATUS_STYLE: Record<OvertimeRequest["status"], { bg: string; bd: string; c: string; label: string }> = {
  submitted:    { bg: "rgba(46,213,115,.12)",  bd: "rgba(46,213,115,.35)",  c: "#2ED573", label: "Submitted" },
  withdrawn:    { bg: "rgba(128,128,128,.12)", bd: "rgba(128,128,128,.35)", c: "#999",    label: "Withdrawn" },
  acknowledged: { bg: "rgba(2,73,181,.18)",    bd: "rgba(2,73,181,.40)",    c: "#5A9CFF", label: "Acknowledged" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function MyOvertimeRequestsList() {
  const [requests, setRequests] = useState<OvertimeRequest[] | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ requests: OvertimeRequest[] }>("/overtime-requests");
      setRequests(r.requests);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("overtime-request-created", handler);
    return () => window.removeEventListener("overtime-request-created", handler);
  }, [load]);

  async function withdraw(id: string) {
    if (!confirm("Withdraw this request?")) return;
    setWithdrawing(id);
    try {
      await api.patch(`/overtime-requests/${id}`, { status: "withdrawn" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to withdraw");
    } finally {
      setWithdrawing(null);
    }
  }

  if (requests === null) {
    return <div style={{ color: C.m, fontSize: 13 }}>Loading…</div>;
  }
  if (requests.length === 0) {
    return (
      <div style={{ padding: "16px 18px", borderRadius: 12, border: `1px dashed ${C.bd}`, color: C.m, fontSize: 13 }}>
        No requests yet. Submit one above.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {requests.map(r => {
        const status = STATUS_STYLE[r.status];
        return (
          <div key={r.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.025)", border: `1px solid ${C.bd}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>
                {formatDate(r.requestedDate)}
                <span style={{ color: C.m, fontWeight: 500, marginLeft: 8 }}>
                  · {TYPE_LABEL[r.type]}
                </span>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
                padding: "3px 8px", borderRadius: 999,
                background: status.bg, border: `1px solid ${status.bd}`, color: status.c,
              }}>
                {status.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.m, marginBottom: 4 }}>
              Payroll {r.payrollNumber}
            </div>
            {r.preferences && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.78)", lineHeight: 1.45, marginTop: 6 }}>
                {r.preferences}
              </div>
            )}
            {r.status === "submitted" && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => withdraw(r.id)}
                  disabled={withdrawing === r.id}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: "transparent", border: `1px solid ${C.bd}`, color: C.m,
                    cursor: withdrawing === r.id ? "not-allowed" : "pointer",
                  }}
                >
                  {withdrawing === r.id ? "Withdrawing…" : "Withdraw"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
