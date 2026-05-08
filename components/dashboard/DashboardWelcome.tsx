"use client";

import { C } from "@/constants/colors";
import type { User } from "@/types";

export default function DashboardWelcome({ user }: { user: User }) {
  const firstName = user.firstName || "there";
  const divisionName = user.division?.name;

  return (
    <header style={{ marginBottom: 28 }}>
      <h1 style={{ fontSize: "clamp(28px,6vw,40px)", fontWeight: 800, color: C.white, letterSpacing: -0.6, lineHeight: 1.1, margin: 0 }}>
        Hey, {firstName}
      </h1>
      <p style={{ fontSize: 13, color: C.m, marginTop: 6 }}>
        TSO Member{divisionName ? ` · ${divisionName}` : ""}
      </p>
    </header>
  );
}
