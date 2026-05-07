import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { brand } from "@/config/brand";
import { getPublicNewsBySlug } from "@/lib/news";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublicNewsBySlug(slug);
  if (!article) return { title: `News — ${brand.unionName}` };
  return {
    title: `${article.title} — ${brand.unionName}`,
    description: article.body.slice(0, 160).replace(/\s+/g, " ").trim(),
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublicNewsBySlug(slug);

  if (!article) notFound();

  const authorLine = article.author
    ? `${article.author.firstName} ${article.author.lastName.charAt(0)}.`
    : null;

  return (
    <article style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 64px" }}>
      <Link
        href="/news"
        style={{
          display: "inline-block",
          fontSize: 13,
          color: brand.colors.mutedForeground,
          textDecoration: "none",
          margin: "0 0 24px",
        }}
      >
        ← All news
      </Link>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
          color: brand.colors.mutedForeground,
          margin: "0 0 16px",
        }}
      >
        {article.division ? (
          <span
            style={{
              background: brand.colors.muted,
              color: brand.colors.navy,
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {article.division.code}
          </span>
        ) : (
          <span
            style={{
              background: brand.colors.muted,
              color: brand.colors.navy,
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Local-Wide
          </span>
        )}
        <span>{formatDate(article.publishedAt)}</span>
        {authorLine && <span>· By {authorLine}</span>}
      </div>

      <h1
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: brand.colors.navy,
          margin: "0 0 24px",
          letterSpacing: -0.5,
          lineHeight: 1.15,
        }}
      >
        {article.title}
      </h1>

      <div
        style={{
          fontSize: 16,
          lineHeight: 1.75,
          color: "#1F2937",
        }}
        className="public-news-markdown"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </div>

      <style>{`
        .public-news-markdown h1, .public-news-markdown h2, .public-news-markdown h3 {
          color: ${brand.colors.navy};
          margin-top: 28px;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .public-news-markdown h2 { font-size: 22px; }
        .public-news-markdown h3 { font-size: 18px; }
        .public-news-markdown p { margin: 0 0 16px; }
        .public-news-markdown a { color: ${brand.colors.accent}; }
        .public-news-markdown ul, .public-news-markdown ol { margin: 0 0 16px; padding-left: 24px; }
        .public-news-markdown li { margin-bottom: 6px; }
        .public-news-markdown blockquote {
          border-left: 3px solid ${brand.colors.muted};
          padding-left: 16px;
          margin: 0 0 16px;
          color: ${brand.colors.mutedForeground};
        }
      `}</style>
    </article>
  );
}
