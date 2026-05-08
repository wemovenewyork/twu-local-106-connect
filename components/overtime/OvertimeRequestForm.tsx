"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`,
  color: C.white, fontSize: 14, outline: "none",
};

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.2 };

export default function OvertimeRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [requestedDate, setRequestedDate] = useState("");
  const [type, setType] = useState<"" | "rdo" | "doubleShift">("");
  const [payrollNumber, setPayrollNumber] = useState("");
  const [preferences, setPreferences] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!type) { setError("Please choose a request type"); return; }
    setSubmitting(true);

    try {
      await api.post("/overtime-requests", {
        requestedDate,
        type,
        payrollNumber: payrollNumber.trim(),
        preferences: preferences.trim() || null,
      });
      setRequestedDate("");
      setType("");
      // Keep payrollNumber so the user doesn't retype it on consecutive submissions.
      setPreferences("");
      setSuccess(true);
      onSubmitted?.();
      // Reload the list by triggering window event — list listens.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("overtime-request-created"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, padding: 20, borderRadius: 16, background: "rgba(255,255,255,.025)", border: `1px solid ${C.bd}` }}>
      <div>
        <label htmlFor="ot-date" style={labelStyle}>Date</label>
        <input
          id="ot-date"
          type="date"
          value={requestedDate}
          onChange={e => setRequestedDate(e.target.value)}
          required
          min={today}
          style={inputStyle}
        />
      </div>

      <div>
        <span style={labelStyle}>Type</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { v: "rdo" as const, label: "Regular Day Off (RDO)" },
            { v: "doubleShift" as const, label: "Double Shift" },
          ].map(opt => {
            const active = type === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => setType(opt.v)}
                style={{
                  padding: "12px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: active ? "rgba(173,27,39,.18)" : "rgba(255,255,255,.04)",
                  border: `1px solid ${active ? "rgba(173,27,39,.55)" : C.bd}`,
                  color: active ? C.white : C.m,
                  textAlign: "left",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="ot-payroll" style={labelStyle}>
          Payroll Number <span style={{ color: C.m, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(required for each submission)</span>
        </label>
        <input
          id="ot-payroll"
          type="text"
          value={payrollNumber}
          onChange={e => setPayrollNumber(e.target.value)}
          required
          maxLength={32}
          pattern="[A-Za-z0-9-]+"
          autoComplete="payroll-number"
          placeholder="e.g., 12345 or A12345"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="ot-prefs" style={labelStyle}>
          Preferences <span style={{ color: C.m, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          id="ot-prefs"
          value={preferences}
          onChange={e => setPreferences(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g., uptown only, no nights, no mobile"
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
        <div style={{ fontSize: 11, color: C.m, marginTop: 4, textAlign: "right" }}>{preferences.length}/500</div>
      </div>

      {error && (
        <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,71,87,.10)", border: "1px solid rgba(255,71,87,.40)", color: "#FF8896", fontSize: 13 }}>
          {error}
        </div>
      )}

      {success && (
        <div role="status" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(46,213,115,.10)", border: "1px solid rgba(46,213,115,.40)", color: "#7FE6A6", fontSize: 13 }}>
          Request submitted.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "12px 16px", borderRadius: 12,
          background: submitting ? "rgba(173,27,39,.4)" : C.gold,
          border: "none", color: C.white, fontSize: 14, fontWeight: 800, letterSpacing: 0.4,
          cursor: submitting ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? "Submitting…" : "Submit Request"}
      </button>
    </form>
  );
}
