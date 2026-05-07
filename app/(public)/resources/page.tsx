import Link from "next/link";
import { brand } from "@/config/brand";

export const metadata = {
  title: `Resources — ${brand.unionName}`,
  description: `Forms, benefits, and documents from ${brand.unionName}.`,
};

const SECTIONS = [
  { href: "/resources/forms", title: "Forms", desc: "Membership, leave, grievance, and other forms." },
  { href: "/resources/benefits", title: "Benefits", desc: "Medical, dental, pension, and member benefits info." },
  { href: "/resources/documents", title: "Documents", desc: "Contracts, bylaws, and official documents." },
];

export default function ResourcesPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: brand.colors.navy, margin: "0 0 8px", letterSpacing: -0.5 }}>
        Resources
      </h1>
      <p style={{ fontSize: 16, color: brand.colors.mutedForeground, lineHeight: 1.7, margin: "0 0 32px" }}>
        Coming soon — Phase 4.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display: "block",
              padding: 24,
              borderRadius: 12,
              border: "1px solid #E5E7EB",
              textDecoration: "none",
              color: brand.colors.navy,
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: brand.colors.mutedForeground, lineHeight: 1.5 }}>{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
