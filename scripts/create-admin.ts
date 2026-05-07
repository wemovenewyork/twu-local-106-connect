#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const VALID_ROLES = ["divisionAdmin", "localAdmin", "superAdmin"] as const;
type AdminRole = (typeof VALID_ROLES)[number];

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = match[2];
    }
  }
  return args;
}

function usage(): never {
  console.error("Usage: npm run create-admin -- --email=<email> --role=<role> [--division=<code>] [--first-name=<name>] [--last-name=<name>]");
  console.error(`Roles: ${VALID_ROLES.join(", ")}`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email || !args.role) usage();

  const email = args.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Invalid email: ${args.email}`);
    process.exit(1);
  }

  if (!VALID_ROLES.includes(args.role as AdminRole)) {
    console.error(`Invalid role: ${args.role}. Must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }
  const role = args.role as AdminRole;

  if (role === "divisionAdmin" && !args.division) {
    console.error("divisionAdmin role requires --division=<code>");
    process.exit(1);
  }

  let divisionId: string | null = null;
  if (args.division) {
    const division = await prisma.division.findUnique({ where: { code: args.division } });
    if (!division) {
      console.error(`Division with code "${args.division}" not found`);
      process.exit(1);
    }
    divisionId = division.id;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User with email "${email}" already exists. Use a different email or delete the existing user first.`);
    process.exit(1);
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: args.firstName || "Admin",
      lastName: args.lastName || "",
      role,
      verified: true,
      verifiedMember: true,
      divisionId,
    },
  });

  const bar = "━".repeat(60);
  console.log("");
  console.log(bar);
  console.log("  ADMIN USER CREATED");
  console.log(bar);
  console.log(`  Email:    ${user.email}`);
  console.log(`  Role:     ${user.role}`);
  if (args.division) console.log(`  Division: ${args.division}`);
  console.log(`  Password: ${password}`);
  console.log(bar);
  console.log("  Save this password securely. It will not be shown again.");
  console.log("  The admin should change it on first login.");
  console.log(bar);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
