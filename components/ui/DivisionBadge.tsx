"use client";

import { Division } from "@/types";
import { C } from "@/constants/colors";

interface Props { division: Division; size?: number; }

// Compact abbreviations for division codes that don't fit inside a small
// circular badge. The badge is used at sizes 20–44px; long codes like
// "MABSTOA" overflow out of the circle and collide with whatever sits next
// to the badge in the layout.
const SHORT_CODE: Record<string, string> = {
  MABSTOA: "OA",
  MTABUS: "MTA",
  QUEENS: "Q",
};

export default function DivisionBadge({ division, size = 44 }: Props) {
  const label = SHORT_CODE[division.code] ?? division.code;
  // Final sizing guard: even the abbreviated label needs to fit. Scale font
  // down for 3-4 char labels so they sit comfortably inside the circle.
  const fontSize =
    label.length >= 4 ? size * 0.26 :
    label.length === 3 ? size * 0.32 :
    size * 0.38;

  return (
    <div
      title={division.name}
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg,${C.blue},${C.blue}aa)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize, color: "#fff",
        letterSpacing: 0.5, lineHeight: 1, overflow: "hidden",
      }}
    >
      {label}
    </div>
  );
}
