"use client";

import { C } from "@/constants/colors";

export default function AttentionStrip() {
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px dashed ${C.bd}`, color: C.m, fontSize: 12 }}>
        Attention items appear here (coming in next commit).
      </div>
    </section>
  );
}
