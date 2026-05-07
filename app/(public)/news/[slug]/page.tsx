import { brand } from "@/config/brand";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px" }}>
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
        News
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: brand.colors.navy, margin: "0 0 16px", letterSpacing: -0.5, lineHeight: 1.15 }}>
        Article: {slug}
      </h1>
      <p style={{ fontSize: 16, color: brand.colors.mutedForeground, lineHeight: 1.7 }}>
        Coming soon — Phase 4.
      </p>
    </div>
  );
}
