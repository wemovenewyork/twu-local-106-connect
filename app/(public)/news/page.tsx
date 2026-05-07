import Link from "next/link";
import { brand } from "@/config/brand";
import { getPublicNews, newsExcerpt } from "@/lib/news";

export const metadata = {
  title: `News — ${brand.unionName}`,
  description: `Latest news and announcements from ${brand.unionName}.`,
};

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default async function NewsPage() {
  const items = await getPublicNews({ limit: 25 });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: brand.colors.navy,
          margin: "0 0 12px",
          letterSpacing: -0.5,
        }}
      >
        News
      </h1>
      <p style={{ fontSize: 16, color: brand.colors.mutedForeground, margin: "0 0 36px" }}>
        Updates from {brand.unionName}.
      </p>

      {items.length === 0 ? (
        <div
          style={{
            padding: 32,
            border: "1px dashed #E5E7EB",
            borderRadius: 12,
            textAlign: "center",
            color: brand.colors.mutedForeground,
            fontSize: 14,
          }}
        >
          No news posts yet.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={`/news/${n.publicSlug}`}
                style={{
                  display: "block",
                  padding: 24,
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  textDecoration: "none",
                  background: "#fff",
                  color: brand.colors.navy,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12,
                    color: brand.colors.mutedForeground,
                    margin: "0 0 8px",
                  }}
                >
                  {n.division ? (
                    <span
                      style={{
                        background: brand.colors.muted,
                        color: brand.colors.navy,
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {n.division.code}
                    </span>
                  ) : (
                    <span
                      style={{
                        background: brand.colors.muted,
                        color: brand.colors.navy,
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      Local-Wide
                    </span>
                  )}
                  <span>{formatDate(n.publishedAt)}</span>
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.3 }}>
                  {n.title}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: brand.colors.mutedForeground,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {newsExcerpt(n.body)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
