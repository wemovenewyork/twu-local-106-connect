"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { C } from "@/constants/colors";
import MemberPortalHeader from "@/components/ui/MemberPortalHeader";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";
import Footer from "@/components/ui/Footer";
import ContractSearchClient from "@/components/search/ContractSearchClient";

export default function ContractSearchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <MemberPortalHeader>
        <NotifIcon />
        <InboxIcon />
      </MemberPortalHeader>

      <main id="main-content" tabIndex={-1} style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px 28px" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "clamp(26px,6vw,36px)", fontWeight: 800, color: C.white, letterSpacing: -0.5, lineHeight: 1.1, margin: 0 }}>
            Contract Search
          </h1>
          <p style={{ fontSize: 13, color: C.m, marginTop: 8, lineHeight: 1.5 }}>
            Search the full text of union contracts. Type a question or keyword to find relevant passages.
          </p>
        </header>

        <Suspense fallback={null}>
          <ContractSearchClient />
        </Suspense>

        <Footer />
      </main>
    </div>
  );
}
