import Link from "next/link";
import { brand } from "@/config/brand";
import { getPublicNews, newsExcerpt } from "@/lib/news";

export const metadata = {
  title: `${brand.unionName} — ${brand.organizationName}`,
  description: `Official website of ${brand.unionName}, the ${brand.organizationName} representing transit supervisors across MaBSTOA, MTA Bus, MSII, Queens, and TSC divisions.`,
};

export const dynamic = "force-dynamic";

function formatDate(d: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function PublicHome() {
  const recent = await getPublicNews({ limit: 3 });

  return (
    <>
      {/* Hero */}
      <section style={{ padding: "96px 24px 80px", background: "linear-gradient(180deg, #F1F4F9 0%, #FFFFFF 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ maxWidth: 760 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
              color: brand.colors.accent, margin: "0 0 16px",
            }}>
              {brand.organizationName}
            </p>
            <h1 style={{
              fontSize: "clamp(40px, 6.5vw, 64px)", fontWeight: 800, letterSpacing: -1,
              lineHeight: 1.05, color: brand.colors.navy, margin: "0 0 20px",
            }}>
              {brand.unionName}
            </h1>
            <p style={{
              fontSize: 20, lineHeight: 1.55, color: brand.colors.mutedForeground,
              margin: "0 0 12px", fontWeight: 500,
            }}>
              Representing NYC transit supervisors across MaBSTOA, MTA Bus, MSII, Queens, and TSC.
            </p>
            <p style={{
              fontSize: 16, lineHeight: 1.7, color: brand.colors.mutedForeground,
              margin: "0 0 36px", maxWidth: 640,
            }}>
              We advocate for the rights, safety, and dignity of every TSO member —
              negotiating contracts, defending members in disciplinary proceedings,
              and giving the workforce a unified voice.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/login" style={ctaPrimary}>
                Member Sign In →
              </Link>
              <Link href="/about" style={ctaSecondary}>
                About the Union
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent News */}
      {recent.length > 0 && (
        <section style={{ padding: "64px 24px", background: "#FFFFFF" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
              <h2 style={sectionHeading}>Recent News</h2>
              <Link href="/news" style={{ fontSize: 14, color: brand.colors.accent, textDecoration: "none", fontWeight: 600 }}>
                All news →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {recent.map(n => (
                <Link
                  key={n.id}
                  href={`/news/${n.publicSlug}`}
                  style={{
                    display: "block", padding: 22, borderRadius: 14,
                    background: "#FFFFFF", border: `1px solid #E5E7EB`,
                    textDecoration: "none", color: "inherit",
                    transition: "border-color .15s, transform .15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    {n.division && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                        padding: "2px 8px", borderRadius: 999,
                        background: "#F1F4F9", color: brand.colors.navy,
                      }}>
                        {n.division.code}
                      </span>
                    )}
                    {n.publishedAt && (
                      <span style={{ fontSize: 12, color: brand.colors.mutedForeground }}>
                        {formatDate(n.publishedAt)}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: brand.colors.navy, margin: "0 0 8px", lineHeight: 1.3 }}>
                    {n.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: brand.colors.mutedForeground, margin: 0 }}>
                    {newsExcerpt(n.body, 110)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Resources */}
      <section style={{ padding: "64px 24px", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={sectionHeading}>Resources</h2>
          <p style={{ fontSize: 15, color: brand.colors.mutedForeground, margin: "8px 0 32px" }}>
            Forms, contracts, and the people you need to reach.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            <ResourceCard
              href="/resources/forms"
              title="Find a Form"
              description="HR forms, pension paperwork, time-off requests, and more — all in one place."
            />
            <ResourceCard
              href="/resources/documents"
              title="Read the Constitution"
              description="Local 106 governing documents, current contracts, and division-specific agreements."
            />
            <ResourceCard
              href="/contact"
              title="Contact a Rep"
              description="Reach an officer at your division or local-wide leadership directly."
            />
          </div>
        </div>
      </section>

      {/* Member portal banner */}
      <section style={{ padding: "56px 24px", background: brand.colors.navy, color: "#FFFFFF" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 24, justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 360px" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
              Members: log in for shift swaps, division news, and more
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,.78)", margin: 0 }}>
              The TSO Connect member portal — accessible to verified Local 106 members.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/login" style={{ ...ctaPrimary, background: "#FFFFFF", color: brand.colors.navy }}>
              Sign In
            </Link>
            <Link href="/login" style={{
              padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700,
              textDecoration: "none", color: "#FFFFFF", border: `1.5px solid rgba(255,255,255,.4)`,
            }}>
              Create an Account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ResourceCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block", padding: 24, borderRadius: 14,
        background: "#FFFFFF", border: `1px solid #E5E7EB`,
        textDecoration: "none", color: "inherit",
      }}
    >
      <h3 style={{ fontSize: 17, fontWeight: 700, color: brand.colors.navy, margin: "0 0 8px" }}>
        {title} →
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: brand.colors.mutedForeground, margin: 0 }}>
        {description}
      </p>
    </Link>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: 28, fontWeight: 800, color: brand.colors.navy,
  margin: 0, letterSpacing: -0.5,
};

const ctaPrimary: React.CSSProperties = {
  background: brand.colors.accent, color: "#FFFFFF",
  padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700,
  textDecoration: "none", display: "inline-block",
};

const ctaSecondary: React.CSSProperties = {
  background: "transparent", color: brand.colors.navy,
  padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700,
  textDecoration: "none", border: `1.5px solid ${brand.colors.navy}`,
  display: "inline-block",
};
