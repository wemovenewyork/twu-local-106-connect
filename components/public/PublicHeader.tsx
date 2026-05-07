"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { brand } from "@/config/brand";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/divisions", label: "Divisions" },
  { href: "/news", label: "News" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: brand.colors.navy,
          }}
        >
          <Image
            src="/branding/tso-logo.png"
            alt={`${brand.organizationName} logo`}
            width={44}
            height={44}
            style={{ width: 44, height: 44, objectFit: "contain" }}
            priority
          />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3, lineHeight: 1.2 }}>
            <span style={{ display: "block" }}>TWU Local 106</span>
            <span
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                color: brand.colors.mutedForeground,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Transit Supervisors Organization
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
          className="public-header-desktop-nav"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: isActive(link.href) ? brand.colors.accent : brand.colors.navy,
                textDecoration: "none",
                paddingBottom: 4,
                borderBottom: isActive(link.href)
                  ? `2px solid ${brand.colors.accent}`
                  : "2px solid transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
          {!loading && user ? (
            <Link
              href="/dashboard"
              style={{
                background: brand.colors.accent,
                color: "#fff",
                padding: "9px 18px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Member Portal →
            </Link>
          ) : (
            <Link
              href="/login"
              style={{
                background: brand.colors.accent,
                color: "#fff",
                padding: "9px 18px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="public-header-mobile-toggle"
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: brand.colors.navy,
            padding: 4,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          aria-label="Mobile primary"
          style={{
            background: "#FFFFFF",
            borderTop: "1px solid #E5E7EB",
            padding: "12px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          className="public-header-mobile-nav"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 8px",
                fontSize: 16,
                fontWeight: 600,
                color: isActive(link.href) ? brand.colors.accent : brand.colors.navy,
                textDecoration: "none",
                borderRadius: 6,
              }}
            >
              {link.label}
            </Link>
          ))}
          {!loading && user ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 8,
                background: brand.colors.accent,
                color: "#fff",
                padding: "12px 18px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Member Portal →
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 8,
                background: brand.colors.accent,
                color: "#fff",
                padding: "12px 18px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Sign In
            </Link>
          )}
        </nav>
      )}

      <style jsx>{`
        @media (max-width: 767px) {
          :global(.public-header-desktop-nav) {
            display: none !important;
          }
          :global(.public-header-mobile-toggle) {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}
