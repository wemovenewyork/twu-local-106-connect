"use client";

import { useState } from "react";
import Image from "next/image";
import { C } from "@/constants/colors";
import { brand } from "@/config/brand";

/* ─── Slide illustration ───────────────────────────────────────────────────── */

// The TSO seal. It sits on a white circular backing because the seal art is
// transparent and its outer ring is navy — on this dialog's navy backdrop the
// ring would otherwise dissolve into the background and leave the ring text
// floating with no edge. Same treatment as the public hero.
function IllustrationSeal() {
  return (
    <div
      style={{
        width: 148, height: 148, margin: "0 auto",
        borderRadius: "50%", background: brand.colors.white,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 10, boxSizing: "border-box",
        boxShadow: "0 10px 36px rgba(0,0,0,.30)",
        animation: "fadeUp .5s ease both",
      }}
    >
      <Image
        src="/branding/tso-logo.png"
        alt={`${brand.organizationName} seal`}
        width={938}
        height={938}
        sizes="148px"
        style={{ width: "100%", height: "auto", objectFit: "contain", display: "block" }}
        priority
      />
    </div>
  );
}

/* ─── Step config ──────────────────────────────────────────────────────────── */

// Single welcome slide. Everything below (progress bar, dots, x/N counter,
// isLast) derives from STEPS.length, so the carousel collapses to one slide
// with no changes to the navigation logic.
//
// Accent is brand red, not navy: this dialog sits on a navy backdrop
// (rgba(26,31,77,.98)), so a navy accent would make the progress bar, title
// gradient, and primary button disappear into it.
const STEPS = [
  {
    color: brand.colors.red,
    title: "Welcome to\nTWU Local 106 Connect",
    body: "Your members-only home for shift swaps, union news, your contract, and reaching your rep — everything TSO members need, in one place.",
    Illustration: IllustrationSeal,
  },
];

/* ─── Main component ───────────────────────────────────────────────────────── */

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  const go = (next: number, direction: 1 | -1 = 1) => {
    setDir(direction);
    setAnimKey(k => k + 1);
    setStep(next);
  };

  const advance = () => {
    if (isLast) { onDone(); return; }
    go(step + 1, 1);
  };

  const back = () => {
    if (step === 0) return;
    go(step - 1, -1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App onboarding"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(26,31,77,.98)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes slideInRight { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInLeft  { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp       { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes progressFill { from{width:0} to{width:var(--pw)} }
      `}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,.06)" }}>
        <div style={{
          height: "100%",
          background: `linear-gradient(90deg,${s.color},${s.color}99)`,
          width: `${((step + 1) / STEPS.length) * 100}%`,
          transition: "width .4s cubic-bezier(.34,1.2,.64,1), background .4s ease",
          boxShadow: `0 0 12px ${s.color}80`,
        }} />
      </div>

      {/* Skip */}
      {!isLast && (
        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
          <button onClick={onDone} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,.35)", padding: "4px 8px", fontWeight: 600 }}>
            Skip
          </button>
        </div>
      )}

      {/* Step counter */}
      <div style={{ position: "absolute", top: 20, left: 20, fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 700, letterSpacing: 1 }}>
        {step + 1} / {STEPS.length}
      </div>

      {/* Content */}
      <div
        key={animKey}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 32px 0",
          animation: `${dir === 1 ? "slideInRight" : "slideInLeft"} .4s cubic-bezier(.34,1.1,.64,1) both`,
        }}
      >
        {/* Color glow backdrop */}
        <div style={{
          position: "absolute",
          width: 300, height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle,${s.color}12 0%,transparent 70%)`,
          pointerEvents: "none",
          transition: "background .5s ease",
        }} />

        {/* Illustration */}
        <div style={{ marginBottom: 40, position: "relative", zIndex: 1 }}>
          <s.Illustration />
        </div>

        {/* Text */}
        <div style={{ textAlign: "center", maxWidth: 320, position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontSize: 28, fontWeight: 900, lineHeight: 1.15, marginBottom: 14,
            background: `linear-gradient(135deg,${C.white} 30%,${s.color})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            whiteSpace: "pre-line",
            animation: "fadeUp .4s ease .1s both",
          }}>
            {s.title}
          </h2>
          <p style={{
            fontSize: 15, color: C.m, lineHeight: 1.7,
            animation: "fadeUp .4s ease .2s both",
          }}>
            {s.body}
          </p>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingTop: 32 }}>
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i, i > step ? 1 : -1)}
            aria-label={`Go to step ${i + 1}`}
            style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? s.color : "rgba(255,255,255,.15)",
              border: "none", cursor: "pointer", padding: 0,
              transition: "all .3s cubic-bezier(.34,1.2,.64,1)",
              boxShadow: i === step ? `0 0 8px ${s.color}80` : "none",
            }}
          />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ padding: "24px 32px max(32px,env(safe-area-inset-bottom))", display: "flex", gap: 12 }}>
        {step > 0 && (
          <button
            onClick={back}
            style={{
              flex: "0 0 52px", height: 52, borderRadius: 16,
              border: `1px solid rgba(255,255,255,.1)`, background: "rgba(255,255,255,.04)",
              cursor: "pointer", color: C.m, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ←
          </button>
        )}
        <button
          onClick={advance}
          style={{
            flex: 1, height: 52, borderRadius: 16, border: "none",
            cursor: "pointer", fontSize: 16, fontWeight: 700,
            background: `linear-gradient(135deg,${s.color},${s.color}cc)`,
            color: C.white,
            boxShadow: `0 4px 20px ${s.color}40`,
            transition: "background .4s ease, box-shadow .4s ease",
          }}
        >
          {isLast ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}
