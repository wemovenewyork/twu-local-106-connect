import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DIVISIONS = [
  { code: "MABSTOA", name: "MaBSTOA", description: "Manhattan and Bronx Surface Transit Operating Authority" },
  { code: "MSII", name: "MSII", description: "Maintenance Support Section II" },
  { code: "MTABUS", name: "MTA Bus", description: "MTA Bus Company" },
  { code: "QUEENS", name: "Queens Division", description: "Queens Division" },
  { code: "TSC", name: "TSC", description: "Transit Services Center" },
];

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "L106-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function main() {
  console.log("Seeding divisions...");
  for (const d of DIVISIONS) {
    await prisma.division.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description },
      create: d,
    });
  }

  console.log("Seeding seed invite codes...");
  // Create a system user to own seed codes
  const systemUser = await prisma.user.upsert({
    where: { email: "system@local106.internal" },
    update: {},
    create: {
      email: "system@local106.internal",
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
      firstName: "System",
      lastName: "Admin",
      verified: true,
    },
  });

  const seedCodes = ["L106-2024A", "L106-2024B", "L106-2024C"];
  for (const code of seedCodes) {
    await prisma.inviteCode.upsert({
      where: { code },
      update: {},
      create: { code, createdBy: systemUser.id, isValid: true },
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
      role: "admin",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
