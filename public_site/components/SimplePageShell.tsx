import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type SimplePageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function SimplePageShell({
  eyebrow,
  title,
  description,
  children,
}: SimplePageShellProps) {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/new-logo.png"
              alt=""
              width={58}
              height={40}
              className="h-10 w-auto rounded-lg object-contain"
            />
            <span className="font-semibold">Officer Charles</span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbc4b4] bg-white px-4 text-sm font-semibold transition hover:border-[color:var(--teal)]"
          >
            <ArrowLeft size={17} aria-hidden />
            Home
          </Link>
        </header>

        <section className="grid min-h-[calc(100vh-104px)] gap-8 py-14 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-[color:var(--teal)]">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--muted)]">
              {description}
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
