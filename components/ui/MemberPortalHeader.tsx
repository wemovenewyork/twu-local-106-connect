"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { C } from "@/constants/colors";

interface Props {
  /** Right-side slot, typically Notif/Inbox icons + page actions. */
  children?: ReactNode;
  /** When true, clicking the logo/wordmark navigates to /dashboard. */
  homeOnClick?: boolean;
}

// Persistent top bar for the authenticated member portal.
// Anchors the TSO logo + "TWU Local 106 Connect" wordmark so members can
// identify the app from any page. Page-specific identity (back button,
// division badge, page title, +Post action) belongs in a sub-band rendered
// below this header by the page itself.
export default function MemberPortalHeader({ children, homeOnClick = true }: Props) {
  const router = useRouter();

  const Logo = (
    <Image
      src="/branding/tso-logo.png"
      alt="TWU Local 106 — TSO"
      width={80}
      height={80}
      priority
      style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
    />
  );

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 110,
        background: "rgba(26,31,77,.85)", backdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.bd}`,
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}
    >
      {homeOnClick ? (
        <button
          onClick={() => router.push("/dashboard")}
          aria-label="TWU Local 106 Connect — Dashboard"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 0, background: "transparent", border: "none",
            cursor: "pointer", color: "inherit", flex: 1, minWidth: 0,
          }}
        >
          {Logo}
          <span
            style={{
              fontSize: 13, fontWeight: 800, color: C.white,
              letterSpacing: 0.6, lineHeight: 1.1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              textAlign: "left",
            }}
          >
            <span style={{ display: "inline" }}>TWU Local 106 </span>
            <span style={{ color: C.gold }}>Connect</span>
          </span>
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {Logo}
          <span style={{ fontSize: 13, fontWeight: 800, color: C.white, letterSpacing: 0.6, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ display: "inline" }}>TWU Local 106 </span>
            <span style={{ color: C.gold }}>Connect</span>
          </span>
        </div>
      )}

      {children && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {children}
        </div>
      )}
    </header>
  );
}
