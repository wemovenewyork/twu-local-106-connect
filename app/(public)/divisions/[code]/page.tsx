import { brand } from "@/config/brand";

export default async function DivisionPublicPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: brand.colors.accent,
          margin: "0 0 12px",
        }}
      >
        Division
      </p>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: brand.colors.navy, margin: "0 0 16px", letterSpacing: -0.5 }}>
        {code.toUpperCase()}
      </h1>
      <p style={{ fontSize: 16, color: brand.colors.mutedForeground, lineHeight: 1.7 }}>
        Coming soon — Phase 4.
      </p>
    </div>
  );
}
