import Link from "next/link";
import { ArrowRight, Check, CreditCard, GraduationCap, ShieldCheck, Sparkles, Video } from "lucide-react";
import { creditUses, pricingPlans } from "@/lib/content";
import { SimplePageShell } from "@/components/SimplePageShell";

export default function PricingPage() {
  return (
    <SimplePageShell
      eyebrow="Try free with 20 signup credits"
      title="Buy simple interview credits."
      description="No subscription wording, no confusing limits. Use credits for Officer Charles chat training and real visa interview simulations."
    >
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#b6d7d2] bg-[#e7f4ef] px-3 py-2 text-xs font-semibold text-[#0f766e]">
          <Sparkles className="h-4 w-4" aria-hidden />
          Credit packs
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {creditUses.map((item, index) => {
            const Icon = [GraduationCap, ShieldCheck, Video][index];
            return (
              <article key={item.title} className="rounded-lg border border-[#ded7ca] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f4ef] text-[#0f766e]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="rounded-lg bg-[#fff7cf] px-2.5 py-1 text-xs font-semibold text-[#7a5a09]">
                    {item.credits}
                  </span>
                </div>
                <h2 className="mt-4 font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6d665c]">{item.text}</p>
              </article>
            );
          })}
        </div>
        <div id="credit-packs" className="grid gap-3">
          {pricingPlans.map((plan) => (
            <article key={plan.id} className="rounded-lg border border-[#ded7ca] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <p className="mt-1 text-sm text-[#6d665c]">{plan.creditAmount} credits</p>
                </div>
                <p className="text-3xl font-semibold">${plan.price}</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[#403a31]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <Link
          href="/register"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#191814] px-5 text-sm font-semibold text-white transition hover:bg-[#2b261f]"
        >
          <CreditCard size={18} aria-hidden />
          Try free
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </SimplePageShell>
  );
}
