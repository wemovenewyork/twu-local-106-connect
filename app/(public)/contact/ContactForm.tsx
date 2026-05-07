"use client";

import { useState } from "react";
import { brand } from "@/config/brand";

interface OfficerOption {
  id: string;
  name: string;
  title: string;
}

interface Props {
  officers: OfficerOption[];
  initialOfficerId?: string;
}

export default function ContactForm({ officers, initialOfficerId }: Props) {
  const [officerId, setOfficerId] = useState(initialOfficerId ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("idle");
    setErrMsg(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerId: officerId || undefined,
          name,
          email,
          phone: phone || undefined,
          message,
          honeypot: honeypot || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("err");
        setErrMsg(data.error ?? "Could not send your message");
      } else {
        setStatus("ok");
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
      }
    } catch {
      setStatus("err");
      setErrMsg("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "ok") {
    return (
      <div
        style={{
          padding: 24,
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: 12,
          color: "#166534",
        }}
      >
        <strong>Message sent.</strong> We&rsquo;ll be in touch shortly.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {officers.length > 0 && (
        <label style={labelStyle}>
          Send to
          <select
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{brand.unionName} (general inquiry)</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {o.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label style={labelStyle}>
        Your name
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          autoComplete="name"
        />
      </label>

      <label style={labelStyle}>
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          autoComplete="email"
        />
      </label>

      <label style={labelStyle}>
        Phone (optional)
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
          autoComplete="tel"
        />
      </label>

      <label style={labelStyle}>
        Message
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={3000}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </label>

      {/* Honeypot — hidden from real users, attractive to bots */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-10000px", height: 0, width: 0, opacity: 0 }}
        aria-hidden
      />

      {status === "err" && errMsg && (
        <div style={{ color: brand.colors.accent, fontSize: 14 }}>{errMsg}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: 4,
          padding: "12px 20px",
          background: brand.colors.accent,
          color: brand.colors.accentForeground,
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: 13,
  fontWeight: 600,
  color: brand.colors.navy,
  gap: 6,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: 15,
  color: brand.colors.navy,
  background: "#FFFFFF",
};
