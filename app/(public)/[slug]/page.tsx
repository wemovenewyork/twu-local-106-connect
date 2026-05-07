import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function PublicPageBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const page = await prisma.page.findFirst({
    where: { slug, published: true },
  });

  if (!page) notFound();

  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1A1F4D", lineHeight: 1.15, marginBottom: 24 }}>
        {page.title}
      </h1>
      <div className="prose-public" style={{ fontSize: 16, lineHeight: 1.7, color: "#1f2937" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
      </div>
    </article>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, published: true },
    select: { title: true, metaDescription: true },
  });
  if (!page) return {};
  return {
    title: `${page.title} — ${brand.unionName}`,
    description: page.metaDescription || undefined,
  };
}
