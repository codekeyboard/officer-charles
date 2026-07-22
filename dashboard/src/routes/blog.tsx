import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { blogPosts } from "@/content/blogPosts";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog · Officer Charles" },
      {
        name: "description",
        content: "Visa interview preparation guides from Officer Charles for F1 and B1/B2 applicants.",
      },
    ],
  }),
  component: Blog,
});

function Blog() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/blog") {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/">
            <Logo variant="light" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <Link to="/register" className="hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] sm:inline-flex">
              Try free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative overflow-hidden px-4 py-16 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.14),transparent_34%)]" />
        <section className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Officer Charles Blog
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
              Better visa interview answers start with better practice.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/62">
              Practical guides for F1 and B1/B2 applicants using Officer Charles to train, simulate, and review their interview performance.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {blogPosts.map((post) => (
              <article key={post.title} className="group rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:border-sky-300/40">
                <div className="flex items-center justify-between gap-3 text-xs text-white/50">
                  <span className="rounded-full bg-sky-300/10 px-3 py-1 font-semibold text-sky-100">{post.category}</span>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {post.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
                <h2 className="mt-5 text-xl font-semibold leading-tight text-white">{post.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/60">{post.excerpt}</p>
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-100 transition hover:gap-3"
                >
                  Read more
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
