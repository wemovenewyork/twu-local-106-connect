"use client";

import { useRouter } from "next/navigation";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import { brand } from "@/config/brand";

export default function DisclaimerPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.85)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Disclaimer</div>
      </div>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 60px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 24 }}>Disclaimer</h1>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>About this platform</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.7 }}>
            {brand.disclaimer}
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Official Approval Required</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.7 }}>
            All shift swaps must be formally approved in accordance with division rules, MTA / MaBSTOA / MTA Bus regulations, and the direction of supervisors or management. Using this platform does not constitute official approval of any swap. Failure to follow proper approval procedures is not permitted.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Disclaimer of Liability</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.7 }}>
            {brand.name} is provided as-is without warranties of any kind. We are not responsible for disputes, missed shifts, denied swaps, disciplinary actions, or any other consequences arising from the use of this platform. Members are solely responsible for verifying and complying with all applicable rules.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Affiliation</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.7 }}>
            {brand.affiliationNotice}
          </p>
        </section>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 40 }}>
          © {new Date().getFullYear()} {brand.unionName}. All rights reserved.
        </div>
      </main>
    </div>
  );
}
