import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { brand } from "@/config/brand";

export const metadata = {
  title: `About — ${brand.unionName}`,
  description: `${brand.unionName} (TSO) represents transit supervisors at MaBSTOA, MTA Bus, and the New York City Transit Authority across five divisions: MaBSTOA, MTA Bus, MSII, Queens, and TSC.`,
};

const ABOUT_BODY = `
${brand.unionName} — also known as the Transit Supervisors Organization (TSO) — is the union representing transit supervisors employed by MaBSTOA, MTA Bus Company, and the New York City Transit Authority. Our members include line supervisors, station managers, dispatchers, and other supervisory staff who keep New York City moving every day.

## Who We Represent

Our members work across five divisions:

- **MaBSTOA** — Manhattan and Bronx Surface Transit Operating Authority
- **MTA Bus** — MTA Bus Company supervisors
- **MSII** — Maintenance Support Section II
- **Queens Division** — Queens-based transit supervisors
- **TSC** — Transit Services Center

Within MaBSTOA and MTA Bus, members are further organized into transportation and maintenance sub-units.

## What We Do

We negotiate contracts, defend members in disciplinary proceedings, advocate for safer working conditions, and provide a forum for collective action. Our officers represent every division and meet regularly to address issues raised by the membership.

## Affiliated With

TWU Local 106 is affiliated with the Transport Workers Union of America (TWU) and the AFL-CIO.

## Contact

For general inquiries, visit our [Contact page](/contact). For division-specific questions, contact your division leadership directly.
`.trim();

export default function AboutPage() {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 96px" }}>
      <p style={{
        fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
        color: brand.colors.accent, margin: "0 0 14px",
      }}>
        About
      </p>
      <h1 style={{
        fontSize: "clamp(34px, 5vw, 44px)", fontWeight: 800, color: brand.colors.navy,
        margin: "0 0 32px", letterSpacing: -0.5, lineHeight: 1.1,
      }}>
        About {brand.unionName}
      </h1>
      <div className="prose-public" style={{ fontSize: 17, lineHeight: 1.75, color: "#1f2937" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{ABOUT_BODY}</ReactMarkdown>
      </div>
      <hr style={{ border: 0, borderTop: `1px solid #E5E7EB`, margin: "48px 0 32px" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link href="/leadership" style={ctaSecondary}>
          Meet our leadership →
        </Link>
        <Link href="/divisions" style={ctaSecondary}>
          Explore divisions →
        </Link>
      </div>
    </article>
  );
}

const ctaSecondary: React.CSSProperties = {
  background: "transparent", color: brand.colors.navy,
  padding: "12px 22px", borderRadius: 10, fontSize: 14, fontWeight: 700,
  textDecoration: "none", border: `1.5px solid ${brand.colors.navy}`,
  display: "inline-block",
};
