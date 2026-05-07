import Link from "next/link";
import { brand } from "@/config/brand";

export const metadata = {
  title: `${brand.unionName} — ${brand.organizationName}`,
  description: `Official website of ${brand.unionName}, the ${brand.organizationName} representing transit supervisors across MaBSTOA, MTA Bus, and Staten Island.`,
};

export default function PublicHome() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
      <div style={{ maxWidth: 720 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: brand.colors.accent,
            margin: "0 0 16px",
          }}
        >
          {brand.organizationName}
        </p>
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.05,
            color: brand.colors.navy,
            margin: "0 0 20px",
          }}
        >
          TWU Local 106
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.65,
            color: brand.colors.mutedForeground,
            margin: "0 0 32px",
          }}
        >
          Representing transit supervisors across MaBSTOA, MTA Bus, and Staten
          Island. This site is being rebuilt — full content lands in Phase 4.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link
            href="/login"
            style={{
              background: brand.colors.accent,
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Member Sign In →
          </Link>
          <Link
            href="/about"
            style={{
              background: "transparent",
              color: brand.colors.navy,
              padding: "14px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              border: `1.5px solid ${brand.colors.navy}`,
            }}
          >
            About the Local
          </Link>
        </div>
      </div>
    </div>
  );
}
