import Link from "next/link";
import { brand } from "@/config/brand";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: `Divisions — ${brand.unionName}`,
  description: `${brand.unionName} represents members across five divisions: MaBSTOA, MTA Bus, MSII, Queens, and TSC.`,
};

export const dynamic = "force-dynamic";

export default async function DivisionsPage() {
  const divisions = await prisma.division.findMany({
    include: {
      subUnits: { select: { id: true, code: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <article style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px 96px" }}>
      <p style={{
        fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
        color: brand.colors.accent, margin: "0 0 14px",
      }}>
        Divisions
      </p>
      <h1 style={{
        fontSize: "clamp(34px, 5vw, 44px)", fontWeight: 800, color: brand.colors.navy,
        margin: "0 0 16px", letterSpacing: -0.5, lineHeight: 1.1,
      }}>
        Our Divisions
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: brand.colors.mutedForeground, margin: "0 0 48px", maxWidth: 720 }}>
        {brand.unionName} represents members across five operating divisions.
        Each division has its own officers, contracts, and meetings — plus
        sub-units within MaBSTOA and MTA Bus organized by transportation and
        maintenance.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }}>
        {divisions.map(d => (
          <Link
            key={d.id}
            href={`/divisions/${d.code}`}
            style={{
              display: "block", padding: 24, borderRadius: 14,
              background: "#FFFFFF", border: `1px solid #E5E7EB`,
              textDecoration: "none", color: "inherit",
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
              padding: "3px 9px", borderRadius: 999,
              background: "#F1F4F9", color: brand.colors.navy,
              display: "inline-block", marginBottom: 14,
            }}>
              {d.code}
            </span>
            <h2 style={{ fontSize: 21, fontWeight: 700, color: brand.colors.navy, margin: "0 0 10px" }}>
              {d.name}
            </h2>
            {d.description && (
              <p style={{ fontSize: 14, lineHeight: 1.55, color: brand.colors.mutedForeground, margin: "0 0 12px" }}>
                {d.description}
              </p>
            )}
            {d.subUnits.length > 0 && (
              <p style={{ fontSize: 12, color: brand.colors.mutedForeground, margin: 0 }}>
                Sub-units: {d.subUnits.map(s => s.name).join(", ")}
              </p>
            )}
            <p style={{ fontSize: 13, color: brand.colors.accent, margin: "16px 0 0", fontWeight: 600 }}>
              Visit division →
            </p>
          </Link>
        ))}
      </div>

      {divisions.length === 0 && (
        <div style={{
          padding: 48, textAlign: "center", color: brand.colors.mutedForeground,
          fontSize: 15, background: "#F8FAFC", border: `1px solid #E5E7EB`, borderRadius: 16,
        }}>
          Division information will be available soon.
        </div>
      )}

      <hr style={{ border: 0, borderTop: `1px solid #E5E7EB`, margin: "56px 0 32px" }} />
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: brand.colors.navy, margin: "0 0 12px" }}>
          About sub-units
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: brand.colors.mutedForeground, margin: 0, maxWidth: 720 }}>
          Within MaBSTOA and MTA Bus, members are further organized into{" "}
          <strong style={{ color: brand.colors.navy }}>transportation</strong> and{" "}
          <strong style={{ color: brand.colors.navy }}>maintenance</strong> sub-units.
          Each sub-unit has its own contract terms and shop-floor concerns,
          while still being part of the parent division.
        </p>
      </div>
    </article>
  );
}
