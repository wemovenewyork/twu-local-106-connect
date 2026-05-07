"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import NotifToggle from "@/components/ui/NotifToggle";
import Footer from "@/components/ui/Footer";

interface Preferences {
  pushEnabled: boolean;
  contractEnabled: boolean;
  safetyEnabled: boolean;
  rallyEnabled: boolean;
  newsEnabled: boolean;
  benefitEnabled: boolean;
  swapMatchEnabled: boolean;
  systemAlertEnabled: boolean;
}

const CATEGORIES: { key: keyof Preferences; label: string; description: string }[] = [
  { key: "contractEnabled", label: "Contract Updates", description: "Negotiation updates and ratification" },
  { key: "safetyEnabled", label: "Safety Bulletins", description: "Safety alerts from your division" },
  { key: "rallyEnabled", label: "Rally & Action", description: "Rally calls and member mobilization" },
  { key: "newsEnabled", label: "Union News", description: "General union announcements" },
  { key: "benefitEnabled", label: "Member Benefits", description: "Benefits info and member services" },
  { key: "swapMatchEnabled", label: "Shift Swap Matches", description: "When someone responds to your swap" },
  { key: "systemAlertEnabled", label: "System Alerts", description: "Critical app notices" },
];

export default function NotificationSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ preferences: Preferences }>("/users/me/notifications")
      .then(r => setPrefs(r.preferences))
      .catch(e => setBanner({ kind: "err", text: e instanceof Error ? e.message : "Failed to load" }));
  }, [user]);

  const updatePref = async (patch: Partial<Preferences>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    setBusy(true);
    setBanner(null);
    try {
      const r = await api.patch<{ preferences: Preferences }>("/users/me/notifications", patch);
      setPrefs(r.preferences);
    } catch (e) {
      setPrefs(prefs);
      setBanner({ kind: "err", text: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;

  const masterOff = prefs?.pushEnabled === false;

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

        {banner && (
          <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13, background: banner.kind === "ok" ? "rgba(46,213,115,.10)" : "rgba(173,27,39,.10)", border: `1px solid ${banner.kind === "ok" ? "rgba(46,213,115,.35)" : "rgba(173,27,39,.35)"}`, color: banner.kind === "ok" ? "#9CECB4" : C.red }}>
            {banner.text}
          </div>
        )}

        <NotifToggle />

        <section style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Push Notifications</div>
              <div style={{ fontSize: 12, color: C.m, marginTop: 2 }}>
                Master switch for all push notifications
              </div>
            </div>
            <Switch
              checked={prefs?.pushEnabled ?? true}
              disabled={busy || !prefs}
              onChange={v => updatePref({ pushEnabled: v })}
            />
          </div>

          <div style={{ display: "grid", gap: 8, opacity: masterOff ? 0.4 : 1, pointerEvents: masterOff ? "none" : "auto" }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}` }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: C.m, marginTop: 2 }}>{cat.description}</div>
                </div>
                <Switch
                  checked={(prefs?.[cat.key] as boolean | undefined) ?? true}
                  disabled={busy || !prefs}
                  onChange={v => updatePref({ [cat.key]: v } as Partial<Preferences>)}
                />
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Switch({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      style={{
        position: "relative",
        width: 44,
        height: 26,
        borderRadius: 999,
        background: checked ? C.gold : "rgba(255,255,255,.15)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: checked ? 21 : 3,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "white",
        transition: "left 0.15s",
      }} />
    </button>
  );
}
