import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { blogPosts, getBlogPost } from "@/lib/content";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Officer Charles`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-6 text-[#191814] sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbc4b4] bg-white px-4 text-sm font-semibold transition hover:border-[#0f766e]"
        >
          <ArrowLeft size={17} aria-hidden />
          Blog
        </Link>
        <header className="py-12">
          <p className="text-sm font-semibold uppercase text-[#0f766e]">
            {post.category} / {post.date} / {post.readTime}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-base leading-7 text-[#6d665c]">{post.excerpt}</p>
        </header>
        <div className="rounded-lg border border-[#ded7ca] bg-white p-6 shadow-[0_18px_54px_rgba(43,36,26,0.08)] sm:p-8">
          <div className="space-y-5 text-base leading-8 text-[#403a31]">
            {post.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
