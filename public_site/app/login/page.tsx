"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import {
  authClient,
  dashboardPath,
  errorMessage,
  googleUrl,
} from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    authClient
      .refresh()
      .then((session) => {
        if (!mounted) return;
        window.location.href = dashboardPath(session.user.role);
      })
      .catch(() => {
        if (mounted) setIsChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const session = await authClient.login({ email, password });
      window.location.href = dashboardPath(session.user.role);
    } catch (err) {
      setError(errorMessage(err));
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbfaf7] text-sm text-[#6d665c]">
        Checking session...
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-[#fbfaf7] text-[#191814] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#0f766e] lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.2),transparent_32%),linear-gradient(135deg,#0f766e,#08524e_52%,#063432)]" />
        <div className="relative z-10 flex flex-col justify-between p-10 text-white">
          <Link
            href="/"
            className="inline-flex w-fit rounded-lg border border-white/24 bg-white/90 px-4 py-3 shadow-lg shadow-black/10"
            aria-label="Officer Charles home"
          >
            <Image
              src="/new-logo.png"
              alt="Officer Charles"
              width={150}
              height={104}
              priority
              className="h-20 w-auto object-contain"
            />
          </Link>

          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/24 bg-white/12 px-4 py-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4" aria-hidden />
              20 free credits after signup
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">
              Ace your U.S. visa interview.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-white/82">
              Practice with Officer Charles through your secure backend account.
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            AI Visa Interview
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-lg border border-[#ded7ca] bg-white p-6 shadow-[0_24px_80px_rgba(43,36,26,0.12)] sm:p-8">
          <div className="mb-7 rounded-lg border border-[#ded7ca] bg-[#fffdf8] p-4">
            <Link href="/" className="flex items-center justify-center" aria-label="Officer Charles home">
              <Image
                src="/new-logo.png"
                alt="Officer Charles"
                width={160}
                height={110}
                priority
                className="h-20 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#e7f4ef] text-[#0f766e]">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <p className="mt-1 text-sm leading-6 text-[#6d665c]">
                Sign in to continue your interview prep.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Email">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                className="auth-next-input"
              />
            </Field>
            <Field label="Password">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                className="auth-next-input"
              />
            </Field>
            {error ? <SmartNotice text={error} /> : null}
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <AuthDivider />
          <button
            type="button"
            onClick={() => {
              window.location.href = googleUrl();
            }}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#ded7ca] bg-[#fffdf8] px-4 text-sm font-semibold text-[#191814] transition hover:border-[#0f766e] hover:bg-[#effaf6]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-[#ded7ca] bg-white text-sm font-bold text-[#191814]">
              G
            </span>
            Continue with Google
          </button>

          <p className="mt-5 text-center text-sm text-[#6d665c]">
            No account?{" "}
            <Link href="/register" className="font-semibold text-[#0f766e] hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d665c]">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#ded7ca]" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8170]">
        or
      </span>
      <div className="h-px flex-1 bg-[#ded7ca]" />
    </div>
  );
}

function SmartNotice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[#e6b7a9] bg-[#fff2ee] px-3 py-2 text-sm leading-6 text-[#8a3321]">
      {text}
    </div>
  );
}
