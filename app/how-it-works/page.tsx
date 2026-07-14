"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { C } from "@/constants/colors";

/* ─── Step data ────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    color: C.gold,
    title: "Create your account",
    desc: "Sign up with your name and email, and select your division.",
    visual: <DivisionVisual />,
  },
  {
    n: "02",
    color: C.blue,
    title: "Verify your email",
    desc: "Click the link we send you to confirm your address.",
  },
  {
    n: "03",
    color: "#00C9A7",
    title: "Division admin approval",
    desc: "Your division admin confirms you're a Local 106 member. You'll get an email the moment you're approved. No codes, no passwords to share — your admin knows who belongs.",
  },
  {
    n: "04",
    color: "#C084FC",
    title: "You're in",
    desc: "Post and browse shift swaps in your division, read union news, search your contract, and request overtime — from any phone.",
    visual: <PostVisual />,
  },
];

/* ─── Mini visuals ─────────────────────────────────────────────────────────── */

function DivisionVisual() {
  const divisions = ["Queens Village", "East New York", "Flatbush", "Gun Hill", "Spring Creek"];
  return (
    <div style={{ width: "100%", maxWidth: 260 }}>
      {divisions.slice(0,3).map((d, i) => (
        <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: i === 1 ? `${C.blue}18` : "rgba(255,255,255,.03)", border: `1px solid ${i === 1 ? C.blue + "44" : "rgba(255,255,255,.06)"}`, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 1 ? C.blue : "rgba(255,255,255,.15)", boxShadow: i === 1 ? `0 0 8px ${C.blue}` : "none" }} />
          <div style={{ fontSize: 13, fontWeight: i === 1 ? 700 : 400, color: i === 1 ? C.white : C.m, flex: 1 }}>{d}</div>
          {i === 1 && <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, border: `1px solid ${C.blue}44`, padding: "2px 8px", borderRadius: 6 }}>Selected</div>}
        </div>
      ))}
    </div>
  );
}

function PostVisual() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => (v + 1) % 4), 800);
    return () => clearInterval(t);
  }, []);
  const fields = [
    { label: "Type", value: "Work Swap", color: C.blue },
    { label: "Date", value: "Tomorrow" },
    { label: "Run", value: "142 · Route B46" },
  ];
  return (
    <div style={{ width: "100%", maxWidth: 240 }}>
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 14 }}>
        {fields.map((f, i) => (
          <div key={f.label} style={{ marginBottom: i < 2 ? 8 : 0 }}>
            <div style={{ fontSize: 9, color: C.m, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>{f.label}</div>
            <div style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,.05)", fontSize: 12, color: f.color ?? C.white, display: "flex", alignItems: "center" }}>
              {f.value}
              {tick % 2 === 0 && i === 2 && <span style={{ display: "inline-block", width: 1, height: 11, background: C.gold, marginLeft: 4 }} />}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: "9px", borderRadius: 10, background: "#00C9A7", fontSize: 12, fontWeight: 700, color: "#001a15", textAlign: "center" }}>
          Post Swap
        </div>
      </div>
    </div>
  );
}

/* ─── Step card with scroll-triggered reveal ───────────────────────────────── */

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity .5s ease ${index * .08}s, transform .5s ease ${index * .08}s`,
        borderRadius: 20,
        border: `1px solid rgba(255,255,255,.06)`,
        background: "rgba(255,255,255,.025)",
        padding: 24,
        marginBottom: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Glow corner */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle,${step.color}18 0%,transparent 70%)`, pointerEvents: "none" }} />

      {/* Step number */}
      <div style={{ fontSize: 11, fontWeight: 800, color: step.color, letterSpacing: 2, marginBottom: 14, opacity: .7 }}>STEP {step.n}</div>

      {/* Visual */}
      {step.visual && (
        <div style={{ marginBottom: 20 }}>
          {step.visual}
        </div>
      )}

      {/* Text */}
      <h3 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 8, lineHeight: 1.25 }}>{step.title}</h3>
      <p style={{ fontSize: 14, color: C.m, lineHeight: 1.7 }}>{step.desc}</p>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>How It Works</div>
      </div>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "0 16px 120px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "48px 16px 40px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Image src="/branding/tso-logo.png" alt="The TSO logo — TWU Local 106 / Transit Supervisors Organization" width={160} height={160} style={{ width: 160, height: "auto" }} />
          </div>
          <h1 style={{
            fontSize: "clamp(26px,5vw,36px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 14,
            color: "white",
          }}>
            How TWU Local 106<br />Connect Works
          </h1>
          <p style={{ fontSize: 15, color: C.m, lineHeight: 1.7, maxWidth: 340, margin: "0 auto" }}>
            Four steps from sign-up to swapping — all on your phone, member to member.
          </p>
        </div>

        {/* Steps */}
        {STEPS.map((step, i) => (
          <StepCard key={step.n} step={step} index={i} />
        ))}

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "32px 0 0" }}>
          <div style={{ fontSize: 14, color: C.m, marginBottom: 16 }}>Ready to swap smarter?</div>
          <button
            onClick={() => router.push("/login")}
            style={{ padding: "14px 40px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, background: `linear-gradient(135deg,${C.gold},${C.gold}cc)`, color: C.bg, boxShadow: `0 4px 20px ${C.gold}40` }}
          >
            Get Started
          </button>
        </div>
      </main>
    </div>
  );
}
