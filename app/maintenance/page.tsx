export default function MaintenancePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
      <div>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#1A1F4D,#0F1234)", border: "2px solid #AD1B27", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#AD1B27", lineHeight: 1.1, textAlign: "center" }}>TSO</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Down for Maintenance</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>
          TWU Local 106 Connect is temporarily offline for scheduled maintenance. We&apos;ll be back shortly.
        </p>
      </div>
    </div>
  );
}
