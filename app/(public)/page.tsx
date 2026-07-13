import Link from "next/link";
import Image from "next/image";
import { brand } from "@/config/brand";
import { getPublicNews, newsExcerpt } from "@/lib/news";

// Divisions represented by Local 106. Static, non-interactive (hero pills).
const DIVISIONS = ["MaBSTOA", "MTA Bus", "MSII", "Queens", "TSC"];

// This is a server component, so :hover and media queries can't be expressed as
// inline styles — they live here. Colors are derived from config/brand.ts tokens
// via custom properties; the light-red eyebrow and light-navy subhead are tints
// of those tokens (mixed toward white) so they stay legible reversed on navy.
const heroCss = `
/* Declared on :root, not .tso-hero — the red rule and the news cards are
   siblings of the hero, not descendants, so hero-scoped custom properties
   would not inherit to them. */
:root {
  --tso-navy: ${brand.colors.navy};
  --tso-red: ${brand.colors.red};
}
.tso-hero {
  background: var(--tso-navy);
  padding: 88px 24px 72px;
}
.tso-hero-inner {
  max-width: 1100px; margin: 0 auto;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 48px;
}
.tso-hero-copy { flex: 1 1 auto; max-width: 60%; min-width: 0; }
.tso-eyebrow {
  color: color-mix(in srgb, var(--tso-red) 60%, ${brand.colors.white});
  font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  margin: 0 0 16px;
}
/* Circular white backing so the seal's navy outer ring doesn't vanish into the navy hero. */
.tso-seal-wrap {
  flex: 0 0 auto;
  width: clamp(210px, 24vw, 300px);
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: ${brand.colors.white};
  display: flex; align-items: center; justify-content: center;
  padding: 14px;
  box-shadow: 0 12px 44px rgba(0,0,0,.30);
}
.tso-seal { width: 100%; height: auto; display: block; object-fit: contain; }
.tso-rule { height: 5px; background: var(--tso-red); }
.tso-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
.tso-pill {
  font-size: 12px; font-weight: 700; letter-spacing: .5px;
  padding: 6px 14px; border-radius: 999px;
  color: rgba(255,255,255,.85);
  border: 1px solid rgba(255,255,255,.28);
  white-space: nowrap;
}
/* Red top border + hover lift. border-top-color is restored on hover so the
   red edge survives the navy border-color change. */
.tso-news-card:hover { transform: translateY(-3px); border-color: var(--tso-navy); border-top-color: var(--tso-red); }

@media (max-width: 900px) {
  .tso-hero { padding: 64px 20px 56px; }
  .tso-hero-inner { flex-direction: column; gap: 36px; }
  .tso-hero-copy { max-width: 100%; }
  .tso-seal-wrap { width: clamp(150px, 42vw, 210px); align-self: center; }
}
`;

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
      <style dangerouslySetInnerHTML={{ __html: heroCss }} />

      {/* Hero — heritage/ceremonial: solid navy, seal on a white circular backing */}
      <section className="tso-hero">
        <div className="tso-hero-inner">
          <div className="tso-hero-copy">
            <p className="tso-eyebrow">
              {brand.organizationName}
            </p>
            <h1 style={{
              fontSize: "clamp(40px, 6.5vw, 64px)", fontWeight: 800, letterSpacing: -1,
              lineHeight: 1.05, color: brand.colors.white, margin: "0 0 20px",
            }}>
              {brand.unionName}
            </h1>
            <p style={{
              fontSize: 20, lineHeight: 1.55, color: "rgba(255,255,255,.78)",
              margin: "0 0 12px", fontWeight: 500,
            }}>
              Representing NYC transit supervisors across MaBSTOA, MTA Bus, MSII, Queens, and TSC.
            </p>
            <p style={{
              fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,.62)",
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
              <Link href="/about" style={ctaSecondaryOnNavy}>
                About the Union
              </Link>
            </div>

            {/* Divisions represented — static, non-interactive */}
            <div className="tso-pills">
              {DIVISIONS.map(d => (
                <span key={d} className="tso-pill">{d}</span>
              ))}
            </div>
          </div>

          <div className="tso-seal-wrap">
            <Image
              src="/branding/tso-logo.png"
              alt={`${brand.organizationName} official seal`}
              width={938}
              height={938}
              sizes="(max-width: 900px) 210px, 300px"
              className="tso-seal"
              priority
            />
          </div>
        </div>
      </section>

      {/* Ceremonial red band between hero and news */}
      <div className="tso-rule" />

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
                  className="tso-news-card"
                  style={{
                    display: "block", padding: 22,
                    // Single-sided red top border: square that edge, keep the rest rounded.
                    borderRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0,
                    background: "#FFFFFF", border: `1px solid #E5E7EB`,
                    borderTop: `3px solid ${brand.colors.red}`,
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

// Outline variant for the reversed (navy) hero.
const ctaSecondaryOnNavy: React.CSSProperties = {
  background: "transparent", color: brand.colors.white,
  padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700,
  textDecoration: "none", border: "1px solid rgba(255,255,255,.3)",
  display: "inline-block",
};
