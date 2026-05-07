import Link from "next/link";
import Image from "next/image";
import { brand } from "@/config/brand";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: brand.colors.navy,
        color: "#fff",
        marginTop: 64,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 36,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Image
              src="/branding/tso-logo.png"
              alt=""
              width={48}
              height={48}
              style={{ width: 48, height: 48, objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
                TWU Local 106
              </div>
              <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {brand.organizationName}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8, margin: 0 }}>
            The Transit Supervisors Organization — representing transit
            supervisors across MaBSTOA, MTA Bus, and Staten Island.
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 14px", opacity: 0.7 }}>
            Quick Links
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li><Link href="/about" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>About</Link></li>
            <li><Link href="/leadership" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>Leadership</Link></li>
            <li><Link href="/divisions" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>Divisions</Link></li>
            <li><Link href="/news" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>News</Link></li>
            <li><Link href="/contact" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 14px", opacity: 0.7 }}>
            Member Resources
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  background: brand.colors.accent,
                  color: "#fff",
                  padding: "8px 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  marginBottom: 6,
                }}
              >
                Sign In to Member Portal →
              </Link>
            </li>
            <li><Link href="/resources/forms" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>Forms</Link></li>
            <li><Link href="/resources/documents" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>Documents</Link></li>
            <li><Link href="/resources/benefits" style={{ color: "#fff", textDecoration: "none", fontSize: 14, opacity: 0.9 }}>Benefits</Link></li>
          </ul>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "20px 24px",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          opacity: 0.7,
        }}
      >
        <div>© {year} TWU Local 106 — Transit Supervisors Organization. All rights reserved.</div>
        <div>{brand.affiliationNotice}</div>
      </div>
    </footer>
  );
}
