"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Division } from "@/types";
import { C } from "@/constants/colors";
import DivisionBadge from "@/components/ui/DivisionBadge";
import Icon from "@/components/ui/Icon";
import Footer from "@/components/ui/Footer";
import TiltCard from "@/components/ui/TiltCard";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";

export default function DivisionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [q, setQ] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.divisionId) router.replace("/setup-profile");
  }, [user, loading, router]);

  useEffect(() => {
    api.get<Division[]>("/divisions").then(setDivisions).catch(console.error);
  }, []);

  const filtered = useMemo(
    () => divisions.filter(d => !q || d.name.toLowerCase().includes(q.toLowerCase())),
    [divisions, q]
  );

  return (
    <div className="page-enter" style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.white, letterSpacing: 3, flex: 1 }}>TWU LOCAL 106</div>
        {user?.role === "admin" && (
          <button onClick={() => router.push("/admin")} aria-label="Admin dashboard" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #C084FC33", background: "#C084FC12", color: "#C084FC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="shield" s={15} c="#C084FC" />
          </button>
        )}
        <NotifIcon />
        <InboxIcon />
        <button onClick={() => router.push("/profile")} aria-label="Profile" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="usr" s={15} />
        </button>
      </div>
      <main id="main-content" tabIndex={-1} style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ padding: "40px 0 28px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 10 }}>Welcome, {user?.firstName}</div>
          <h2 style={{ fontSize: "clamp(28px,7vw,46px)", fontWeight: 800, color: C.white, lineHeight: 1.1 }}>
            Choose Your{" "}
            <span style={{ background: `linear-gradient(135deg,${C.gold},${C.gold}bb)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Division</span>
          </h2>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", backdropFilter: "blur(12px)", borderRadius: 20, border: "1px solid rgba(255,255,255,.06)", padding: 18, marginBottom: 24 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search divisions..." style={{ height: 48 }} />
        </div>

        {divisions.length === 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 66, borderRadius: 14 }} />
            ))}
          </div>
        )}

        <div style={{ display: "grid", gap: 6, marginBottom: 28 }}>
          {filtered.map(d => (
            <TiltCard key={d.code} className="card-enter" intensity={6}>
              <button
                onClick={() => router.push(`/division/${d.code}/swaps`)}
                onMouseEnter={() => setHovered(d.code)}
                onMouseLeave={() => setHovered(null)}
                style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 16px", borderRadius: 14, border: "none", cursor: "pointer", textAlign: "left", transition: "background .25s, box-shadow .25s", background: hovered === d.code ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.025)", backdropFilter: "blur(8px)", borderLeft: hovered === d.code ? `3px solid ${C.gold}` : "3px solid transparent", boxShadow: hovered === d.code ? `0 8px 32px rgba(0,0,0,.2), inset 0 0 0 1px rgba(173,27,39,.15)` : `inset 0 0 0 1px rgba(255,255,255,.05)` }}
              >
                <DivisionBadge division={d} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: C.m, marginTop: 3 }}>{d.code}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: C.gold + "18", color: C.gold, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>{d.openSwaps ?? 0} swaps</span>
                  <Icon n="chev" s={16} c={C.gold} />
                </div>
              </button>
            </TiltCard>
          ))}
        </div>
        <Footer />
      </main>
    </div>
  );
}
