"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Gift, ShieldCheck } from "lucide-react";
import {
  authClient,
  DASHBOARD_URL,
  errorMessage,
  googleUrl,
} from "@/lib/auth-client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!verificationSent || resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds, verificationSent]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await authClient.register({ name, email, password });
      setVerificationSent(result.verificationRequired);
      setExpiresInMinutes(result.expiresInMinutes);
      setResendSeconds(60);
      setDevCode(result.devCode || "");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await authClient.verifyRegistration({ email, code });
      window.location.href = `${DASHBOARD_URL}/user/dashboard`;
    } catch (err) {
      setError(errorMessage(err));
      setIsLoading(false);
    }
  }

  async function resendCode() {
    if (resendSeconds > 0 || isResending) return;
    setError("");
    setIsResending(true);
    try {
      const result = await authClient.resendRegistrationCode({ email });
      setExpiresInMinutes(result.expiresInMinutes);
      setResendSeconds(60);
      setDevCode(result.devCode || "");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsResending(false);
    }
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
              <Gift className="h-4 w-4" aria-hidden />
              Start with 20 free credits
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">
              Build your visa interview confidence.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-white/82">
              Create your account, verify your email, and continue inside the
              secure dashboard.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/82">
            <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Secure account and saved history" />
            <Feature icon={<BadgeCheck className="h-4 w-4" />} text="Training and simulation modes" />
          </div>
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
              {verificationSent ? (
                <BadgeCheck className="h-5 w-5" aria-hidden />
              ) : (
                <Gift className="h-5 w-5" aria-hidden />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">
                {verificationSent ? "Verify your email" : "Create your account"}
              </h1>
              <p className="mt-1 text-sm leading-6 text-[#6d665c]">
                {verificationSent
                  ? `Enter the one-time code sent to ${email}. It expires in ${expiresInMinutes} minutes.`
                  : "Start with 20 free credits for Officer Charles practice."}
              </p>
            </div>
          </div>

          {!verificationSent ? (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="auth-next-input"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="auth-next-input"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="auth-next-input"
                />
              </Field>
              {error ? <SmartNotice text={error} /> : null}
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Creating account..." : "Create account"}
                <ArrowRight size={18} aria-hidden />
              </button>
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
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={verify}>
              <Field label="Verification code">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  className="auth-next-input text-center text-2xl tracking-[0.4em]"
                />
              </Field>
              {devCode ? (
                <SmartNotice text={`Development code: ${devCode}`} tone="info" />
              ) : null}
              {error ? <SmartNotice text={error} /> : null}
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Verifying..." : "Verify and continue"}
              </button>
              <button
                type="button"
                onClick={() => void resendCode()}
                disabled={resendSeconds > 0 || isResending}
                className="h-11 w-full rounded-lg border border-[#ded7ca] bg-[#fffdf8] text-sm font-semibold text-[#191814] transition hover:border-[#0f766e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendSeconds > 0
                  ? `Resend code in ${resendSeconds}s`
                  : isResending
                    ? "Sending..."
                    : "Resend code"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-[#6d665c]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#0f766e] hover:underline">
              Sign in
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

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{text}</span>
    </div>
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

function SmartNotice({
  text,
  tone = "error",
}: {
  text: string;
  tone?: "error" | "info";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm leading-6 ${
        tone === "info"
          ? "border-[#b6d7d2] bg-[#effaf6] text-[#0f766e]"
          : "border-[#e6b7a9] bg-[#fff2ee] text-[#8a3321]"
      }`}
    >
      {text}
    </div>
  );
}
