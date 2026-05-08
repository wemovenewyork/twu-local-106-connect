"use client";

import { useRouter } from "next/navigation";
import { C } from "@/constants/colors";
import NewsFeed from "@/components/NewsFeed";

export default function RecentNews() {
  const router = useRouter();

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2 }}>
          Recent News
        </h2>
        <button
          onClick={() => router.push("/news")}
          style={{ background: "none", border: "none", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          View all →
        </button>
      </div>
      <NewsFeed limit={3} hideHeader hidePushPrompt />
    </section>
  );
}
