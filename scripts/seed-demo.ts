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

interface DemoNews {
  authorEmail: string;
  title: string;
  body: string;
  divisionCode: string | null; // null = all-divisions
  publishedDaysAgo: number;
}

const NEWS_POSTS: DemoNews[] = [
  {
    authorEmail: "wemovenewyork.net@gmail.com",
    title: "Welcome to TWU Local 106 Connect",
    divisionCode: null,
    publishedDaysAgo: 7,
    body: `# Welcome

This is the official member portal for TWU Local 106. You can:

- Find shift swaps in your division
- Read union news and announcements
- Access forms and benefits info

Questions? Reach out to your division admin.`,
  },
  {
    authorEmail: "demo+admin-mabstoa-1@local106.test",
    title: "OA Transportation: New Bid Schedule Posted",
    divisionCode: "MABSTOA",
    publishedDaysAgo: 2,
    body: `The Q2 bid schedule is now available. Bids close Friday at 17:00.

## Key dates

- Bid period: 4/15 – 4/19
- Posting date: 4/22
- Effective: 5/1

Reach out to your unit officers with questions.`,
  },
  {
    authorEmail: "demo+admin-queens-1@local106.test",
    title: "Queens Division Meeting: April 25",
    divisionCode: "QUEENS",
    publishedDaysAgo: 1,
    body: `Monthly division meeting will be held at the union hall on April 25 at 18:00.

Agenda:
- Contract negotiation update
- Safety committee report
- New member welcome

Food will be provided.`,
  },
];

async function seedNews(superUserId: string): Promise<number> {
  let created = 0;
  for (const post of NEWS_POSTS) {
    const author = await prisma.user.findUnique({ where: { email: post.authorEmail } });
    if (!author) {
      console.warn(`  Skipping news "${post.title}" — author ${post.authorEmail} not found`);
      continue;
    }
    let divisionId: string | null = null;
    if (post.divisionCode) {
      const d = await prisma.division.findUnique({ where: { code: post.divisionCode } });
      if (!d) {
        console.warn(`  Skipping news "${post.title}" — division ${post.divisionCode} not found`);
        continue;
      }
      divisionId = d.id;
    }
    // Idempotent: skip if a post with the same author + title already exists.
    const existing = await prisma.news.findFirst({
      where: { authorId: author.id, title: post.title },
    });
    if (existing) continue;

    const publishedAt = new Date(Date.now() - post.publishedDaysAgo * 24 * 60 * 60 * 1000);
    await prisma.news.create({
      data: {
        title: post.title,
        body: post.body,
        status: "published",
        divisionId,
        authorId: author.id,
        // Seed exempt from two-person rule; reviewer = superAdmin so the
        // record has a non-null reviewer for display continuity.
        reviewerId: superUserId,
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      },
    });
    created++;
  }
  return created;
}

interface DemoDoc {
  uploaderEmail: string;
  title: string;
  description: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  visibility: "all" | "division" | "subUnit" | "selfOnly";
  divisionCode: string | null;
}

const DEMO_DOCS: DemoDoc[] = [
  {
    uploaderEmail: "wemovenewyork.net@gmail.com",
    title: "TWU Local 106 — Member Handbook",
    description: "The complete member handbook covering rights, responsibilities, and resources.",
    fileUrl: "https://example.com/placeholder-handbook.pdf",
    fileSize: 1024 * 500,
    mimeType: "application/pdf",
    visibility: "all",
    divisionCode: null,
  },
  {
    uploaderEmail: "demo+admin-mabstoa-1@local106.test",
    title: "OA Transportation: Q2 Bid Schedule",
    description: "The current quarter bid schedule for OA Transportation.",
    fileUrl: "https://example.com/placeholder-bid-schedule.pdf",
    fileSize: 1024 * 200,
    mimeType: "application/pdf",
    visibility: "division",
    divisionCode: "MABSTOA",
  },
];

async function seedDocuments(): Promise<number> {
  let created = 0;
  for (const doc of DEMO_DOCS) {
    const uploader = await prisma.user.findUnique({ where: { email: doc.uploaderEmail } });
    if (!uploader) {
      console.warn(`  Skipping doc "${doc.title}" — uploader ${doc.uploaderEmail} not found`);
      continue;
    }
    let divisionId: string | null = null;
    if (doc.divisionCode) {
      const d = await prisma.division.findUnique({ where: { code: doc.divisionCode } });
      if (!d) {
        console.warn(`  Skipping doc "${doc.title}" — division ${doc.divisionCode} not found`);
        continue;
      }
      divisionId = d.id;
    }
    // Idempotent: skip if a doc with the same uploader + title already exists.
    const existing = await prisma.document.findFirst({
      where: { uploaderId: uploader.id, title: doc.title },
    });
    if (existing) continue;

    await prisma.document.create({
      data: {
        title: doc.title,
        description: doc.description,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        visibility: doc.visibility,
        divisionId,
        uploaderId: uploader.id,
      },
    });
    created++;
  }
  return created;
}

