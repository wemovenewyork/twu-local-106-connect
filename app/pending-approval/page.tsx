"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

export default function PendingApprovalPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Redirect away if the user is no longer pending — either approved (router
  // sends them to their division) or not signed in (back to login).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const status = user.registrationApproval?.status;
    if (status === "approved") {
      router.replace(user.division?.code ? `/division/${user.division.code}` : "/divisions");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.m }}>Loading…</div>
      </main>
    );
  }

  const declared = user.registrationApproval?.declaredDivision;
  const subUnit = user.registrationApproval?.declaredSubUnit;
  const isRejected = user.registrationApproval?.status === "rejected";

  const doLogout = async () => {
    try { await api.post("/auth/logout", {}); } catch { /* ignore */ }
    logout();
    router.push("/login");
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 480, width: "100%", background: "rgba(255,255,255,.02)", backdropFilter: "blur(16px)", borderRadius: 28, border: "1px solid rgba(255,255,255,.06)", padding: 36, boxShadow: "0 24px 80px rgba(0,0,0,.3)", textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: isRejected ? C.red + "18" : C.gold + "18", border: `1.5px solid ${isRejected ? C.red : C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Image
            src="/branding/tso-logo.png"
            alt="TSO"
            width={64}
            height={64}
            style={{ width: 64, height: 64 }}
          />
        </div>

        {isRejected ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 12 }}>Registration not approved</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6, marginBottom: 16 }}>
              Your division admin reviewed your registration and was unable to approve it.
            </p>
            {user.registrationApproval?.rejectionReason && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(173,27,39,.10)", border: "1px solid rgba(173,27,39,.35)", marginBottom: 16, textAlign: "left" }}>
                <p style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Reason</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.5 }}>{user.registrationApproval.rejectionReason}</p>
              </div>
            )}
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6, marginBottom: 20 }}>
              If you believe this is an error, contact your division admin directly.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 12 }}>Pending approval</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6, marginBottom: 16 }}>
              Thanks {user.firstName}! Your email is verified. Your registration is now waiting for your division admin to review it.
            </p>

            {declared && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 16, textAlign: "left" }}>
                <p style={{ fontSize: 11, color: C.m, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1.5 }}>Division</p>
                <p style={{ fontSize: 14, color: C.white, fontWeight: 600 }}>{declared.name}</p>
                {subUnit && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{subUnit.name}</p>
                )}
              </div>
            )}

            <p style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6, marginBottom: 20 }}>
              You&apos;ll receive an email when an admin approves you (typically within 1–2 business days). You can close this tab and come back later.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={doLogout}
          style={{ width: "100%", padding: "12px 20px", borderRadius: 12, background: "transparent", color: C.m, border: `1px solid ${C.bd}`, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
