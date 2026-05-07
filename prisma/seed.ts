import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEPOTS = [
  { name: "Baisley Park Division", code: "BP", borough: "Queens", operator: "MTA Bus" },
  { name: "Casey Stengel Division", code: "CS", borough: "Queens", operator: "NYCT" },
  { name: "Castleton Division", code: "CA", borough: "Staten Island", operator: "NYCT" },
  { name: "Charleston Division", code: "CH", borough: "Staten Island", operator: "NYCT" },
  { name: "College Point Division", code: "CP", borough: "Queens", operator: "MTA Bus" },
  { name: "East New York Division", code: "EN", borough: "Brooklyn", operator: "NYCT" },
  { name: "Eastchester Division", code: "EC", borough: "Bronx", operator: "MTA Bus" },
  { name: "Far Rockaway Division", code: "FR", borough: "Queens", operator: "MTA Bus" },
  { name: "Flatbush Division", code: "FB", borough: "Brooklyn", operator: "NYCT" },
  { name: "Fresh Pond Division", code: "FP", borough: "Brooklyn", operator: "NYCT" },
  { name: "Grand Avenue Division", code: "GA", borough: "Brooklyn", operator: "NYCT" },
  { name: "Gun Hill Division", code: "GH", borough: "Bronx", operator: "MaBSTOA" },
  { name: "Jackie Gleason Division", code: "JG", borough: "Brooklyn", operator: "NYCT" },
  { name: "Jamaica Division", code: "JA", borough: "Queens", operator: "NYCT" },
  { name: "JFK Division", code: "JF", borough: "Queens", operator: "MTA Bus" },
  { name: "Kingsbridge Division", code: "KB", borough: "Bronx", operator: "MaBSTOA" },
  { name: "LaGuardia Division", code: "LG", borough: "Queens", operator: "MTA Bus" },
  { name: "Manhattanville Division", code: "MV", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Meredith Division", code: "ME", borough: "Staten Island", operator: "NYCT" },
  { name: "Michael J. Quill Division", code: "MQ", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Mother Clara Hale Division", code: "MC", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Queens Village Division", code: "QV", borough: "Queens", operator: "NYCT" },
  { name: "Spring Creek Division", code: "SC", borough: "Brooklyn", operator: "MTA Bus" },
  { name: "Tuskegee Airmen Division", code: "TA", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Ulmer Park Division", code: "UP", borough: "Brooklyn", operator: "NYCT" },
  { name: "West Farms Division", code: "WF", borough: "Bronx", operator: "MaBSTOA" },
  { name: "Yonkers Division", code: "YK", borough: "Bronx", operator: "MTA Bus" },
  { name: "Yukon Division", code: "YU", borough: "Staten Island", operator: "NYCT" },
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
  for (const d of DEPOTS) {
    await prisma.division.upsert({
      where: { code: d.code },
      update: {},
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