interface OvertimeSeed {
  submitterEmail: string;
  payrollNumber: string;
  daysFromNow: number; // negative = past
  type: "rdo" | "doubleShift";
  preferences: string | null;
  status: "submitted" | "withdrawn" | "acknowledged";
}

const DEMO_OVERTIME: OvertimeSeed[] = [
  {
    submitterEmail: "demo+member-mabstoa-trans@local106.test",
    payrollNumber: "A12345",
    daysFromNow: 1,
    type: "rdo",
    preferences: "uptown only, no nights, no mobile",
    status: "submitted",
  },
  {
    submitterEmail: "demo+member-mabstoa-maint@local106.test",
    payrollNumber: "B67890",
    daysFromNow: 2,
    type: "doubleShift",
    preferences: "early work preferred",
    status: "submitted",
  },
  {
    submitterEmail: "demo+member-queens@local106.test",
    payrollNumber: "Q11111",
    daysFromNow: 7,
    type: "rdo",
    preferences: null,
    status: "submitted",
  },
  {
    submitterEmail: "demo+member-msii@local106.test",
    payrollNumber: "M44221",
    daysFromNow: 4,
    type: "doubleShift",
    preferences: "no overnight; available after 14:00",
    status: "submitted",
  },
  {
    submitterEmail: "demo+member-tsc@local106.test",
    payrollNumber: "T55903",
    daysFromNow: -3,
    type: "rdo",
    preferences: "any depot",
    status: "acknowledged",
  },
  {
    submitterEmail: "demo+member-mabstoa-trans@local106.test",
    payrollNumber: "A12345",
    daysFromNow: -7,
    type: "doubleShift",
    preferences: null,
    status: "acknowledged",
  },
  {
    submitterEmail: "demo+member-queens@local106.test",
    payrollNumber: "Q11111",
    daysFromNow: -10,
    type: "rdo",
    preferences: "swapped to acknowledged for demo",
    status: "withdrawn",
  },
];

function dayUTC(daysFromNow: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromNow));
}

async function seedOvertimeRequests(): Promise<number> {
  let created = 0;
  for (const o of DEMO_OVERTIME) {
    const submitter = await prisma.user.findUnique({ where: { email: o.submitterEmail } });
    if (!submitter) {
      console.warn(`  Skipping OT request — submitter ${o.submitterEmail} not found`);
      continue;
    }
    const requestedDate = dayUTC(o.daysFromNow);

    // Idempotent: skip if a request for this submitter + date + type already exists.
    const existing = await prisma.overtimeRequest.findFirst({
      where: { submitterId: submitter.id, requestedDate, type: o.type },
    });
    if (existing) continue;

    await prisma.overtimeRequest.create({
      data: {
        submitterId: submitter.id,
        payrollNumber: o.payrollNumber,
        requestedDate,
        type: o.type,
        preferences: o.preferences,
        status: o.status,
        acknowledgedAt: o.status === "acknowledged" ? new Date() : null,
        withdrawnAt: o.status === "withdrawn" ? new Date() : null,
      },
    });
    created++;
  }
  return created;
}

async function main() {
  console.log("Seeding demo data...");
  console.log("");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const u of SUPER) await upsertUser(u, passwordHash);
  for (const u of DIVISION_ADMINS) await upsertUser(u, passwordHash);
  for (const u of MEMBERS) await upsertUser(u, passwordHash);

  const superUser = await prisma.user.findUnique({ where: { email: SUPER[0].email } });
  if (!superUser) throw new Error("Super user missing after seed");
  const newsCreated = await seedNews(superUser.id);
  const docsCreated = await seedDocuments();
  const otCreated = await seedOvertimeRequests();

  const all = [...SUPER, ...DIVISION_ADMINS, ...MEMBERS];
  const bar = "━".repeat(60);
  console.log(bar);
  console.log("  DEMO SEED COMPLETE");
  console.log(bar);
  console.log(`  Total users: ${all.length}`);
  console.log(`    Super:     ${SUPER.length}`);
  console.log(`    Division:  ${DIVISION_ADMINS.length}`);
  console.log(`    Members:   ${MEMBERS.length}`);
  console.log(`  News posts created this run: ${newsCreated} (target: ${NEWS_POSTS.length})`);
  console.log(`  Documents created this run:  ${docsCreated} (target: ${DEMO_DOCS.length})`);
  console.log(`  OT requests created this run: ${otCreated} (target: ${DEMO_OVERTIME.length})`);
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
