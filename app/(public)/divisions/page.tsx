import { brand } from "@/config/brand";

export const metadata = {
  title: `Divisions — ${brand.unionName}`,
  description: `Divisions of ${brand.unionName} — MaBSTOA, MTA Bus, MSII, Queens, TSC.`,
};

export default function DivisionsPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: brand.colors.navy, margin: "0 0 16px", letterSpacing: -0.5 }}>
        Our Divisions
      </h1>
      <p style={{ fontSize: 16, color: brand.colors.mutedForeground, lineHeight: 1.7 }}>
        Coming soon — Phase 4.
      </p>
    </div>
  );
}
