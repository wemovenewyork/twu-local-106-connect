import { brand } from "@/config/brand";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: `Leadership — ${brand.unionName}`,
  description: `Officers and leadership of ${brand.unionName}, the ${brand.organizationName}.`,
};

export const dynamic = "force-dynamic";

const SCOPE_LABEL = {
  local: "Local Leadership",
  division: "Division Leadership",
  staff: "Staff",
} as const;

const SCOPE_ORDER: Array<"local" | "division" | "staff"> = ["local", "division", "staff"];

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("") || "?";
}

function bioExcerpt(bio: string | null, max = 200): string {
  if (!bio) return "";
  const stripped = bio.replace(/[#*_`>\[\]()]/g, "").replace(/\s+/g, " ").trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

export default async function LeadershipPage() {
  const officers = await prisma.officer.findMany({
    where: { active: true },
    include: { division: { select: { id: true, code: true, name: true } } },
    orderBy: [{ scope: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
  });

  const grouped: Record<"local" | "division" | "staff", typeof officers> = {
    local: [], division: [], staff: [],
  };
  for (const o of officers) grouped[o.scope].push(o);

  // Within division scope, sub-group by division name
  const divisionGroups: Record<string, typeof officers> = {};
  for (const o of grouped.division) {
    const key = o.division?.name ?? "Other";
    if (!divisionGroups[key]) divisionGroups[key] = [];
    divisionGroups[key].push(o);
  }

  return (
    <article style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px 96px" }}>
      <p style={{
        fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
        color: brand.colors.accent, margin: "0 0 14px",
      }}>
        Leadership
      </p>
      <h1 style={{
        fontSize: "clamp(34px, 5vw, 44px)", fontWeight: 800, color: brand.colors.navy,
        margin: "0 0 16px", letterSpacing: -0.5, lineHeight: 1.1,
      }}>
        Our Officers
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: brand.colors.mutedForeground, margin: "0 0 48px", maxWidth: 720 }}>
        Local 106 is led by elected officers across the local and each division,
        supported by union staff. Reach an officer directly through the{" "}
        <a href="/contact" style={{ color: brand.colors.accent }}>contact page</a>.
      </p>

      {officers.length === 0 && (
        <div style={{
          padding: 48, textAlign: "center", color: brand.colors.mutedForeground,
          fontSize: 15, background: "#F8FAFC", border: `1px solid #E5E7EB`,
          borderRadius: 16,
        }}>
          Leadership information will be available soon.
        </div>
      )}

      {SCOPE_ORDER.map(scope => {
        if (grouped[scope].length === 0) return null;
        if (scope === "division") {
          const divisionNames = Object.keys(divisionGroups).sort();
          return (
            <section key={scope} style={{ marginBottom: 56 }}>
              <h2 style={sectionHeading}>{SCOPE_LABEL[scope]}</h2>
              {divisionNames.map(divName => (
                <div key={divName} style={{ marginTop: 28 }}>
                  <h3 style={subsectionHeading}>{divName}</h3>
                  <OfficerGrid officers={divisionGroups[divName]} />
                </div>
              ))}
            </section>
          );
        }
        return (
          <section key={scope} style={{ marginBottom: 56 }}>
            <h2 style={sectionHeading}>{SCOPE_LABEL[scope]}</h2>
            <OfficerGrid officers={grouped[scope]} />
          </section>
        );
      })}
    </article>
  );
}

function OfficerGrid({ officers }: { officers: Array<{
  id: string; name: string; title: string; photoUrl: string | null;
  bio: string | null; division?: { code: string; name: string } | null;
  contactFormEnabled: boolean;
}> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, marginTop: 24 }}>
      {officers.map(o => (
        <div key={o.id} style={{
          padding: 22, borderRadius: 14, background: "#FFFFFF",
          border: `1px solid #E5E7EB`,
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        }}>
          {o.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={o.photoUrl}
              alt={o.name}
              style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", marginBottom: 16 }}
            />
          ) : (
            <div style={{
              width: 120, height: 120, borderRadius: "50%",
              background: brand.colors.navy, color: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 36, marginBottom: 16,
            }}>
              {initialsOf(o.name)}
            </div>
          )}
          <h3 style={{ fontSize: 18, fontWeight: 700, color: brand.colors.navy, margin: "0 0 4px" }}>
            {o.name}
          </h3>
          <p style={{ fontSize: 14, color: brand.colors.mutedForeground, margin: "0 0 8px", fontWeight: 600 }}>
            {o.title}
          </p>
          {o.division && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              padding: "2px 8px", borderRadius: 999,
              background: "#F1F4F9", color: brand.colors.navy, marginBottom: 12,
            }}>
              {o.division.code}
            </span>
          )}
          {o.bio && (
            <p style={{ fontSize: 13, lineHeight: 1.55, color: brand.colors.mutedForeground, margin: "8px 0 14px" }}>
              {bioExcerpt(o.bio, 160)}
            </p>
          )}
          {o.contactFormEnabled && (
            <a href="/contact" style={{
              fontSize: 13, color: brand.colors.accent, textDecoration: "none",
              fontWeight: 600, marginTop: "auto",
            }}>
              Contact →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: 24, fontWeight: 800, color: brand.colors.navy,
  margin: 0, letterSpacing: -0.25,
  paddingBottom: 12, borderBottom: `2px solid ${brand.colors.accent}`,
};

const subsectionHeading: React.CSSProperties = {
  fontSize: 17, fontWeight: 700, color: brand.colors.navy,
  margin: "0 0 8px",
};
