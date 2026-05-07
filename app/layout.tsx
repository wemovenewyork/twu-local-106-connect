import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import MeshBackground from "@/components/ui/MeshBackground";
import OfflineBanner from "@/components/ui/OfflineBanner";
import AnalyticsProvider from "@/components/ui/AnalyticsProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { brand } from "@/config/brand";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.name,
  description: `${brand.unionName} — official member portal for ${brand.organizationName}. Find shift swaps, read news, contact officers.`,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brand.appShortName,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content={brand.colors.navy} />
      </head>
      <body className={poppins.className}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RJV2G8G06H"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-RJV2G8G06H');
        `}</Script>
        <MeshBackground />
        <header>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <OfflineBanner />
        </header>
        <AuthProvider>
          <AnalyticsProvider>
            <div style={{ position: "relative", zIndex: 1 }}>
              {children}
            </div>
          </AnalyticsProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
