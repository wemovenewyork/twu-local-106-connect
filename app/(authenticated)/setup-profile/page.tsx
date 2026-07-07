"use client";

// Legacy self-service division picker — removed (pre-launch audit, finding B1).
// Division assignment is admin-controlled via registration approval. The route
// survives as a redirect because many screens historically pointed here for
// users with no division.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function SetupProfileRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.divisionId && user.division?.code) {
      router.replace(`/division/${user.division.code}`);
      return;
    }
    if (["superAdmin", "localAdmin"].includes(user.role)) {
      router.replace("/admin");
      return;
    }
    router.replace("/pending-approval");
  }, [user, loading, router]);

  return null;
}
