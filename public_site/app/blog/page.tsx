import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/lib/content";
import { SimplePageShell } from "@/components/SimplePageShell";

export default function BlogPage() {
  return (
    <SimplePageShell
      eyebrow="Officer Charles Blog"
      title="Practical guides for F1 and B1/B2 applicants."
      description="Visa interview preparation guides from Officer Charles for applicants using the product to train, simulate, and review their interview performance."
    >
      <div className="grid gap-3">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="rounded-lg border border-[#ded7ca] bg-white p-5 transition hover:border-[#0f766e] hover:shadow-[0_16px_40px_rgba(43,36,26,0.1)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#0f766e]">
                  {post.category} / {post.readTime}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{post.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6d665c]">{post.excerpt}</p>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[#0f766e]" aria-hidden />
            </div>
          </Link>
        ))}
      </div>
    </SimplePageShell>
  );
}
