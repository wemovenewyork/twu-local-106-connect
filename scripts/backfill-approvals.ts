/**
 * One-off backfill: create an `approved` RegistrationApproval for every
 * member-tier user who already has a division but no approval record.
 * Safe to re-run (skips users who have a record).
 *
 * Run: npx tsx scripts/backfill-approvals.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      divisionId: { not: null },
      registrationApproval: null,
    },
    select: { id: true, email: true, divisionId: true, subUnitId: true },
  });
  console.log(`Backfilling ${users.length} user(s)…`);
  for (const u of users) {
    await prisma.registrationApproval.create({
      data: {
        userId: u.id,
        declaredDivisionId: u.divisionId,
        declaredSubUnitId: u.subUnitId,
        assignedDivisionId: u.divisionId,
        assignedSubUnitId: u.subUnitId,
        status: "approved",
        reviewedAt: new Date(),
      },
    });
    console.log(`  ✓ ${u.email}`);
  }
  console.log("Done.");
}

main().finally(() => prisma.$disconnect());
