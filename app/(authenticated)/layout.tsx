import MeshBackground from "@/components/ui/MeshBackground";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </>
  );
}
