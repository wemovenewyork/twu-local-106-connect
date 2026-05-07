import { brand } from "@/config/brand";
import { getPublicDocuments } from "@/lib/documents";

export const metadata = {
  title: `Documents — ${brand.unionName}`,
  description: `Public documents from ${brand.unionName}.`,
};

export const dynamic = "force-dynamic";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mime: string | null): string {
  if (!mime) return "File";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("word")) return "DOCX";
  if (mime.includes("sheet")) return "XLSX";
  if (mime.startsWith("image/")) return mime.replace("image/", "").toUpperCase();
  return "File";
}

export default async function PublicDocumentsPage() {
  const docs = await getPublicDocuments({ limit: 100 });

  // Group by division code (or "Local-Wide" if no division).
  const groups = new Map<string, { label: string; docs: typeof docs }>();
  for (const d of docs) {
    const key = d.division?.code ?? "__local__";
    const label = d.division?.name ?? "Local-Wide";
    if (!groups.has(key)) groups.set(key, { label, docs: [] });
    groups.get(key)!.docs.push(d);
  }
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.label === "Local-Wide") return -1;
    if (b.label === "Local-Wide") return 1;
    return a.label.localeCompare(b.label);
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: brand.colors.navy, margin: "0 0 12px", letterSpacing: -0.5 }}>
        Documents
      </h1>
      <p style={{ fontSize: 16, color: brand.colors.mutedForeground, margin: "0 0 36px" }}>
        Public-facing documents from {brand.unionName}.
      </p>

      {docs.length === 0 ? (
        <div
          style={{
            padding: 32,
            border: "1px dashed #E5E7EB",
            borderRadius: 12,
            textAlign: "center",
            color: brand.colors.mutedForeground,
            fontSize: 14,
          }}
        >
          No public documents yet.
        </div>
      ) : (
        sortedGroups.map((group) => (
          <section key={group.label} style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: brand.colors.mutedForeground,
                margin: "0 0 12px",
              }}
            >
              {group.label}
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {group.docs.map((d) => (
                <li key={d.id}>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: 16,
                      border: "1px solid #E5E7EB",
                      borderRadius: 10,
                      textDecoration: "none",
                      background: "#fff",
                      color: brand.colors.navy,
                    }}
                  >
                    <span
                      style={{
                        background: brand.colors.muted,
                        color: brand.colors.navy,
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      {mimeLabel(d.mimeType)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{d.title}</div>
                      {d.description && (
                        <div style={{ fontSize: 13, color: brand.colors.mutedForeground, lineHeight: 1.5 }}>
                          {d.description}
                        </div>
                      )}
                    </div>
                    {d.fileSize && (
                      <span style={{ fontSize: 12, color: brand.colors.mutedForeground }}>
                        {formatBytes(d.fileSize)}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
