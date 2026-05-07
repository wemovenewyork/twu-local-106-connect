import { brand } from "@/config/brand";

// Local 106 palette routed through config/brand.ts.
// The C.* token shape matches the original WMNY palette so existing components
// (~70 files) continue to work — only the values are updated.
//
// The app is dark-themed in Layer A; brand.colors.background ('#FFFFFF') is
// reserved for emails and light surfaces. C.bg uses brand.colors.navy as the
// dark page background.

export const C = {
  navy: brand.colors.navy,
  gold: brand.colors.red,                          // legacy alias — Local 106 has no gold; routed to red
  blue: "#0249B5",
  white: brand.colors.white,
  bg: brand.colors.navy,
  s: "rgba(255,255,255,.035)",
  sh: "rgba(255,255,255,.06)",
  bd: "rgba(255,255,255,.06)",
  m: "rgba(255,255,255,.6)",
  gs: "rgba(173,27,39,.12)",                       // soft red wash (was gold wash)
  gg: "rgba(173,27,39,.35)",                       // medium red wash (was gold wash)
  red: "#FF4757",
} as const;

export const OC: Record<string, string> = {
  NYCT: "#0062FF",
  MaBSTOA: "#00A86B",
  "MTA Bus": "#E87722",
};

export const CM = {
  work: { c: C.blue, bg: C.blue + "18", bd2: C.blue + "33" },
  daysoff: { c: "#D97706", bg: "rgba(217,119,6,.12)", bd2: "rgba(217,119,6,.35)" }, // amber, distinct from brand red
  vacation: { c: "#00C9A7", bg: "rgba(0,201,167,.1)", bd2: "rgba(0,201,167,.25)" },
} as const;

export const STC = {
  open: { bg: "rgba(46,213,115,.12)", bd: "rgba(46,213,115,.3)", c: "#2ED573" },
  pending: { bg: "rgba(217,119,6,.12)", bd: "rgba(217,119,6,.3)", c: "#D97706" },
  filled: { bg: "rgba(0,201,167,.12)", bd: "rgba(0,201,167,.3)", c: "#00C9A7" },
  expired: { bg: "rgba(128,128,128,.12)", bd: "rgba(128,128,128,.3)", c: "#888" },
} as const;

export const SWAP_TYPES = [
  { id: "work", l: "Swap Work", f: "Swap Work for the Day", ic: "swap" },
  { id: "daysoff", l: "Swap Days Off", f: "Swap Days Off", ic: "cal" },
  { id: "vacation", l: "Swap Vacation", f: "Swap Vacation Week", ic: "sun" },
] as const;
