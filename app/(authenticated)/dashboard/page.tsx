"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { C } from "@/constants/colors";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";
import Icon from "@/components/ui/Icon";
import Footer from "@/components/ui/Footer";
import DashboardWelcome from "@/components/dashboard/DashboardWelcome";
import AttentionStrip from "@/components/dashboard/AttentionStrip";
import RecentNews from "@/components/dashboard/RecentNews";
import QuickActions from "@/components/dashboard/QuickActions";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.divisionId) router.replace("/setup-profile");
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="page-enter" style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.white, letterSpacing: 3, flex: 1 }}>TWU LOCAL 106</div>
        {user.role === "superAdmin" && (
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

      <main id="main-content" tabIndex={-1} style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 28px" }}>
        <DashboardWelcome user={user} />
        <AttentionStrip />
        <RecentNews />
        <QuickActions />
        <Footer />
      </main>
    </div>
  );
}
