"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";
import Footer from "@/components/ui/Footer";
import OvertimeRequestForm from "@/components/overtime/OvertimeRequestForm";
import MyOvertimeRequestsList from "@/components/overtime/MyOvertimeRequestsList";

export default function OvertimeRequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  // Approval gate: non-approved members see a friendly message instead of the form.
  const status = user.registrationApproval?.status;
  const adminTier = ["editor", "divisionAdmin", "localAdmin", "superAdmin"].includes(user.role);
  const canSubmit = adminTier || status === "approved";

  return (
    <div className="page-enter" style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/dashboard")} aria-label="Back to dashboard" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={15} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.white, flex: 1 }}>Overtime Requests</div>
        <NotifIcon />
        <InboxIcon />
      </div>

      <main id="main-content" tabIndex={-1} style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 28px" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "clamp(26px,6vw,36px)", fontWeight: 800, color: C.white, letterSpacing: -0.5, lineHeight: 1.1, margin: 0 }}>
            Overtime Requests
          </h1>
          <p style={{ fontSize: 13, color: C.m, marginTop: 8, lineHeight: 1.5 }}>
            Submit availability for overtime shifts. Your requests are reviewed by the assignment desk.
          </p>
        </header>

        {!canSubmit ? (
          <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.30)", color: C.white, fontSize: 13, lineHeight: 1.55 }}>
            Your registration is pending approval. You&rsquo;ll be able to submit OT requests once an admin approves your account.
          </div>
        ) : (
          <>
            <OvertimeRequestForm />

            <section style={{ marginTop: 36 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
                Your Recent Requests
              </h2>
              <MyOvertimeRequestsList />
            </section>
          </>
        )}

        <Footer />
      </main>
    </div>
  );
}
