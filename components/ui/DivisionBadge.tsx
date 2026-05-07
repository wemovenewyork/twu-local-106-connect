"use client";

import { Division } from "@/types";
import { C } from "@/constants/colors";

interface Props { division: Division; size?: number; }

export default function DivisionBadge({ division, size = 44 }: Props) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${C.blue},${C.blue}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.3, color: "#fff" }}>
      {division.code}
    </div>
  );
}
