import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DIVISIONS = [
  { code: "MABSTOA", name: "MaBSTOA", description: "Manhattan and Bronx Surface Transit Operating Authority" },
  { code: "MSII", name: "MSII", description: "Maintenance Support Section II" },
  { code: "MTABUS", name: "MTA Bus", description: "MTA Bus Company" },
  { code: "QUEENS", name: "Queens Division", description: "Queens Division" },
  { code: "TSC", name: "TSC", description: "Transit Services Center" },
];

async function main() {
  console.log("Seeding divisions...");
  for (const d of DIVISIONS) {
    await prisma.division.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description },
      create: d,
    });
  }

  console.log("Seeding sub-units...");
  const mabstoa = await prisma.division.findUnique({ where: { code: "MABSTOA" } });
  const mtabus = await prisma.division.findUnique({ where: { code: "MTABUS" } });
  if (!mabstoa || !mtabus) throw new Error("MABSTOA or MTABUS division missing");

  const SUB_UNITS = [
    { code: "OATRANS", name: "OA Transportation", divisionId: mabstoa.id },
    { code: "OAMAINT", name: "OA Maintenance", divisionId: mabstoa.id },
    { code: "MTABUSTRANS", name: "MTA Bus Trans", divisionId: mtabus.id },
    { code: "MTABUSMAINT", name: "MTA Bus Maint", divisionId: mtabus.id },
  ];
  for (const su of SUB_UNITS) {
    await prisma.subUnit.upsert({
      where: { code: su.code },
      update: { name: su.name, divisionId: su.divisionId },
      create: su,
    });
  }

  console.log("Seeding admin account...");
  const adminHash = await bcrypt.hash("L106connect0334", 10);
  await prisma.user.upsert({
    where: { email: "wemovenewyork.net@gmail.com" },
    update: {},
    create: {
      email: "wemovenewyork.net@gmail.com",
      passwordHash: adminHash,
      firstName: "Admin",
      lastName: "Local106",
      verified: true,
      role: "superAdmin",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
