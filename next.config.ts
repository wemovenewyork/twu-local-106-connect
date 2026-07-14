import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://browser.sentry-cdn.com https://js.sentry-cdn.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.sentry.io https://browser.sentry-cdn.com https://*.upstash.io https://www.google-analytics.com https://www.googletagmanager.com",
      "worker-src 'self' blob:",
      // Lets OUR pages embed the Blob-hosted contract PDFs in the viewer's
      // <iframe>. Without this, frame-src falls back to default-src 'self' and
      // the cross-origin PDF is blocked. Documents are uploaded with
      // access: "public" (lib/storage.ts), so they always live on the store's
      // *.public.blob.vercel-storage.com host.
      //
      // This does NOT weaken clickjacking protection: frame-ancestors 'none'
      // (below) and X-Frame-Options: DENY still stop anyone framing US.
      // frame-src governs what we may embed; frame-ancestors governs who may
      // embed us. They are separate directions.
      "frame-src 'self' https://*.public.blob.vercel-storage.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  },
];

// Legacy WordPress URLs from twu106.org → new app routes.
// Permanent (308) so search engines and browser bookmarks update.
const legacyRedirects = [
  // Top-level WP pages
  { source: "/about-us", destination: "/about" },
  { source: "/contact-us", destination: "/contact" },
  { source: "/test-staff-page", destination: "/leadership" },
  { source: "/exec-council", destination: "/leadership" },
  { source: "/executive-council", destination: "/leadership" },

  // Division hubs
  { source: "/mabstoa", destination: "/divisions/MABSTOA" },
  { source: "/oa-contracts", destination: "/divisions/MABSTOA" },
  { source: "/oa-unit-benefits", destination: "/divisions/MABSTOA" },
  { source: "/queens", destination: "/divisions/QUEENS" },
  { source: "/queens-division-contracts", destination: "/divisions/QUEENS" },
  { source: "/queens-division-policies", destination: "/divisions/QUEENS" },
  { source: "/mta-bus", destination: "/divisions/MTABUS" },
  { source: "/mta-bus-contracts", destination: "/divisions/MTABUS" },
  { source: "/mta-bus-policies", destination: "/divisions/MTABUS" },
  { source: "/mta-bus-pension", destination: "/divisions/MTABUS" },
  { source: "/maintenance-supervisors-ii", destination: "/divisions/MSII" },
  { source: "/maintenance-supervisors-ii-contract", destination: "/divisions/MSII" },
  { source: "/station-supervisor-ii-contracts", destination: "/divisions/MSII" },
  { source: "/tsc", destination: "/divisions/TSC" },
  { source: "/tsc-contracts", destination: "/divisions/TSC" },
  { source: "/tsc-i-ii-benefits", destination: "/divisions/TSC" },

  // Forms / member resources → /resources/forms
  { source: "/transit-authority-forms", destination: "/resources/forms" },
  { source: "/sick-leave-forms", destination: "/resources/forms" },
  { source: "/medical-forms", destination: "/resources/forms" },
  { source: "/supervisors-forms", destination: "/resources/forms" },
  { source: "/new-member-forms", destination: "/resources/forms" },
  { source: "/application-railroad-commuter-pass", destination: "/resources/forms" },

  // Benefits / health → /resources/benefits
  { source: "/aetna-medical", destination: "/resources/benefits" },
  { source: "/dental-and-vision", destination: "/resources/benefits" },
  { source: "/vision-coverage", destination: "/resources/benefits" },
  { source: "/medicare-info", destination: "/resources/benefits" },
  { source: "/wtc", destination: "/resources/benefits" },
  { source: "/dying-before-retiring", destination: "/resources/benefits" },
  { source: "/nycers-25-55-transit-operating-tier-4-pension", destination: "/resources/benefits" },
  { source: "/calculating-your-final-average-salary", destination: "/resources/benefits" },
  { source: "/calculating-your-mabstoa-fas", destination: "/resources/benefits" },
  { source: "/medical-and-pension-tracking-all-units", destination: "/resources/benefits" },
] as const;

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return legacyRedirects.map((r) => ({ ...r, permanent: true }));
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
