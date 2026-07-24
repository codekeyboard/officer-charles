import { ArrowRight, UserPlus } from "lucide-react";
import { SimplePageShell } from "@/components/SimplePageShell";

export default function RegisterPage() {
  return (
    <SimplePageShell
      eyebrow="20 free credits"
      title="Create your practice account."
      description="Start with a guided interview path for F-1 student or B1/B2 visitor preparation, then use feedback to refine each answer."
    >
      <form className="rounded-lg border border-[#ded7ca] bg-white p-5 shadow-[0_24px_80px_rgba(43,36,26,0.12)] sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Full name</span>
            <input
              type="text"
              placeholder="Your name"
              className="mt-2 h-12 w-full rounded-lg border border-[#d8d0bf] px-3 text-sm outline-none focus:border-[color:var(--teal)] focus:ring-4 focus:ring-[#0f766e1c]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              className="mt-2 h-12 w-full rounded-lg border border-[#d8d0bf] px-3 text-sm outline-none focus:border-[color:var(--teal)] focus:ring-4 focus:ring-[#0f766e1c]"
            />
          </label>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">Practice path</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {["F-1 student", "B1/B2 visitor"].map((path) => (
              <label
                key={path}
                className="flex h-12 items-center gap-3 rounded-lg border border-[#d8d0bf] px-3 text-sm font-semibold"
              >
                <input type="radio" name="path" className="accent-[color:var(--teal)]" />
                {path}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--teal)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--teal-dark)]"
        >
          <UserPlus size={18} aria-hidden />
          Create account
          <ArrowRight size={18} aria-hidden />
        </button>
      </form>
    </SimplePageShell>
  );
}
