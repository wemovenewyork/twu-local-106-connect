"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

// Pages a not-yet-approved user is allowed to visit. Everything else
// redirects to /pending-approval. Logged-out users are unaffected (no
// session = no registration to gate on).
const ALLOWED_FOR_PENDING = [
  "/pending-approval",
  "/login",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/disclaimer",
  "/privacy",
  "/terms",
  "/help",
  "/how-it-works",
];

function isAllowed(pathname: string): boolean {
  return ALLOWED_FOR_PENDING.some(p => pathname === p || pathname.startsWith(p + "/"));
}

export default function RegistrationGuard() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    const status = user.registrationApproval?.status;
    if ((status === "pending" || status === "rejected") && !isAllowed(pathname)) {
      router.replace("/pending-approval");
    }
  }, [user, loading, pathname, router]);

  return null;
}
