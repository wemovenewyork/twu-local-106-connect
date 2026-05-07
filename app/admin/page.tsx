"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C, CM } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const PURPLE = "#C084FC";

interface Stats {
  totalUsers: number; totalSwaps: number; openSwaps: number;
  pendingReports: number; totalDivisions: number; completedAgreements: number;
}

interface Report {
  id: string; reason: string | null; createdAt: string;
  swap: { id: string; details: string; category: string; posterName: string; division: { name: string; code: string } };
  reporter: { id: string; firstName: string; lastName: string };
}

interface AdminUser {
  id: string; firstName: string; lastName: string; email: string;
  role: "member" | "contributor" | "editor" | "divisionAdmin" | "localAdmin" | "superAdmin"; createdAt: string;
  lastActiveAt: string | null; suspendedUntil: string | null;
  division: { name: string; code: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  member: C.blue, contributor: C.blue, editor: C.gold, divisionAdmin: C.gold, localAdmin: "#F97316", superAdmin: PURPLE,
};

const lb: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"reports" | "users" | "audit" | "broadcast">("reports");
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQ, setUserQ] = useState("");
  const [divisions, setDivisions] = useState<{ id: string; name: string; code: string }[]>([]);
  const [pendingDivision, setPendingDivision] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; detail: string | null; createdAt: string; ip: string | null; admin: { firstName: string; lastName: string; email: string } }[]>([]);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{
    id: string; firstName: string; lastName: string; email: string; role: string;
    createdAt: string; division: { name: string; code: string } | null;
    flexibleMode: boolean; reputation: { score: number; label: string; completed: number; cancelled: number; noShow: number };
    swapCount: number; messageCount: number;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [bcTarget, setBcTarget] = useState<"all" | "user" | "division">("all");
  const [bcUserId, setBcUserId] = useState("");
  const [bcUserName, setBcUserName] = useState("");
  const [bcUserQ, setBcUserQ] = useState("");
  const [bcDivisionCode, setBcDivisionCode] = useState("");
  const [bcDivisionName, setBcDivisionName] = useState("");
  const [bcDivisionQ, setBcDivisionQ] = useState("");
  const [bcText, setBcText] = useState("");
  const [bcSending, setBcSending] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !["superAdmin", "localAdmin"].includes(user.role)) router.replace("/divisions");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !["superAdmin", "localAdmin"].includes(user.role)) return;
    api.get<Stats>("/admin/stats").then(setStats).catch(() => {});
    api.get<Report[]>("/admin/reports").then(setReports).catch(() => {});
    api.get<{ id: string; name: string; code: string }[]>("/divisions").then(setDivisions).catch(() => {});
  }, [user]);

  useEffect(() => {
    if ((tab !== "users" && !(tab === "broadcast" && bcTarget === "user")) || !user || !["superAdmin", "localAdmin"].includes(user.role)) return;
    api.get<AdminUser[]>(`/admin/users${userQ ? `?q=${encodeURIComponent(userQ)}` : ""}`).then(setUsers).catch(() => {});
  }, [tab, userQ, user, bcTarget]);

  useEffect(() => {
    if (tab !== "audit" || !user || user.role !== "superAdmin") return;
    api.get<typeof auditLogs>("/admin/audit-log").then(setAuditLogs).catch(() => {});
  }, [tab, user]);

  const handleReport = async (reportId: string, action: "dismiss" | "remove") => {
    setBusy(reportId);
    try {
      await api.patch("/admin/reports", { reportId, action });
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (stats) setStats({ ...stats, pendingReports: stats.pendingReports - 1 });
      showToast(action === "remove" ? "Swap removed" : "Report dismissed");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(null); }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    if (role === "divisionAdmin") {
      // Stage the role change — wait for division selection before calling API
      setPendingDivision(prev => ({ ...prev, [userId]: "" }));
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as AdminUser["role"] } : u));
      return;
    }
    // Clear any pending division selection if switching away from depotRep
    setPendingDivision(prev => { const next = { ...prev }; delete next[userId]; return next; });
    setBusy(userId);
    try {
      await api.patch("/admin/users", { userId, role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as AdminUser["role"] } : u));
      showToast("Role updated");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update role");
    } finally { setBusy(null); }
  };

  const handleDivisionRepConfirm = async (userId: string) => {
    const divisionId = pendingDivision[userId];
    if (!divisionId) { showToast("Select a division first"); return; }
    setBusy(userId);
    try {
      const updated = await api.patch<AdminUser>("/admin/users", { userId, role: "divisionAdmin", divisionId });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
      setPendingDivision(prev => { const next = { ...prev }; delete next[userId]; return next; });
      showToast("Division rep assigned");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  const openProfile = async (userId: string) => {
    setProfileUserId(userId);
    setProfileData(null);
    setProfileLoading(true);
    try {
      const data = await api.get<typeof profileData>(`/admin/users/${userId}`);
      setProfileData(data);
    } catch { showToast("Failed to load profile"); setProfileUserId(null); }
    finally { setProfileLoading(false); }
  };

  const handleBroadcast = async () => {
    if (!bcText.trim() || bcSending) return;
    if (bcTarget === "user" && !bcUserId) { showToast("Select a user"); return; }
    if (bcTarget === "division" && !bcDivisionCode) { showToast("Select a division"); return; }
    setBcSending(true);
    try {
      const body: Record<string, string> = { target: bcTarget, text: bcText.trim() };
      if (bcTarget === "user") body.userId = bcUserId;
      if (bcTarget === "division") body.divisionCode = bcDivisionCode;
      const res = await api.post<{ sent: number }>("/admin/broadcast", body);
      showToast(`Sent to ${res.sent} user${res.sent !== 1 ? "s" : ""}`);
      setBcText("");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Send failed");
    } finally { setBcSending(false); }
  };

  const handleBulkRoleChange = async () => {
    if (!bulkRole || selectedUsers.size === 0 || bulkBusy) return;
    if (bulkRole === "divisionAdmin") { showToast("Division rep requires individual division assignment"); return; }
    setBulkBusy(true);
    try {
      await Promise.all([...selectedUsers].map(userId =>
        api.patch("/admin/users", { userId, role: bulkRole })
      ));
      setUsers(prev => prev.map(u => selectedUsers.has(u.id) ? { ...u, role: bulkRole as AdminUser["role"] } : u));
      setSelectedUsers(new Set());
      setBulkRole("");
      showToast(`Role updated for ${selectedUsers.size} user${selectedUsers.size !== 1 ? "s" : ""}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Bulk update failed");
    } finally { setBulkBusy(false); }
  };

  const handleBulkSuspend = async () => {
    if (selectedUsers.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    const suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await Promise.all([...selectedUsers].map(userId =>
        api.patch("/admin/users", { userId, suspendedUntil })
      ));
      setUsers(prev => prev.map(u => selectedUsers.has(u.id) ? { ...u, suspendedUntil } : u));
      setSelectedUsers(new Set());
      showToast(`Suspended ${selectedUsers.size} user${selectedUsers.size !== 1 ? "s" : ""} for 7 days`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Bulk suspend failed");
    } finally { setBulkBusy(false); }
  };

  const handleBulkExport = () => {
    const selected = users.filter(u => selectedUsers.has(u.id));
    const data = selected.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email ?? "", role: u.role, division: u.division?.name ?? "", lastActiveAt: u.lastActiveAt, suspendedUntil: u.suspendedUntil }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `local106-users-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectUser = (id: string) => setSelectedUsers(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleDeleteUser = async (userId: string) => {
    setBusy(userId);
    try {
      await api.delete("/admin/users", { userId });
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      showToast("User deleted");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Delete failed");
    } finally { setBusy(null); }
  };

  const handleSuspend = async (userId: string) => {
    setBusy(userId + "_suspend");
    try {
      const suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await api.patch("/admin/users", { userId, suspendedUntil });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspendedUntil } : u));
      showToast("User suspended for 7 days");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Suspend failed");
    } finally { setBusy(null); }
  };

  const isLocalAdmin = user?.role === "localAdmin";
  if (!user || !["superAdmin", "localAdmin"].includes(user.role)) return null;

  const statCards = stats ? [
    { l: "Users", v: stats.totalUsers, c: C.blue },
    { l: "Divisions", v: stats.totalDivisions, c: C.gold },
    { l: "Total Swaps", v: stats.totalSwaps, c: "#00C9A7" },
    { l: "Open Swaps", v: stats.openSwaps, c: "#2ED573" },
    { l: "Agreements", v: stats.completedAgreements, c: PURPLE },
    { l: "Reports", v: stats.pendingReports, c: stats.pendingReports > 0 ? C.red : C.m },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(26,31,77,.9)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/divisions")} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.white }}>Admin Dashboard</div>
          <div style={{ fontSize: 10, color: isLocalAdmin ? "#F97316" : PURPLE, letterSpacing: 2, textTransform: "uppercase" }}>{isLocalAdmin ? "Local Admin" : "System Overview"}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: PURPLE + "18", border: `1px solid ${PURPLE}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="shield" s={18} c={PURPLE} />
        </div>
      </div>

      <main id="main-content" tabIndex={-1} style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => router.push("/admin/registrations")}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span>Registration approvals</span>
            <span style={{ color: C.gold, fontSize: 12 }}>Review queue →</span>
          </button>
        </div>

        {/* Stats grid */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
            {statCards.map(s => (
              <div key={s.l} style={{ padding: "12px 10px", borderRadius: 14, background: s.c + "12", border: `1px solid ${s.c}22`, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {(() => {
          const tabs = ["reports", "users", ...(isLocalAdmin ? [] : ["audit"]), "broadcast"] as const;
          return (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 4, background: C.s, borderRadius: 12, padding: 4, marginBottom: 16 }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t as typeof tab)} style={{ padding: "10px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: tab === t ? PURPLE + "22" : "transparent", color: tab === t ? PURPLE : C.m, boxShadow: tab === t ? `inset 0 0 0 1px ${PURPLE}44` : "none" }}>
                  {t === "reports" ? `Reports${stats?.pendingReports ? ` (${stats.pendingReports})` : ""}` : t === "users" ? "Users" : t === "audit" ? "Audit" : "Broadcast"}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Reports tab */}
        {tab === "reports" && (
          <div style={{ display: "grid", gap: 10 }}>
            {reports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: C.m }}>
                <Icon n="chk" s={36} c="#2ED573" />
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginTop: 12 }}>No pending reports</div>
                <div style={{ fontSize: 12, color: C.m, marginTop: 6 }}>All clear across all divisions.</div>
              </div>
            ) : reports.map(r => {
              const colors = CM[r.swap.category as keyof typeof CM] ?? CM.work;
              const isBusy = busy === r.id;
              return (
                <div key={r.id} style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, border: `1px solid ${C.red}22`, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: colors.c, textTransform: "uppercase", letterSpacing: 1 }}>{r.swap.category}</span>
                        <span style={{ fontSize: 10, color: C.m }}>·</span>
                        <span style={{ fontSize: 10, color: C.m }}>{r.swap.division.name}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 4 }}>
                        {r.swap.posterName} — {r.swap.details.substring(0, 80)}{r.swap.details.length > 80 ? "…" : ""}
                      </div>
                      <div style={{ fontSize: 11, color: C.m }}>
                        Reported by {r.reporter.firstName} {r.reporter.lastName}
                        {r.reason ? ` · "${r.reason}"` : ""} · {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => handleReport(r.id, "dismiss")} disabled={isBusy} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 12, fontWeight: 600, opacity: isBusy ? 0.5 : 1 }}>
                      Dismiss
                    </button>
                    <button onClick={() => handleReport(r.id, "remove")} disabled={isBusy} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.red}44`, background: C.red + "12", color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: isBusy ? 0.5 : 1 }}>
                      Remove Swap
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="admin-user-search" style={lb}>Search Users</label>
              <input id="admin-user-search" value={userQ} onChange={e => { setUserQ(e.target.value); setSelectedUsers(new Set()); }} placeholder="Name or email..." style={{ height: 44 }} />
            </div>

            {/* Bulk action toolbar */}
            {!isLocalAdmin && users.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "10px 14px", borderRadius: 12, background: selectedUsers.size > 0 ? PURPLE + "12" : "rgba(255,255,255,.03)", border: `1px solid ${selectedUsers.size > 0 ? PURPLE + "44" : C.bd}`, transition: "all .2s" }}>
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.filter(u => u.id !== user.id).length && users.length > 0}
                  onChange={e => setSelectedUsers(e.target.checked ? new Set(users.filter(u => u.id !== user.id).map(u => u.id)) : new Set())}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: PURPLE, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: selectedUsers.size > 0 ? PURPLE : C.m, fontWeight: 600, flex: 1 }}>
                  {selectedUsers.size > 0 ? `${selectedUsers.size} selected` : "Select all"}
                </span>
                {selectedUsers.size > 0 && (
                  <>
                    <select
                      value={bulkRole}
                      onChange={e => setBulkRole(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${PURPLE}44`, background: PURPLE + "10", color: PURPLE, fontSize: 12, cursor: "pointer", appearance: "auto" }}
                    >
                      <option value="">— Set role —</option>
                      <option value="member">Member</option>
                      <option value="localAdmin">Local Admin</option>
                      <option value="superAdmin">Super Admin</option>
                    </select>
                    <button
                      onClick={handleBulkRoleChange}
                      disabled={!bulkRole || bulkBusy}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: PURPLE, color: "#fff", fontSize: 12, fontWeight: 700, opacity: !bulkRole || bulkBusy ? 0.5 : 1 }}
                    >
                      {bulkBusy ? "…" : "Apply"}
                    </button>
                    <button
                      onClick={handleBulkSuspend}
                      disabled={bulkBusy}
                      title="Suspend selected users for 7 days"
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.gold}44`, background: C.gold + "10", color: C.gold, cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: bulkBusy ? 0.5 : 1, whiteSpace: "nowrap" }}
                    >
                      Suspend 7d
                    </button>
                    <button
                      onClick={handleBulkExport}
                      title="Export selected users as JSON"
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.05)", color: C.m, cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      Export
                    </button>
                  </>
                )}
              </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              {users.map(u => {
                const rc = ROLE_COLORS[u.role] ?? C.m;
                const isBusy = busy === u.id;
                const isConfirming = deleteConfirm === u.id;
                const isSelf = u.id === user.id;
                const isSelected = selectedUsers.has(u.id);
                return (
                  <div key={u.id} style={{ background: isConfirming ? C.red + "08" : isSelected ? PURPLE + "08" : "rgba(255,255,255,.03)", borderRadius: 14, border: `1px solid ${isConfirming ? C.red + "33" : isSelected ? PURPLE + "44" : C.bd}`, padding: "14px 16px", transition: "all .2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {!isLocalAdmin && !isSelf && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(u.id)}
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: PURPLE, flexShrink: 0 }}
                        />
                      )}
                      <button onClick={() => openProfile(u.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1, minWidth: 0, textAlign: "left" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: rc + "18", border: `1px solid ${rc}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: rc, flexShrink: 0 }}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{u.firstName} {u.lastName}</span>
                            {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: C.red, background: C.red + "18", border: `1px solid ${C.red}33`, padding: "2px 6px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 1 }}>Suspended</span>
                            )}
                          </div>
                          {!isLocalAdmin && u.email && <div style={{ fontSize: 11, color: C.m, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>}
                          {u.division && <div style={{ fontSize: 10, color: C.gold, marginTop: 2 }}>{u.division.name}</div>}
                          {u.lastActiveAt && (
                            <div style={{ fontSize: 10, color: C.m, marginTop: 2 }}>
                              Active {Math.floor((Date.now() - new Date(u.lastActiveAt).getTime()) / 86400000)} days ago
                            </div>
                          )}
                        </div>
                      </button>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        {!isLocalAdmin && (
                          <select
                            value={u.role}
                            disabled={isBusy || isConfirming}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${rc}44`, background: rc + "12", color: rc, fontSize: 12, fontWeight: 700, cursor: "pointer", appearance: "auto", opacity: isBusy || isConfirming ? 0.5 : 1 }}
                          >
                            <option value="member">Member</option>
                            <option value="contributor">Contributor</option>
                            <option value="editor">Editor</option>
                            <option value="divisionAdmin">Division Admin</option>
                            <option value="localAdmin">Local Admin</option>
                            <option value="superAdmin">Super Admin</option>
                          </select>
                        )}
                        {isLocalAdmin && (
                          <span style={{ padding: "4px 10px", borderRadius: 8, background: rc + "18", border: `1px solid ${rc}33`, fontSize: 11, fontWeight: 700, color: rc }}>{u.role}</span>
                        )}
                        {u.role === "divisionAdmin" && u.division && pendingDivision[u.id] === undefined && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, textAlign: "right" }}>{u.division.name} ({u.division.code})</div>
                        )}
                        {pendingDivision[u.id] !== undefined && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <select
                              value={pendingDivision[u.id]}
                              onChange={e => setPendingDivision(prev => ({ ...prev, [u.id]: e.target.value }))}
                              style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.gold}44`, background: C.gold + "10", color: C.gold, fontSize: 12, cursor: "pointer", appearance: "auto" }}
                            >
                              <option value="">— Select division —</option>
                              {divisions.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                            </select>
                            <button
                              onClick={() => handleDivisionRepConfirm(u.id)}
                              disabled={!pendingDivision[u.id] || isBusy}
                              style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: C.gold, color: C.bg, fontSize: 12, fontWeight: 700, opacity: !pendingDivision[u.id] || isBusy ? 0.5 : 1 }}
                            >
                              {isBusy ? "…" : "Confirm"}
                            </button>
                          </div>
                        )}
                        {!isLocalAdmin && !isSelf && pendingDivision[u.id] === undefined && (
                          <button
                            onClick={() => handleSuspend(u.id)}
                            disabled={busy === u.id + "_suspend" || isConfirming || !!(u.suspendedUntil && new Date(u.suspendedUntil) > new Date())}
                            style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.gold}44`, background: "transparent", color: C.gold, cursor: "pointer", fontSize: 11, fontWeight: 600, opacity: (busy === u.id + "_suspend" || !!(u.suspendedUntil && new Date(u.suspendedUntil) > new Date())) ? 0.4 : 1 }}
                          >
                            {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() ? "Suspended" : "Suspend"}
                          </button>
                        )}
                        {!isLocalAdmin && !isSelf && pendingDivision[u.id] === undefined && (
                          <button
                            onClick={() => setDeleteConfirm(isConfirming ? null : u.id)}
                            disabled={isBusy}
                            style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.red}44`, background: isConfirming ? C.red + "20" : "transparent", color: C.red, cursor: "pointer", fontSize: 11, fontWeight: 600, opacity: isBusy ? 0.5 : 1 }}
                          >
                            {isConfirming ? "Cancel" : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline delete confirmation */}
                    {isConfirming && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.red}22`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.5 }}>
                          This will permanently anonymize <strong style={{ color: C.white }}>{u.firstName} {u.lastName}</strong>. Their swap history is preserved but name and email are removed. This cannot be undone.
                        </div>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={isBusy}
                          style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: C.red, color: "#fff", fontSize: 13, fontWeight: 700, opacity: isBusy ? 0.6 : 1, whiteSpace: "nowrap" }}
                        >
                          {isBusy ? "Deleting…" : "Confirm Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {users.length === 0 && userQ && (
                <div style={{ textAlign: "center", padding: "32px 20px", color: C.m, fontSize: 13 }}>No users found</div>
              )}
            </div>
          </div>
        )}
        {/* Broadcast tab */}
        {tab === "broadcast" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ padding: "14px 16px", borderRadius: 14, background: PURPLE + "0c", border: `1px solid ${PURPLE}22` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>Send Message</div>
              <div style={{ fontSize: 11, color: C.m }}>Messages appear in recipient inboxes and trigger a push notification.</div>
            </div>

            {/* Target selector */}
            <div>
              <label style={lb}>Send To</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {(["all", "division", "user"] as const).filter(t => !(isLocalAdmin && t === "all")).map(t => (
                  <button
                    key={t}
                    onClick={() => setBcTarget(t)}
                    style={{ padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: bcTarget === t ? PURPLE + "22" : "rgba(255,255,255,.04)", color: bcTarget === t ? PURPLE : C.m, boxShadow: bcTarget === t ? `inset 0 0 0 1px ${PURPLE}44` : `inset 0 0 0 1px rgba(255,255,255,.06)` }}
                  >
                    {t === "all" ? "All Users" : t === "division" ? "A Division" : "One User"}
                  </button>
                ))}
              </div>
            </div>

            {/* Division search */}
            {bcTarget === "division" && (
              <div>
                <label style={lb}>Search Division</label>
                {bcDivisionCode ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: PURPLE + "0c", border: `1px solid ${PURPLE}33` }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.white }}>{bcDivisionName}</div>
                    <button onClick={() => { setBcDivisionCode(""); setBcDivisionName(""); setBcDivisionQ(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.m, padding: 0 }}>Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={bcDivisionQ}
                      onChange={e => setBcDivisionQ(e.target.value)}
                      placeholder="Type division name…"
                      style={{ height: 44, marginBottom: 6 }}
                    />
                    {bcDivisionQ.trim() && (
                      <div style={{ borderRadius: 12, border: `1px solid ${C.bd}`, overflow: "hidden" }}>
                        {divisions.filter(d => d.name.toLowerCase().includes(bcDivisionQ.toLowerCase())).slice(0, 6).map(d => (
                          <button
                            key={d.code}
                            onClick={() => { setBcDivisionCode(d.code); setBcDivisionName(d.name); setBcDivisionQ(""); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "rgba(255,255,255,.03)", border: "none", borderBottom: `1px solid ${C.bd}`, cursor: "pointer", fontSize: 13, color: C.white }}
                          >
                            {d.name} <span style={{ fontSize: 11, color: C.m }}>({d.code})</span>
                          </button>
                        ))}
                        {divisions.filter(d => d.name.toLowerCase().includes(bcDivisionQ.toLowerCase())).length === 0 && (
                          <div style={{ padding: "10px 14px", fontSize: 12, color: C.m }}>No divisions found</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* User search */}
            {bcTarget === "user" && (
              <div>
                <label style={lb}>Search User</label>
                {bcUserId ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: PURPLE + "0c", border: `1px solid ${PURPLE}33` }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.white }}>{bcUserName}</div>
                    <button onClick={() => { setBcUserId(""); setBcUserName(""); setBcUserQ(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.m, padding: 0 }}>Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={bcUserQ}
                      onChange={e => setBcUserQ(e.target.value)}
                      placeholder="Type name or email…"
                      style={{ height: 44, marginBottom: 6 }}
                    />
                    {bcUserQ.trim() && (
                      <div style={{ borderRadius: 12, border: `1px solid ${C.bd}`, overflow: "hidden" }}>
                        {users.filter(u =>
                          `${u.firstName} ${u.lastName}`.toLowerCase().includes(bcUserQ.toLowerCase()) ||
                          (u.email && u.email.toLowerCase().includes(bcUserQ.toLowerCase()))
                        ).slice(0, 6).map(u => (
                          <button
                            key={u.id}
                            onClick={() => { setBcUserId(u.id); setBcUserName(`${u.firstName} ${u.lastName}`); setBcUserQ(""); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "rgba(255,255,255,.03)", border: "none", borderBottom: `1px solid ${C.bd}`, cursor: "pointer", fontSize: 13, color: C.white }}
                          >
                            {u.firstName} {u.lastName}
                            {u.email && <span style={{ fontSize: 11, color: C.m }}> · {u.email}</span>}
                            {u.division && <span style={{ fontSize: 11, color: C.gold }}> · {u.division.name}</span>}
                          </button>
                        ))}
                        {users.filter(u =>
                          `${u.firstName} ${u.lastName}`.toLowerCase().includes(bcUserQ.toLowerCase()) ||
                          (u.email && u.email.toLowerCase().includes(bcUserQ.toLowerCase()))
                        ).length === 0 && (
                          <div style={{ padding: "10px 14px", fontSize: 12, color: C.m }}>No users found</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Message */}
            <div>
              <label style={lb}>Message</label>
              <textarea
                value={bcText}
                onChange={e => setBcText(e.target.value)}
                placeholder="Type your message…"
                rows={4}
                maxLength={1000}
                style={{ resize: "none" }}
              />
              <div style={{ fontSize: 10, color: bcText.length > 900 ? C.red : C.m, textAlign: "right", marginTop: 4 }}>
                {bcText.length}/1000
              </div>
            </div>

            <button
              onClick={handleBroadcast}
              disabled={!bcText.trim() || bcSending || (bcTarget === "user" && !bcUserId) || (bcTarget === "division" && !bcDivisionCode)}
              style={{ padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${PURPLE},${PURPLE}cc)`, color: "#fff", fontSize: 14, fontWeight: 700, opacity: (!bcText.trim() || bcSending || (bcTarget === "user" && !bcUserId) || (bcTarget === "division" && !bcDivisionCode)) ? 0.5 : 1 }}
            >
              {bcSending ? "Sending…" : bcTarget === "all" ? "Send to All Users" : bcTarget === "division" ? "Send to Division" : "Send to User"}
            </button>
          </div>
        )}

        {/* Audit Log tab */}
        {tab === "audit" && (
          <div style={{ display: "grid", gap: 8 }}>
            {auditLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: C.m }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>No audit logs yet</div>
                <div style={{ fontSize: 12, color: C.m, marginTop: 6 }}>Admin actions will appear here.</div>
              </div>
            ) : auditLogs.map(log => (
              <div key={log.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid ${C.bd}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: "uppercase", letterSpacing: 1 }}>{log.action.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 10, color: C.m }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginBottom: 4 }}>{log.detail}</div>
                <div style={{ fontSize: 10, color: C.m }}>by {log.admin.firstName} {log.admin.lastName} ({log.admin.email}){log.ip ? ` · ${log.ip}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* User Profile Modal */}
      {profileUserId && (
        <div
          onClick={() => { setProfileUserId(null); setProfileData(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, background: "#1A1F4D", border: `1px solid ${C.bd}`, borderRadius: "20px 20px 0 0", padding: "24px 20px 36px", maxHeight: "80vh", overflowY: "auto" }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,.15)", margin: "0 auto 20px" }} />

            {profileLoading && (
              <div style={{ display: "grid", gap: 10 }}>
                {[80, 60, 60, 40].map((w, i) => <div key={i} className="skeleton" style={{ height: w, borderRadius: 12 }} />)}
              </div>
            )}

            {profileData && (() => {
              const rc = ROLE_COLORS[profileData.role] ?? C.m;
              return (
                <div style={{ display: "grid", gap: 16 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: rc + "18", border: `2px solid ${rc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: rc, flexShrink: 0 }}>
                      {profileData.firstName[0]}{profileData.lastName[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: C.white }}>{profileData.firstName} {profileData.lastName}</div>
                      {profileData.email && !isLocalAdmin && <div style={{ fontSize: 12, color: C.m, marginTop: 2 }}>{profileData.email}</div>}
                      <span style={{ display: "inline-block", marginTop: 4, padding: "2px 10px", borderRadius: 8, background: rc + "18", border: `1px solid ${rc}33`, fontSize: 11, fontWeight: 700, color: rc }}>
                        {profileData.role}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { l: "Swaps Posted", v: profileData.swapCount, c: C.blue },
                      { l: "Messages Sent", v: profileData.messageCount, c: "#C084FC" },
                      { l: "Rep Score", v: profileData.reputation.score, c: C.gold },
                    ].map(s => (
                      <div key={s.l} style={{ padding: "12px 10px", borderRadius: 12, background: s.c + "12", border: `1px solid ${s.c}22`, textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Details */}
                  <div style={{ display: "grid", gap: 8 }}>
                    {profileData.division && (
                      <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: C.m }}>Division</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{profileData.division.name}</span>
                      </div>
                    )}
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: C.m }}>Joined</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: C.m }}>Reputation</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>{profileData.reputation.label} · {profileData.reputation.completed} completed</span>
                    </div>
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: C.m }}>Flexible Mode</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: profileData.flexibleMode ? "#00C9A7" : C.m }}>{profileData.flexibleMode ? "On" : "Off"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setProfileUserId(null); setProfileData(null); }}
                    style={{ padding: "12px", borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(26,31,77,.95)", backdropFilter: "blur(16px)", border: `1px solid ${C.bd}`, borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 600, color: C.white, zIndex: 500, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
