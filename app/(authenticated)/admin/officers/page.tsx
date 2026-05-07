"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { Officer, OfficerScope } from "@/types";

const SCOPE_LABEL: Record<OfficerScope, string> = {
  local: "Local Leadership",
  division: "Division Leadership",
  staff: "Staff",
};

const SCOPE_ORDER: OfficerScope[] = ["local", "division", "staff"];

export default function AdminOfficersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAuthorized = !!user && (user.role === "localAdmin" || user.role === "superAdmin");

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) router.replace("/");
  }, [user, loading, isAuthorized, router]);

  const load = () => {
    setBusy(true);
    api.get<{ officers: Officer[] }>("/admin/officers")
      .then(r => setOfficers(r.officers))
      .catch(e => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    if (isAuthorized) load();
  }, [isAuthorized]);

  if (loading || !user) return <main style={{ padding: 24, color: C.m }}>Loading…</main>;
  if (!isAuthorized) return null;

  const grouped: Record<OfficerScope, Officer[]> = { local: [], division: [], staff: [] };
  for (const o of officers) grouped[o.scope].push(o);

  return (
    <main style={{ minHeight: "100vh", padding: "24px 20px 60px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>Officers</h1>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>
            Local roster — appears on the public Leadership page
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/admin/officers/new")} style={{ padding: "8px 14px", borderRadius: 10, background: C.gold, border: "none", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            + Add Officer
          </button>
          <button onClick={() => router.push("/admin")} style={{ padding: "8px 14px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bd}`, color: C.m, fontSize: 12, cursor: "pointer" }}>
            ← Admin
          </button>
        </div>
      </div>

      {err && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 14, fontSize: 13, background: "rgba(173,27,39,.10)", border: `1px solid rgba(173,27,39,.35)`, color: C.red }}>
          {err}
        </div>
      )}
      {busy && <div style={{ color: C.m, fontSize: 13, marginBottom: 12 }}>Loading…</div>}

      {SCOPE_ORDER.map(scope => {
        const items = grouped[scope];
        if (items.length === 0) return null;
        return (
          <section key={scope} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
              {SCOPE_LABEL[scope]} ({items.length})
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map(o => (
                <OfficerRow key={o.id} officer={o} onClick={() => router.push(`/admin/officers/${o.id}`)} />
              ))}
            </div>
          </section>
        );
      })}

      {officers.length === 0 && !busy && (
        <div style={{ padding: 32, textAlign: "center", color: C.m, fontSize: 13, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}`, borderRadius: 16 }}>
          No officers yet. <a onClick={() => router.push("/admin/officers/new")} style={{ color: C.white, cursor: "pointer", textDecoration: "underline" }}>Add the first one →</a>
        </div>
      )}
    </main>
  );
}

function OfficerRow({ officer, onClick }: { officer: Officer; onClick: () => void }) {
  const initials = officer.name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", padding: 12, borderRadius: 12,
        background: officer.active ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.015)",
        border: `1px solid ${C.bd}`, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
        opacity: officer.active ? 1 : 0.55,
      }}
    >
      {officer.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={officer.photoUrl} alt={officer.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1A1F4D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {initials || "?"}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{officer.name}</div>
        <div style={{ fontSize: 12, color: C.m, marginTop: 2 }}>
          {officer.title}
          {officer.division && <> · {officer.division.name}</>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.m }}>
        {!officer.active && <span style={{ marginRight: 8 }}>(inactive)</span>}
        order: {officer.displayOrder}
      </div>
    </button>
  );
}
