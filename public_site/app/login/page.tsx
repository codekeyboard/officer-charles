import { LogIn, Mail } from "lucide-react";
import { SimplePageShell } from "@/components/SimplePageShell";

export default function LoginPage() {
  return (
    <SimplePageShell
      eyebrow="Secure access"
      title="Sign in to continue practicing."
      description="Use your Officer Charles account to return to interview history, saved story details, and credit balance."
    >
      <form className="rounded-lg border border-[#ded7ca] bg-white p-5 shadow-[0_24px_80px_rgba(43,36,26,0.12)] sm:p-6">
        <label htmlFor="email" className="text-sm font-semibold">
          Email address
        </label>
        <div className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-[#d8d0bf] px-3 focus-within:border-[color:var(--teal)] focus-within:ring-4 focus-within:ring-[#0f766e1c]">
          <Mail size={18} className="text-[color:var(--muted)]" aria-hidden />
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#191814] px-5 text-sm font-semibold text-white transition hover:bg-[#2b261f]"
        >
          <LogIn size={18} aria-hidden />
          Continue
        </button>
      </form>
    </SimplePageShell>
  );
}
