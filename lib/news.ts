import { prisma } from "@/lib/prisma";

/**
 * Fetch published, publicly-visible news for the public news feed.
 */
export async function getPublicNews({ limit = 25, offset = 0 } = {}) {
  return prisma.news.findMany({
    where: {
      status: "published",
      publiclyVisible: true,
      publicSlug: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      publicSlug: true,
      publishedAt: true,
      body: true,
      division: { select: { code: true, name: true } },
    },
  });
}

export async function getPublicNewsBySlug(slug: string) {
  return prisma.news.findFirst({
    where: {
      publicSlug: slug,
      status: "published",
      publiclyVisible: true,
    },
    include: {
      author: { select: { firstName: true, lastName: true } },
      division: { select: { code: true, name: true } },
    },
  });
}

/**
 * Slugify a title into a URL-safe kebab-case ASCII slug.
 * - Lowercases everything
 * - Replaces non-ASCII letters/digits with `-`
 * - Collapses runs of `-`
 * - Trims leading/trailing `-`
 * - Caps at 80 chars
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Build a unique slug for a news post. If the base slug already exists on
 * a different post, append `-2`, `-3`, ... until unique.
 */
export async function buildUniquePublicSlug(
  title: string,
  excludeNewsId?: string,
): Promise<string> {
  const base = slugifyTitle(title) || "news";
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.news.findFirst({
      where: { publicSlug: candidate, ...(excludeNewsId ? { id: { not: excludeNewsId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export function newsExcerpt(body: string, maxChars = 250): string {
  const plain = body
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]*\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxChars) return plain;
  return plain.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
}
