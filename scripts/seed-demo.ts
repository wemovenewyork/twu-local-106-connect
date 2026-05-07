#!/usr/bin/env tsx
/**
 * Demo seed script — populates the database with realistic-looking users
 * for showcase / leadership demos.
 *
 * Idempotent: re-running upserts existing users so password and role stay
 * stable. Distinct from prisma/seed.ts which only seeds divisions + sub-units.
 *
 * Usage: npm run seed-demo
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo123!Local106"; // 16 chars, meets policy

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: "member" | "divisionAdmin" | "localAdmin" | "superAdmin";
  divisionCode: string | null;
  subUnitCode?: string | null;
}

const SUPER: DemoUser[] = [
  { email: "wemovenewyork.net@gmail.com", firstName: "Haron", lastName: "Wilson", role: "superAdmin", divisionCode: null },
];

const DIVISION_ADMINS: DemoUser[] = [
  { email: "demo+admin-mabstoa-1@local106.test", firstName: "MaBSTOA", lastName: "Admin 1", role: "divisionAdmin", divisionCode: "MABSTOA" },
  { email: "demo+admin-mabstoa-2@local106.test", firstName: "MaBSTOA", lastName: "Admin 2", role: "divisionAdmin", divisionCode: "MABSTOA" },
  { email: "demo+admin-msii-1@local106.test", firstName: "MSII", lastName: "Admin 1", role: "divisionAdmin", divisionCode: "MSII" },
  { email: "demo+admin-msii-2@local106.test", firstName: "MSII", lastName: "Admin 2", role: "divisionAdmin", divisionCode: "MSII" },
  { email: "demo+admin-mtabus-1@local106.test", firstName: "MTA Bus", lastName: "Admin 1", role: "divisionAdmin", divisionCode: "MTABUS" },
  { email: "demo+admin-mtabus-2@local106.test", firstName: "MTA Bus", lastName: "Admin 2", role: "divisionAdmin", divisionCode: "MTABUS" },
  { email: "demo+admin-queens-1@local106.test", firstName: "Queens", lastName: "Admin 1", role: "divisionAdmin", divisionCode: "QUEENS" },
  { email: "demo+admin-queens-2@local106.test", firstName: "Queens", lastName: "Admin 2", role: "divisionAdmin", divisionCode: "QUEENS" },
  { email: "demo+admin-tsc-1@local106.test", firstName: "TSC", lastName: "Admin 1", role: "divisionAdmin", divisionCode: "TSC" },
  { email: "demo+admin-tsc-2@local106.test", firstName: "TSC", lastName: "Admin 2", role: "divisionAdmin", divisionCode: "TSC" },
];

const MEMBERS: DemoUser[] = [
  { email: "demo+member-mabstoa-trans@local106.test", firstName: "Marcus", lastName: "Reyes", role: "member", divisionCode: "MABSTOA", subUnitCode: "OATRANS" },
  { email: "demo+member-mabstoa-maint@local106.test", firstName: "Janelle", lastName: "Brooks", role: "member", divisionCode: "MABSTOA", subUnitCode: "OAMAINT" },
  { email: "demo+member-msii@local106.test", firstName: "Devon", lastName: "Caruso", role: "member", divisionCode: "MSII" },
  { email: "demo+member-queens@local106.test", firstName: "Priya", lastName: "Singh", role: "member", divisionCode: "QUEENS" },
  { email: "demo+member-tsc@local106.test", firstName: "Tomas", lastName: "Owusu", role: "member", divisionCode: "TSC" },
];

async function upsertUser(u: DemoUser, passwordHash: string) {
  let divisionId: string | null = null;
  let subUnitId: string | null = null;
  if (u.divisionCode) {
    const d = await prisma.division.findUnique({ where: { code: u.divisionCode } });
    if (!d) throw new Error(`Division ${u.divisionCode} missing — run db:seed first`);
    divisionId = d.id;
  }
  if (u.subUnitCode) {
    const su = await prisma.subUnit.findUnique({ where: { code: u.subUnitCode } });
    if (!su) throw new Error(`SubUnit ${u.subUnitCode} missing`);
    subUnitId = su.id;
  }

  const user = await prisma.user.upsert({
    where: { email: u.email },
    update: {
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      divisionId,
      subUnitId,
      verified: true,
      verifiedMember: true,
      passwordHash,
    },
    create: {
      email: u.email,
      passwordHash,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      divisionId,
      subUnitId,
      verified: true,
      verifiedMember: true,
    },
  });

  // Members carry an approved RegistrationApproval so the data shape mirrors
  // production (admin queue stays empty, /pending-approval is skipped).
  if (u.role === "member" && divisionId) {
    await prisma.registrationApproval.upsert({
      where: { userId: user.id },
      update: {
        status: "approved",
        declaredDivisionId: divisionId,
        declaredSubUnitId: subUnitId,
        assignedDivisionId: divisionId,
        assignedSubUnitId: subUnitId,
        reviewedAt: new Date(),
      },
      create: {
        userId: user.id,
        status: "approved",
        declaredDivisionId: divisionId,
        declaredSubUnitId: subUnitId,
        assignedDivisionId: divisionId,
        assignedSubUnitId: subUnitId,
        reviewedAt: new Date(),
      },
    });
  }

  await prisma.reputation.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
}

async function main() {
  console.log("Seeding demo data...");
  console.log("");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const u of SUPER) await upsertUser(u, passwordHash);
  for (const u of DIVISION_ADMINS) await upsertUser(u, passwordHash);
  for (const u of MEMBERS) await upsertUser(u, passwordHash);

  const all = [...SUPER, ...DIVISION_ADMINS, ...MEMBERS];
  const bar = "━".repeat(60);
  console.log(bar);
  console.log("  DEMO SEED COMPLETE");
  console.log(bar);
  console.log(`  Total users: ${all.length}`);
  console.log(`    Super:     ${SUPER.length}`);
  console.log(`    Division:  ${DIVISION_ADMINS.length}`);
  console.log(`    Members:   ${MEMBERS.length}`);
  console.log("");
  console.log(`  Password (all demo users): ${DEMO_PASSWORD}`);
  console.log(bar);
  console.log("  Sample logins:");
  for (const u of all.slice(0, 6)) {
    console.log(`    ${u.email}  (${u.role}${u.divisionCode ? `/${u.divisionCode}` : ""})`);
  }
  console.log(`    … plus ${all.length - 6} more`);
  console.log(bar);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
