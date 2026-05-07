"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { C } from "@/constants/colors";
import MagneticButton from "@/components/ui/MagneticButton";

const IconArrows = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);

const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const features = [
  { Icon: IconArrows, color: C.blue,    title: "Find a Shift Swap",      desc: "Post your shift, browse swaps in your division, and connect with members who can cover." },
  { Icon: IconCalendar, color: C.gold,  title: "Stay Informed",          desc: "Get push notifications about contract updates, division announcements, and union news." },
  { Icon: IconSun, color: "#00C9A7",    title: "Access Your Resources",  desc: "Forms, contracts, and benefits info — searchable, organized by division, always current." },
];

const stats = [
  { value: "5 Divisions", label: "MABSTOA · MSII · MTA Bus · Queens · TSC" },
  { value: "24/7",         label: "Always Available" },
  { value: "Official",     label: "TWU Local 106 Members" },
];

export default function LandingPage() {
  const router = useRouter();
  const [v, setV] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setV(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes busFloat {
          0%,100% { transform: translateY(0) rotate(-1deg); }
          50%      { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes busDriveIn {
          from { opacity: 0; transform: translateX(-60px) scale(0.85); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
        @keyframes busGlow {
          0%,100% { filter: drop-shadow(0 12px 28px rgba(0,102,204,0.35)) drop-shadow(0 0 0px rgba(173,27,39,0)); }
          50%      { filter: drop-shadow(0 20px 48px rgba(0,102,204,0.55)) drop-shadow(0 0 24px rgba(173,27,39,0.2)); }
        }
        @keyframes spinSlow {
          to { transform: translate(-50%, -55%) rotate(360deg); }
        }
      `}</style>

      {/* Decorative orbit rings */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -55%)",
        width: 480, height: 480, borderRadius: "50%",
        border: `1px solid ${C.gold}14`,
        animation: "spinSlow 35s linear infinite",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -55%)",
        width: 660, height: 660, borderRadius: "50%",
        border: `1px solid ${C.blue}10`,
        animation: "spinSlow 55s linear infinite reverse",
        pointerEvents: "none",
      }} />

      {/* Bus logo */}
      <div style={{
        opacity: v ? 1 : 0,
        animation: v ? "busDriveIn .8s cubic-bezier(.34,1.2,.64,1) both, busFloat 5s ease-in-out 1s infinite, busGlow 4s ease-in-out 1s infinite" : "none",
        marginBottom: 20,
        width: "100%",
        maxWidth: 320,
      }}>
        <Image
          src="/branding/tso-logo.png"
          alt="The TSO logo — TWU Local 106 / Transit Supervisors Organization"
          width={400}
          height={400}
          style={{ width: "100%", height: "auto", display: "block" }}
          priority
        />
      </div>

      {/* Headline */}
      <div style={{
        textAlign: "center",
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(30px)",
        transition: "all .7s cubic-bezier(.34,1.1,.64,1) .3s",
        marginBottom: 14,
      }}>
        <h1 style={{
          fontSize: "clamp(30px,7vw,56px)",
          fontWeight: 900,
          letterSpacing: -1.2,
          lineHeight: 1.05,
          background: `linear-gradient(135deg, #ffffff 0%, ${C.gold} 45%, #ffffff 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0,
        }}>
          The Official App of<br />TWU Local 106
        </h1>
      </div>

      {/* Subheadline */}
      <p style={{
        fontSize: "clamp(14px,2.5vw,17px)",
        color: "rgba(255,255,255,.55)",
        maxWidth: 360,
        margin: "0 auto 36px",
        lineHeight: 1.65,
        textAlign: "center",
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(20px)",
        transition: "all .6s ease .45s",
      }}>
        Find shift swaps, stay connected to your division, and get the news that affects you — all in one place.
      </p>

      {/* Feature cards */}
      <div style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        flexWrap: "wrap",
        marginBottom: 36,
        maxWidth: 560,
        width: "100%",
      }}>
        {features.map((f, i) => (
          <div key={f.title} style={{
            padding: "14px 18px",
            borderRadius: 18,
            background: f.color + "0a",
            border: `1px solid ${f.color}25`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: "1 1 160px",
            opacity: v ? 1 : 0,
            transform: v ? "translateY(0)" : "translateY(24px)",
            transition: `all .6s cubic-bezier(.34,1.1,.64,1) ${.55 + i * .1}s`,
            boxShadow: `0 4px 24px ${f.color}10`,
          }}>
            <span style={{ color: f.color, flexShrink: 0, display: "flex" }}><f.Icon /></span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap",
        marginBottom: 36, maxWidth: 560, width: "100%",
        opacity: v ? 1 : 0, transition: "opacity .6s ease .8s",
      }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: "center", flex: "1 1 160px", minWidth: 140, opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(12px)", transition: `all .5s ease ${.8 + i * .1}s` }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.gold, letterSpacing: -0.5, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: 1.2, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div style={{
        display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
        marginBottom: 24,
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(16px)",
        transition: "all .6s ease .95s",
      }}>
        <MagneticButton onClick={() => router.push("/login")} style={{
          padding: "16px 40px", borderRadius: 16, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg,${C.gold},${C.gold}bb)`,
          fontSize: 16, fontWeight: 800, color: C.bg,
          boxShadow: `0 8px 32px ${C.gold}45`, minWidth: 160,
        }}>
          Sign In →
        </MagneticButton>
        <MagneticButton onClick={() => router.push("/login?tab=register")} style={{
          padding: "16px 40px", borderRadius: 16,
          border: "1.5px solid rgba(255,255,255,.12)", cursor: "pointer",
          background: "rgba(255,255,255,.04)", backdropFilter: "blur(16px)",
          fontSize: 16, fontWeight: 700, color: "#fff", minWidth: 160,
        }}>
          Create Account
        </MagneticButton>
      </div>

      {/* How it works link */}
      <button
        onClick={() => router.push("/how-it-works")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 16,
          textDecoration: "underline", textUnderlineOffset: 3,
          opacity: v ? 1 : 0, transition: "opacity .5s ease 1.05s",
        }}
      >
        How does it work?
      </button>

      {/* Fine print */}
      <p style={{
        fontSize: 11, color: "rgba(255,255,255,.28)", textAlign: "center",
        maxWidth: 300, lineHeight: 1.6,
        opacity: v ? 1 : 0, transition: "opacity .5s ease 1.1s",
      }}>
        For TWU Local 106 members. Registration requires division admin approval.
      </p>
    </main>
  );
}
