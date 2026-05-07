"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { C } from "@/constants/colors";
import NotifToggle from "@/components/ui/NotifToggle";
import Footer from "@/components/ui/Footer";

export default function NotificationSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ padding: "6px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer" }}>
          ← Back
        </button>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.white, letterSpacing: 2 }}>NOTIFICATIONS</div>
      </div>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 60px" }}>
        <h1 style={{ fontSize: "clamp(22px,5vw,28px)", fontWeight: 800, color: C.white, marginBottom: 8 }}>
          Notification Settings
        </h1>
        <p style={{ fontSize: 13, color: C.m, lineHeight: 1.6, marginBottom: 24 }}>
          Stay in the loop on union news, swap matches, and division updates.
        </p>

        <NotifToggle />

        <div style={{ marginTop: 28, padding: 14, borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, fontSize: 12, color: C.m, lineHeight: 1.6 }}>
          Per-category preferences (contract, safety, news, swaps…) are coming soon.
          For now, the toggle above turns push on or off for all notifications.
        </div>
      </main>
      <Footer />
    </div>
  );
}
