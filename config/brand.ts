/**
 * Brand identity for TWU Local 106 Connect.
 *
 * Single source of truth for app name, copy, colors, and URLs.
 * Update here, not inline elsewhere.
 *
 * Naming convention:
 *   - "TWU Local 106 Connect" — formal/legal name (PWA install, page titles, manifest)
 *   - "TSO" — casual identity in user-facing copy ("Find a swap with another TSO member")
 *   - "Local 106" — short reference where appropriate
 */

export const brand = {
  // Identity
  name: "TWU Local 106 Connect",
  shortName: "Local 106 Connect",
  appShortName: "TSO Connect", // for home screen icon (max 12 chars works well)
  organizationName: "Transit Supervisors Organization",
  organizationShort: "TSO",
  unionName: "TWU Local 106",

  // Web
  domain: "twu106.org", // current public site; new app lives at app subdomain post-launch
  appDomain: "twu-local-106-connect.vercel.app", // current deploy URL
  primaryUrl: "https://twu-local-106-connect.vercel.app",

  // Contact
  contactEmail: "wemovenewyork.net@gmail.com", // dev contact during build; swap post-launch
  emailFrom: "TWU Local 106 Connect <noreply@wemovenewyork.net>",
  emailReplyTo: "wemovenewyork.net@gmail.com",

  // Brand colors (extracted from TSO logo)
  colors: {
    navy: "#1A1F4D",      // primary brand color, dominant in logo
    red: "#AD1B27",        // accent, used in logo's outer ring
    white: "#FFFFFF",
    // Functional palette derived from navy/red
    background: "#FFFFFF",             // page background (light theme by default)
    foreground: "#1A1F4D", // primary text color
    accent: "#AD1B27",     // CTAs, links, urgent indicators
    accentForeground: "#FFFFFF",       // text on red buttons
    muted: "#F1F4F9",                  // soft background tone
    mutedForeground: "#5A6478",        // secondary text
  },

  // Disclaimer (different from WMNY's — this app IS the union's official platform)
  disclaimer: "TWU Local 106 Connect is the official member portal of TWU Local 106 (Transit Supervisors Organization). Shift swaps are coordinated through this platform, but all swaps must follow MTA / MaBSTOA / MTA Bus official approval procedures. The union does not approve or process shift swaps — that remains between the member, the swap partner, and management.",

  // Short-form non-affiliation language for footer / fine print
  // (not the WMNY non-affiliation — Local 106 IS the union; we're disclaiming MTA affiliation)
  affiliationNotice: "Built for and by TWU Local 106. Not affiliated with the MTA, MaBSTOA, or MTA Bus Company.",

  // Invite code prefix (we'll drop invite codes entirely in Layer C, but for now rename so
  // any leftover paths reference Local 106, not WMNY)
  inviteCodePrefix: "L106",
};

export type Brand = typeof brand;
