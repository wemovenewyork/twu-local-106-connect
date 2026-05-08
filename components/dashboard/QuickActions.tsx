"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

interface DashboardSummary {
  registrationStatus: "pending" | "approved" | "reassigned" | "rejected" | null;
  unreadNotifications: number;
  pendingAgreements: number;
  activeSwaps: number;
  pendingOvertime: number;
}

export default function QuickActions() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api.get<DashboardSummary>("/dashboard/summary").then(setSummary).catch(() => {});
  }, []);

  const swapHref = user?.division?.code ? `/division/${user.division.code}/swaps` : "/portal/divisions";

  const cards: Array<{ title: string; description: string; href: string; icon: string; count: string | null }> = [
    {
      title: "Shift Swap",
      description: "Browse the swap board",
      href: swapHref,
      icon: "swap",
      count: summary && summary.activeSwaps > 0 ? `${summary.activeSwaps} active` : null,
    },
    {
      title: "Overtime Requests",
      description: "Submit OT requests",
      href: "/portal/overtime-requests",
      icon: "clk",
      count: summary && summary.pendingOvertime > 0 ? `${summary.pendingOvertime} pending` : null,
    },
    {
      title: "News",
      description: "Read union news",
      href: "/news",
      icon: "list",
      count: null,
    },
    {
      title: "Documents",
      description: "Forms & contracts",
      href: "/documents",
      icon: "mt",
      count: null,
    },
    {
      title: "Contact",
      description: "Reach your reps",
      href: "/contact",
      icon: "msg",
      count: null,
    },
    {
      title: "Profile",
      description: "Update your info",
      href: "/profile",
      icon: "usr",
      count: null,
    },
  ];

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
        Quick Actions
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {cards.map(card => (
          <button
            key={card.title}
            onClick={() => router.push(card.href)}
            style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
              padding: "14px 16px", borderRadius: 14,
              background: "rgba(255,255,255,.025)", border: `1px solid ${C.bd}`,
              color: "inherit", cursor: "pointer", textAlign: "left",
              transition: "background .2s, border-color .2s, transform .2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255,255,255,.05)";
              e.currentTarget.style.borderColor = "rgba(173,27,39,.35)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,.025)";
              e.currentTarget.style.borderColor = C.bd;
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Icon n={card.icon} s={16} c={C.gold} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{card.title}</span>
              </div>
              <div style={{ fontSize: 12, color: C.m, lineHeight: 1.4 }}>{card.description}</div>
            </div>
            {card.count && (
              <span style={{
                background: "rgba(173,27,39,.15)", color: C.gold,
                fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999,
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {card.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
