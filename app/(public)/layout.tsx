import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        background: "#FFFFFF",
        color: "#1A1F4D",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PublicHeader />
      <main id="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
