import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { getBlogPost } from "@/content/blogPosts";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getBlogPost(params.slug);

    return {
      meta: [
        { title: post ? `${post.title} · Officer Charles` : "Blog post · Officer Charles" },
        {
          name: "description",
          content:
            post?.excerpt ||
            "Visa interview preparation guide from Officer Charles for F1 and B1/B2 applicants.",
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = getBlogPost(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <PublicHeader />
        <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
            Article not found
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">This blog post is not available.</h1>
          <p className="mt-4 text-base leading-8 text-white/62">
            The article may have moved. You can return to the blog and choose another guide.
          </p>
          <Link
            to="/blog"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicHeader />
      <main className="relative overflow-hidden px-4 py-16 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.14),transparent_34%)]" />
        <article className="relative mx-auto max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-100 transition hover:gap-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
            <ShieldCheck className="h-3.5 w-3.5" />
            {post.category}
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">{post.title}</h1>
          <p className="mt-5 text-base leading-8 text-white/62">{post.excerpt}</p>

          <div className="mt-7 flex flex-wrap items-center gap-4 border-y border-white/10 py-4 text-sm text-white/55">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {post.date}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>

          <div className="mt-10 space-y-6 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
            {post.body.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8 text-white/72">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-amber-200/20 bg-amber-200/10 p-6">
            <div className="text-lg font-semibold text-white">Ready to practice this topic?</div>
            <p className="mt-2 text-sm leading-7 text-white/62">
              Sign up for Officer Charles and use your 20 free credits to practice with realistic F1 and B1/B2 interview questions.
            </p>
            <Link
              to="/register"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              Try free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="border-b border-white/10 bg-black/35 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/">
          <Logo variant="light" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/blog"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Blog
          </Link>
          <Link
            to="/register"
            className="hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] sm:inline-flex"
          >
            Try free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
