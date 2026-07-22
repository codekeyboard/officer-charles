import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ArrowRight, Check, CreditCard, GraduationCap, ShieldCheck, Sparkles, Video } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { billingService } from "@/services/billing.service";
import { errorMessage } from "@/services/api";
import type { Plan } from "@/services/types";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing · Officer Charles" },
      {
        name: "description",
        content:
          "Buy Officer Charles interview credits. Start free with 20 credits, then choose Starter, Pro, or Premium credit packs.",
      },
    ],
  }),
  component: Pricing,
});

const creditUses = [
  { icon: GraduationCap, title: "Chat Training", credits: "5 credits", text: "Practice mode with hints and coaching." },
  { icon: ShieldCheck, title: "Real Simulation", credits: "10 credits", text: "Exam-style mode with detailed feedback afterward." },
  { icon: Video, title: "Video Training", credits: "15 credits", text: "Coming Soon for live interview practice." },
];

function Pricing() {
  const plans = useQuery({ queryKey: ["plans"], queryFn: billingService.getPlans });

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/78 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Officer Charles home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="hidden rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:inline-flex">
              Home
            </Link>
            <Link to="/login" className="hidden rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl purple-gradient px-4 text-sm font-semibold text-white purple-glow transition hover:opacity-95">
              Try free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_4%,color-mix(in_oklab,var(--primary)_24%,transparent),transparent_35%),radial-gradient(circle_at_80%_10%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_34%)]" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-5xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Try free with 20 signup credits
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
              Buy simple interview credits.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              No subscription wording, no confusing limits. Use credits for Officer Charles chat training and real visa interview simulations.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl purple-gradient px-6 text-base font-semibold text-white purple-glow transition hover:opacity-95">
                Try free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#credit-packs" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-6 text-base font-semibold text-foreground backdrop-blur transition hover:bg-secondary">
                View credit packs
              </a>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-border bg-secondary/35 px-4 py-12 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {creditUses.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">{item.credits}</span>
                </div>
                <h2 className="mt-5 font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="credit-packs" className="relative overflow-hidden bg-slate-950 px-4 py-20 text-white sm:px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_85%_18%,rgba(52,211,153,0.14),transparent_34%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Credit packs</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Pick the pack that fits your practice plan.</h2>
              <p className="mt-3 text-sm leading-7 text-white/62 sm:text-base">
                Credits are added after checkout is completed and the verified payment event activates the purchase.
              </p>
            </div>

            {plans.isLoading && <State>Loading credit packs...</State>}
            {plans.isError && <State>{errorMessage(plans.error)}</State>}
            {plans.data?.length === 0 && <State>No active credit packs are available.</State>}

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {plans.data?.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <CreditCard className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Not ready to buy?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Start with 20 free credits. Try a training session, review your feedback, and buy more credits when you are ready.
            </p>
            <Link to="/register" className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl purple-gradient px-6 text-base font-semibold text-white purple-glow transition hover:opacity-95">
              Try free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const price = Number(plan.price);
  const recommended = plan.name.toLowerCase() === "pro";
  return (
    <div className={`rounded-[1.5rem] border p-6 backdrop-blur-xl ${recommended ? "border-cyan-300/45 bg-cyan-300/[0.08] shadow-[0_18px_60px_rgba(34,211,238,0.18)]" : "border-white/12 bg-white/[0.06]"}`}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{plan.name}</div>
        {recommended && <span className="rounded-full bg-cyan-300/15 px-2.5 py-1 text-xs font-semibold text-cyan-200">Popular</span>}
      </div>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-semibold">${Number.isFinite(price) ? price.toFixed(2) : plan.price}</span>
        <span className="pb-1 text-sm text-white/50">one time</span>
      </div>
      <div className="mt-3 text-sm text-white/60">{plan.creditAmount ?? plan.chatLimit} credits</div>
      <ul className="mt-6 space-y-3 text-sm">
        {(plan.features?.length ? plan.features : [`${plan.creditAmount ?? plan.chatLimit} credits`]).map((feature) => (
          <Feature key={feature}>{feature}</Feature>
        ))}
        <Feature>Works with F1 and B1/B2 chat practice</Feature>
        <Feature>Saved history and evaluations</Feature>
      </ul>
      {plan.stripeConfigured === false && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/55">
          Checkout will be available after a payment provider is configured.
        </div>
      )}
      <Link to="/register" className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${recommended ? "bg-white text-slate-950 hover:bg-white/90" : "border border-white/14 bg-white/[0.06] text-white hover:bg-white/[0.1]"}`}>
        Choose {plan.name} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-white/72">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
      <span>{children}</span>
    </li>
  );
}

function State({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white/62">
      {children}
    </div>
  );
}
