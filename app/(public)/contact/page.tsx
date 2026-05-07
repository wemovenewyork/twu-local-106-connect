import { brand } from "@/config/brand";
import { prisma } from "@/lib/prisma";
import ContactForm from "./ContactForm";

export const metadata = {
  title: `Contact — ${brand.unionName}`,
  description: `Reach ${brand.unionName} officers and staff.`,
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const officers = await prisma.officer.findMany({
    where: { active: true, contactFormEnabled: true, contactEmail: { not: null } },
    orderBy: [{ scope: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, title: true },
  });

  return (
    <article style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px 96px" }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: brand.colors.accent,
          margin: "0 0 14px",
        }}
      >
        Contact
      </p>
      <h1
        style={{
          fontSize: "clamp(34px, 5vw, 44px)",
          fontWeight: 800,
          color: brand.colors.navy,
          margin: "0 0 16px",
          letterSpacing: -0.5,
          lineHeight: 1.1,
        }}
      >
        Reach the union
      </h1>
      <p
        style={{
          fontSize: 17,
          lineHeight: 1.6,
          color: brand.colors.mutedForeground,
          margin: "0 0 48px",
          maxWidth: 720,
        }}
      >
        Send a message to the union office or directly to one of our elected
        officers. For shift swap questions, please use the in-app messaging
        once you sign in.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 48,
          alignItems: "start",
        }}
      >
        <section>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: brand.colors.navy,
              margin: "0 0 12px",
            }}
          >
            Union office
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.8, color: brand.colors.navy }}>
            <li>
              <strong>{brand.organizationName}</strong>
            </li>
            <li>57-68 Mosholu Avenue</li>
            <li>Bronx, New York 10471</li>
            <li>
              Phone:{" "}
              <a href="tel:+17186017100" style={{ color: brand.colors.accent }}>
                (718) 601-7100
              </a>
            </li>
            <li>Fax: (718) 601-6300</li>
          </ul>

          {officers.length > 0 && (
            <>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: brand.colors.navy,
                  margin: "32px 0 12px",
                }}
              >
                Officers
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {officers.map((o) => (
                  <li
                    key={o.id}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid #F1F4F9",
                      fontSize: 14,
                      color: brand.colors.navy,
                    }}
                  >
                    <strong>{o.name}</strong>
                    <br />
                    <span style={{ color: brand.colors.mutedForeground, fontSize: 13 }}>{o.title}</span>
                  </li>
                ))}
              </ul>
              <p
                style={{
                  fontSize: 13,
                  color: brand.colors.mutedForeground,
                  margin: "12px 0 0",
                }}
              >
                Use the form to send a message to any officer. Their email is
                kept private — your message is forwarded on your behalf.
              </p>
            </>
          )}
        </section>

        <section>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: brand.colors.navy,
              margin: "0 0 16px",
            }}
          >
            Send a message
          </h2>
          <ContactForm officers={officers} />
        </section>
      </div>
    </article>
  );
}
