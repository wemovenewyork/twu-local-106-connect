import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { prisma } from "@/lib/prisma";
import { newsExcerpt } from "@/lib/news";

export const dynamic = "force-dynamic";

function formatDate(d: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("") || "?";
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const division = await prisma.division.findUnique({
    where: { code: code.toUpperCase() },
    select: { name: true, description: true },
  });
  if (!division) return {};
  return {
    title: `${division.name} — ${brand.unionName}`,
    description: division.description ?? `${division.name} division of ${brand.unionName}.`,
  };
}

export default async function DivisionPublicPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();

  const division = await prisma.division.findUnique({
    where: { code: upper },
    include: {
      subUnits: { select: { id: true, code: true, name: true, description: true } },
    },
  });

  if (!division) notFound();

  const [officers, news, documents] = await Promise.all([
    prisma.officer.findMany({
      where: { divisionId: division.id, scope: "division", active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, title: true, photoUrl: true, contactFormEnabled: true },
    }),
    prisma.news.findMany({
      where: {
        divisionId: division.id,
        status: "published",
        publiclyVisible: true,
        publicSlug: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, publicSlug: true, publishedAt: true, body: true,
      },
    }),
    prisma.document.findMany({
      where: { divisionId: division.id, publiclyVisible: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, description: true, fileUrl: true,
        fileSize: true, mimeType: true, createdAt: true,
      },
    }),
  ]);

  return (
    <article style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px 96px" }}>
      <Link href="/divisions" style={{ fontSize: 13, color: brand.colors.accent, textDecoration: "none", fontWeight: 600 }}>
        ← All divisions
      </Link>
      <p style={{
        fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
        color: brand.colors.accent, margin: "20px 0 14px",
      }}>
        {division.code} Division
      </p>
      <h1 style={{
        fontSize: "clamp(34px, 5vw, 48px)", fontWeight: 800, color: brand.colors.navy,
        margin: "0 0 16px", letterSpacing: -0.5, lineHeight: 1.1,
      }}>
        {division.name}
      </h1>
      {division.description && (
        <p style={{ fontSize: 17, lineHeight: 1.6, color: brand.colors.mutedForeground, margin: "0 0 40px", maxWidth: 760 }}>
          {division.description}
        </p>
      )}

      {division.subUnits.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <h2 style={sectionHeading}>Sub-units</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 20 }}>
            {division.subUnits.map(su => (
              <div key={su.id} style={{
                padding: 18, borderRadius: 12, background: "#F8FAFC",
                border: `1px solid #E5E7EB`,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: brand.colors.navy, margin: "0 0 6px" }}>
                  {su.name}
                </h3>
                <code style={{ fontSize: 11, color: brand.colors.mutedForeground }}>{su.code}</code>
                {su.description && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: brand.colors.mutedForeground, margin: "8px 0 0" }}>
                    {su.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {officers.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <h2 style={sectionHeading}>Division leadership</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22, marginTop: 24 }}>
            {officers.map(o => (
              <div key={o.id} style={{
                padding: 20, borderRadius: 14, background: "#FFFFFF",
                border: `1px solid #E5E7EB`,
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              }}>
                {o.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.photoUrl} alt={o.name} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: 14 }} />
                ) : (
                  <div style={{
                    width: 96, height: 96, borderRadius: "50%",
                    background: brand.colors.navy, color: "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 28, marginBottom: 14,
                  }}>
                    {initialsOf(o.name)}
                  </div>
                )}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: brand.colors.navy, margin: "0 0 4px" }}>
                  {o.name}
                </h3>
                <p style={{ fontSize: 13, color: brand.colors.mutedForeground, margin: "0 0 10px", fontWeight: 600 }}>
                  {o.title}
                </p>
                {o.contactFormEnabled && (
                  <Link href="/contact" style={{ fontSize: 12, color: brand.colors.accent, textDecoration: "none", fontWeight: 600 }}>
                    Contact →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h2 style={sectionHeading}>Recent division news</h2>
            <Link href="/news" style={{ fontSize: 14, color: brand.colors.accent, textDecoration: "none", fontWeight: 600 }}>
              All news →
            </Link>
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
            {news.map(n => (
              <Link
                key={n.id}
                href={`/news/${n.publicSlug}`}
                style={{
                  display: "block", padding: 18, borderRadius: 12,
                  background: "#FFFFFF", border: `1px solid #E5E7EB`,
                  textDecoration: "none", color: "inherit",
                }}
              >
                {n.publishedAt && (
                  <div style={{ fontSize: 12, color: brand.colors.mutedForeground, marginBottom: 6 }}>
                    {formatDate(n.publishedAt)}
                  </div>
                )}
                <h3 style={{ fontSize: 16, fontWeight: 700, color: brand.colors.navy, margin: "0 0 6px" }}>
                  {n.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: brand.colors.mutedForeground, margin: 0 }}>
                  {newsExcerpt(n.body, 140)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <h2 style={sectionHeading}>Division documents</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
            {documents.map(d => (
              <a
                key={d.id}
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: 14,
                  borderRadius: 10, background: "#F8FAFC", border: `1px solid #E5E7EB`,
                  textDecoration: "none", color: "inherit",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: brand.colors.navy }}>{d.title}</div>
                  {d.description && (
                    <div style={{ fontSize: 12, color: brand.colors.mutedForeground, marginTop: 4 }}>{d.description}</div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: brand.colors.mutedForeground, whiteSpace: "nowrap" }}>
                  {formatBytes(d.fileSize)}
                </div>
                <div style={{ fontSize: 13, color: brand.colors.accent, fontWeight: 600, whiteSpace: "nowrap" }}>
                  Download →
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {officers.length === 0 && news.length === 0 && documents.length === 0 && (
        <div style={{
          padding: 48, textAlign: "center", color: brand.colors.mutedForeground,
          fontSize: 15, background: "#F8FAFC", border: `1px solid #E5E7EB`, borderRadius: 16,
        }}>
          Division content will be available soon.
        </div>
      )}
    </article>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: 24, fontWeight: 800, color: brand.colors.navy,
  margin: 0, letterSpacing: -0.25,
  paddingBottom: 12, borderBottom: `2px solid ${brand.colors.accent}`,
};
