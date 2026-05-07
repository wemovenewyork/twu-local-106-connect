import { prisma } from "@/lib/prisma";

/**
 * Fetch publicly-visible documents for the public document library.
 * Up to `limit` documents, most-recent first.
 */
export async function getPublicDocuments({ limit = 100 } = {}) {
  return prisma.document.findMany({
    where: {
      publiclyVisible: true,
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      fileSize: true,
      mimeType: true,
      division: { select: { code: true, name: true } },
      createdAt: true,
    },
  });
}
