"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

interface DashboardSummary {
  registrationStatus: "pending" | "approved" | "reassigned" | "rejected" | null;
  unreadNotifications: number;
  pendingAgreements: number;
  activeSwaps: number;
  pendingOvertime: number;
}

interface AttentionItem {
  id: string;
  level: "info" | "warning" | "urgent";
  message: string;
  href: string;
}

const STYLES: Record<AttentionItem["level"], { bg: string; bd: string; c: string }> = {
  urgent:  { bg: "rgba(255,71,87,.10)",  bd: "rgba(255,71,87,.40)",  c: "#FF4757" },
  warning: { bg: "rgba(217,119,6,.10)",  bd: "rgba(217,119,6,.35)",  c: "#D97706" },
  info:    { bg: "rgba(2,73,181,.10)",   bd: "rgba(2,73,181,.35)",   c: "#0249B5" },
};

function buildItems(summary: DashboardSummary): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (summary.registrationStatus === "pending") {
    items.push({
      id: "reg-pending",
      level: "warning",
      message: "Your registration is pending admin approval",
      href: "/pending-approval",
    });
  }

  if (summary.pendingAgreements > 0) {
    items.push({
      id: "swaps-pending",
      level: "urgent",
      message: `${summary.pendingAgreements} swap${summary.pendingAgreements > 1 ? "s" : ""} need your response`,
      href: "/portal/divisions",
    });
  }

  if (summary.unreadNotifications > 0) {
    items.push({
      id: "notifs",
      level: "info",
      message: `${summary.unreadNotifications} unread notification${summary.unreadNotifications > 1 ? "s" : ""}`,
      href: "/notifications",
    });
  }

  return items.slice(0, 3);
}

export default function AttentionStrip() {
  const router = useRouter();
  const [items, setItems] = useState<AttentionItem[] | null>(null);

  useEffect(() => {
    api.get<DashboardSummary>("/dashboard/summary")
      .then(s => setItems(buildItems(s)))
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section style={{ marginBottom: 24, display: "grid", gap: 8 }}>
      {items.map(item => {
        const s = STYLES[item.level];
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.href)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, padding: "12px 14px", borderRadius: 12,
              background: s.bg, border: `1px solid ${s.bd}`, color: C.white,
              cursor: "pointer", textAlign: "left", width: "100%",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: s.c, flexShrink: 0 }} />
              {item.message}
            </span>
            <span style={{ color: s.c, fontSize: 14, fontWeight: 700 }}>→</span>
          </button>
        );
      })}
    </section>
  );
}
