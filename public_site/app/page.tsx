import Image from "next/image";
import Link from "next/link";
import type { HTMLAttributes } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  FileText,
  GraduationCap,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import {
  AnimatedCounter,
  AnimatedMarquee,
  CursorSpotlight,
  FadeUp,
  ImageReveal,
  MagneticButton,
  ParallaxElement,
  SplitTextReveal,
  StackedCardsSection,
  StaggerGroup,
  TiltCard,
} from "@/components/animations";
import {
  creditUses,
  faqItems,
  getStartedSteps,
  images,
  navItems,
  overviewItems,
  pricingPlans,
  testimonials,
} from "@/lib/content";

const iconMap = {
  message: MessageSquare,
  brain: BrainCircuit,
  file: FileText,
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#191814]">
      <HeroSection />
      <AnimatedMarquee
        items={["20 free credits", "Chat Training", "Real Visa Simulation", "F1 practice", "B1/B2 practice", "Saved evaluations"]}
      />
      <WhatOfficerCharlesDoes />
      <ComparisonSection />
      <PracticeRoutineSection />
      <StackedCardsSection />
      <FaqSection />
      <PricingSection />
      <LetsPracticeSection />
      <GetStartedSection />
      <TestimonialsSection />
      <FooterSection />
    </main>
  );
}

function Header() {
  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-lg border border-[#dfd7c8] bg-white/86 px-3 py-2 shadow-[0_16px_48px_rgba(43,36,26,0.12)] backdrop-blur-xl">
        <Link href="/" className="flex items-center" aria-label="Officer Charles home">
          <Image src="/new-logo.png" alt="" width={104} height={72} className="h-[72px] w-auto rounded-lg object-contain" />
        </Link>
        <div className="hidden items-center gap-1 text-sm font-medium text-[#6d665c] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg px-3 py-2 transition hover:bg-[#f2efe6] hover:text-[#191814]"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#6d665c] transition hover:bg-[#f2efe6] hover:text-[#191814] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center rounded-lg bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#115e59]"
          >
            Try free
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <CursorSpotlight className="group">
    <section id="home" data-page-bg="#f8f5ed" className="relative min-h-[92vh] overflow-hidden bg-[#f8f5ed]">
      <Header />
      <ParallaxElement className="absolute inset-0" y={-90}>
        <Image
          src={images.dashboard}
          alt="Officer Charles dashboard preview"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-28"
        />
      </ParallaxElement>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,250,247,0.98),rgba(251,250,247,0.88)_48%,rgba(251,250,247,0.56))]" />
      <ParallaxElement className="pointer-events-none absolute right-10 top-36 hidden h-24 w-24 rounded-lg border border-[#0f766e]/18 bg-[#0f766e]/8 blur-sm lg:block" y={92} rotate={32} />
      <ParallaxElement className="pointer-events-none absolute bottom-20 right-[22%] hidden h-14 w-14 rounded-lg border border-[#d1951c]/20 bg-[#d1951c]/12 lg:block" y={-76} rotate={-28} />
      <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl items-center px-4 pb-14 pt-28 sm:px-6 lg:px-8">
        <StaggerGroup className="max-w-4xl" stagger={0.1}>
          <span data-stagger-item className="inline-flex items-center gap-2 rounded-lg border border-[#d8d0bf] bg-white/80 px-4 py-2 text-xs font-semibold uppercase text-[#0f766e]">
            <Sparkles className="h-4 w-4" aria-hidden />
            AI visa officer
          </span>
          <SplitTextReveal
            as="h1"
            mode="char"
            text="Officer Charles"
            className="mt-6 text-5xl font-semibold leading-[1.02] tracking-normal text-[#191814] sm:text-6xl lg:text-7xl"
          />
          <SplitTextReveal
            as="p"
            mode="word"
            text="practice for your US visa interview"
            className="mt-3 text-4xl font-semibold leading-tight text-[#0f766e] sm:text-5xl lg:text-6xl"
          />
          <p data-stagger-item className="mt-6 max-w-2xl text-lg leading-8 text-[#5f584d] sm:text-xl">
            Train for F1 and B1/B2 interviews with realistic questions,
            per-answer coaching, final evaluations, and 20 free credits when
            you sign up.
          </p>
          <div data-stagger-item className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MagneticButton
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-6 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(15,118,110,0.24)] transition hover:bg-[#115e59]"
            >
              Try free
              <ArrowRight size={18} aria-hidden />
            </MagneticButton>
            <MagneticButton
              href="#comparison"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[#cfc6b5] bg-white/82 px-6 text-sm font-semibold text-[#191814] transition hover:border-[#0f766e]"
            >
              See difference
            </MagneticButton>
            <MagneticButton
              href="#pricing"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[#cfc6b5] bg-white/82 px-6 text-sm font-semibold text-[#191814] transition hover:border-[#0f766e]"
            >
              View pricing
            </MagneticButton>
          </div>
          <div data-stagger-item className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#ded7ca] bg-white/82 p-4">
              <p className="text-2xl font-semibold text-[#0f766e]"><AnimatedCounter value={20} /></p>
              <p className="mt-1 text-xs text-[#6d665c]">free credits</p>
            </div>
            <div className="rounded-lg border border-[#ded7ca] bg-white/82 p-4">
              <p className="text-2xl font-semibold text-[#0f766e]"><AnimatedCounter value={2} /></p>
              <p className="mt-1 text-xs text-[#6d665c]">visa paths</p>
            </div>
            <div className="rounded-lg border border-[#ded7ca] bg-white/82 p-4">
              <p className="text-2xl font-semibold text-[#0f766e]"><AnimatedCounter value={24} suffix="/7" /></p>
              <p className="mt-1 text-xs text-[#6d665c]">self-paced</p>
            </div>
          </div>
        </StaggerGroup>
      </div>
    </section>
    </CursorSpotlight>
  );
}

function WhatOfficerCharlesDoes() {
  return (
    <section data-page-bg="#ffffff" className="bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <SectionIntro
            eyebrow="What Officer Charles does"
            title="Realistic prompts, intelligent scoring, and progress that stays organized."
            text="The same demo-style capability section, now focused on visa practice: realistic prompts, intelligent scoring, and a dashboard that keeps your progress organized."
          />
        </FadeUp>
        <StaggerGroup className="mt-10 grid gap-5 md:grid-cols-3">
          {overviewItems.map(({ icon, title, text, metric, metricLabel }) => {
            const Icon = iconMap[icon as keyof typeof iconMap];
            return (
              <TiltCard data-stagger-item key={title} className="rounded-lg border border-[#ded7ca] bg-[#fffdf8] p-6">
                <div className="flex items-center gap-3 text-[#0f766e]">
                  <span className="text-3xl font-semibold">{metric}</span>
                  <span className="text-xs font-semibold uppercase text-[#7a7164]">
                    {metricLabel}
                  </span>
                </div>
                <Icon className="mt-5 h-6 w-6 text-[#d1951c]" aria-hidden />
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d665c]">{text}</p>
              </TiltCard>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section id="comparison" data-page-bg="#ffffff" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <SectionIntro
            eyebrow="How Officer Charles is different"
            title="Generic prep gives you lists. Officer Charles gives you a coaching loop."
            text="A traditional prep flow gives you generic questions. Officer Charles keeps context, evaluates your answer, and guides the next step."
          />
        </FadeUp>
        <StaggerGroup className="mt-10 grid gap-5 lg:grid-cols-2">
          <TiltCard data-stagger-item className="rounded-lg border border-[#ded7ca] bg-[#fffdf8] p-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-[#8f8170]" aria-hidden />
              <div>
                <h3 className="text-xl font-semibold">Generic prep</h3>
                <p className="text-sm text-[#6d665c]">Rigid lists, memorized scripts, no real coaching loop.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <FlowItem speaker="Applicant" text="Why did I choose this university?" align="right" />
              <FlowItem speaker="Prep sheet" text="Read a sample answer and memorize it." muted />
              <div className="rounded-lg border border-[#ded7ca] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[#8f8170]">Decision gate</p>
                <p className="mt-2 text-sm text-[#5f584d]">
                  Memorize or restart, but the flow still cannot judge whether
                  the answer sounds credible.
                </p>
              </div>
              <FlowItem speaker="Applicant" text="What if my answer is too short?" align="right" />
              <FlowItem speaker="Prep sheet" text="No score, no retry logic, no saved evaluation." muted />
            </div>
          </TiltCard>

          <TiltCard data-stagger-item className="rounded-lg border border-[#b6d7d2] bg-[#effaf6] p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#0f766e]" aria-hidden />
              <div>
                <h3 className="text-xl font-semibold">Officer Charles</h3>
                <p className="text-sm text-[#49746e]">Contextual, score-driven, and tied to your visa goal.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <FlowItem speaker="Applicant" text="I chose this university for its CS research and career fit." align="right" smart />
              <FlowItem speaker="Officer Charles" text="Good. Now connect that program to your return plan after graduation." smart />
              <div className="rounded-lg border border-[#c7b16a] bg-[#fff7cf] p-4">
                <p className="text-xs font-semibold uppercase text-[#7a5a09]">Answer accepted</p>
                <p className="mt-1 font-semibold">Score and feedback saved</p>
              </div>
              <FlowItem speaker="Officer Charles" text="Who will sponsor your studies?" smart />
              <div className="rounded-lg border border-[#b6d7d2] bg-white p-4">
                <p className="font-semibold">Choose what to review next:</p>
                <p className="mt-2 text-[#49746e]">Strengths, weak points, and next question.</p>
              </div>
            </div>
          </TiltCard>
        </StaggerGroup>
      </div>
    </section>
  );
}

function PracticeRoutineSection() {
  return (
    <section id="custom-agent" data-page-bg="#f8f5ed" className="bg-[#f8f5ed] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <FadeUp>
          <SectionIntro
            eyebrow="Build your visa interview routine"
            title="Use free credits first, then build a repeatable prep plan."
            text="Use free credits first, then build a repeatable prep plan with training sessions, real simulations, saved reports, and focused improvement."
          />
          <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["20 free credits", "Start without payment"],
              ["5-credit training", "Practice with coaching"],
              ["10-credit simulation", "Review after completion"],
            ].map(([label, detail]) => (
              <div data-stagger-item key={label} className="rounded-lg border border-[#ded7ca] bg-white p-4">
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm text-[#6d665c]">{detail}</p>
              </div>
            ))}
          </StaggerGroup>
          <div className="mt-5 rounded-lg border border-[#ded7ca] bg-white p-6" data-stagger-item>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#6d665c]">Practice plan</p>
                <h3 className="text-lg font-semibold">What you can set up</h3>
              </div>
              <span className="rounded-lg bg-[#191814] px-3 py-1 text-xs font-semibold text-white">Dashboard ready</span>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[#403a31]">
              <CheckLine text="Start with free credits and pick your visa category" />
              <CheckLine text="Use Training mode until your answer structure improves" />
              <CheckLine text="Move into Real Simulation for stricter final evaluation" />
              <CheckLine text="Review saved transcripts, scores, strengths, and weak points" />
            </ul>
          </div>
        </FadeUp>
        <TiltCard className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-[#ded7ca] bg-white p-5 shadow-[0_24px_70px_rgba(43,36,26,0.12)]">
          <ImageReveal className="relative aspect-[3/3.6] rounded-lg bg-[#ede7d8]" direction="center">
            <Image src={images.avatar} alt="Officer Charles AI visa officer avatar" fill sizes="384px" className="object-cover" />
          </ImageReveal>
          <p className="mt-5 text-xs font-semibold uppercase text-[#6d665c]">Officer Charles</p>
          <h3 className="mt-1 text-xl font-semibold">Your AI visa officer</h3>
          <p className="mt-2 text-sm leading-6 text-[#6d665c]">
            Focused on visa interview behavior, not generic chatbot answers.
          </p>
          <MagneticButton href="/register" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#115e59]">
            Try free
            <ArrowRight size={17} aria-hidden />
          </MagneticButton>
        </TiltCard>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faqs" data-page-bg="#f0eee6" className="scroll-mt-24 bg-[#f0eee6] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <SectionIntro
            eyebrow="FAQs"
            title="Answers before you start practicing."
            text="Free credits, supported visa categories, active modes, and what the tool can and cannot promise."
          />
        </FadeUp>
        <StaggerGroup className="mt-10 grid gap-4 md:grid-cols-2">
          {faqItems.map((faq, index) => (
            <TiltCard data-stagger-item key={faq.question} className="rounded-lg border border-[#ded7ca] bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7f4ef] text-sm font-semibold text-[#0f766e]">
                  {index + 1}
                </span>
                <h3 className="font-semibold">{faq.question}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#6d665c]">{faq.answer}</p>
            </TiltCard>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" data-page-bg="#ffffff" className="scroll-mt-24 bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <SectionIntro
            eyebrow="Credits & Pricing"
            title="Start with 20 free credits. Buy more one-time credits when you need deeper practice."
            text="No subscription wording, no confusing limits. Use credits for Officer Charles chat training and real visa interview simulations."
          />
        </FadeUp>
        <StaggerGroup className="mt-8 grid gap-4 md:grid-cols-3">
          {creditUses.map((item, index) => {
            const Icon = [GraduationCap, ShieldCheck, Video][index];
            return (
              <TiltCard data-stagger-item key={item.title} className="rounded-lg border border-[#ded7ca] bg-[#fffdf8] p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#e7f4ef] text-[#0f766e]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="rounded-lg bg-[#fff7cf] px-3 py-1 text-xs font-semibold text-[#7a5a09]">
                    {item.credits}
                  </span>
                </div>
                <h3 className="mt-5 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d665c]">{item.text}</p>
              </TiltCard>
            );
          })}
        </StaggerGroup>
        <StaggerGroup className="mt-10 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PlanCard data-stagger-item key={plan.id} plan={plan} />
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

function LetsPracticeSection() {
  return (
    <section id="contact" data-page-bg="#f8f5ed" className="bg-[#f8f5ed] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
        <FadeUp>
          <SectionIntro
            eyebrow="Let's practice"
            title="Tell Officer Charles what you want to prepare for."
            text="This mirrors the demo contact section, but the action is simple: create an account and start your first practice session with free credits."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <LightInfo title="Free start" detail="20 credits included" />
            <LightInfo title="Supported visas" detail="F1 and B1/B2" />
          </div>
        </FadeUp>
        <TiltCard className="rounded-lg border border-[#ded7ca] bg-white p-6 shadow-[0_20px_60px_rgba(43,36,26,0.1)]">
          <ThemeInput label="Name" value="Your full name" />
          <ThemeInput label="Visa type" value="F1 or B1/B2" />
          <ThemeInput label="Goal" value="Practice, simulation, or both" />
          <MagneticButton href="/register" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#191814] px-5 text-sm font-semibold text-white transition hover:bg-[#2b261f]">
            Create account and try free
            <Send className="h-4 w-4" aria-hidden />
          </MagneticButton>
        </TiltCard>
      </div>
    </section>
  );
}

function GetStartedSection() {
  return (
    <section id="get-started" data-page-bg="#ffffff" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <SectionIntro
            eyebrow="Get started"
            title="Get started in 4 simple steps."
            text="From signup to first evaluation, the flow is made for fast practice and clear improvement."
          />
        </FadeUp>
        <StaggerGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {getStartedSteps.map(([title, description], index) => (
            <TiltCard data-stagger-item key={title} className="rounded-lg border border-[#ded7ca] bg-[#fffdf8] p-5">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#0f766e] text-lg font-semibold text-white">
                {index + 1}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6d665c]">{description}</p>
            </TiltCard>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" data-page-bg="#f0eee6" className="bg-[#f0eee6] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <SectionIntro
            eyebrow="Testimonials"
            title="What practice users say."
            text="Realistic prep, clearer answers, and reports applicants can return to before interview day."
          />
        </FadeUp>
        <StaggerGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <TiltCard data-stagger-item key={item.name} className="rounded-lg border border-[#ded7ca] bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#191814] text-base font-semibold text-white">
                  {item.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-[#6d665c]">{item.title}</p>
                  <div className="mt-1 flex items-center gap-1 text-[#d1951c]" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" aria-hidden />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#403a31]">{item.quote}</p>
            </TiltCard>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 border-t border-[#ded7ca] pt-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <Image src="/new-logo.png" alt="" width={64} height={44} className="h-11 w-auto rounded-lg object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase text-[#6d665c]">Officer Charles</p>
              <p className="text-lg font-semibold">Practice US visa interviews</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#6d665c]">
            AI interview preparation for F1 and B1/B2 applicants. Not affiliated
            with any government agency.
          </p>
          <MagneticButton href="/register" className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#115e59]">
            Try free
            <ArrowRight className="h-4 w-4" aria-hidden />
          </MagneticButton>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          <FooterLinks title="Product" links={["Training", "Simulation", "History", "Credits"]} />
          <FooterLinks title="Practice" links={["F1 visa", "B1/B2 visa", "Feedback", "Reports"]} />
          <FooterLinks title="Account" links={["Sign up", "Login", "Pricing", "Dashboard"]} />
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl text-xs text-[#8f8170]">
        Copyright {new Date().getFullYear()} Officer Charles. All rights reserved.
      </div>
    </footer>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase text-[#0f766e]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#191814] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[#6d665c]">{text}</p>
    </div>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden />
      <span>{text}</span>
    </li>
  );
}

function FlowItem({
  speaker,
  text,
  align,
  muted,
  smart,
}: {
  speaker: string;
  text: string;
  align?: "right";
  muted?: boolean;
  smart?: boolean;
}) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] rounded-lg border px-4 py-3 ${
          smart
            ? "border-[#b6d7d2] bg-white"
            : muted
              ? "border-[#ded7ca] bg-[#f3efe6]"
              : "border-[#ded7ca] bg-white"
        }`}
      >
        <p className="text-xs font-semibold uppercase text-[#8f8170]">{speaker}</p>
        <p className="mt-1 text-[#403a31]">{text}</p>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  ...props
}: { plan: (typeof pricingPlans)[number] } & HTMLAttributes<HTMLDivElement>) {
  const recommended = plan.name.toLowerCase() === "pro";
  return (
    <TiltCard
      {...props}
      className={`rounded-lg border p-6 ${
        recommended
          ? "border-[#0f766e] bg-[#effaf6] shadow-[0_20px_60px_rgba(15,118,110,0.14)]"
          : "border-[#ded7ca] bg-[#fffdf8]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        {recommended ? (
          <span className="rounded-lg bg-[#0f766e] px-3 py-1 text-xs font-semibold text-white">
            Popular
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-semibold">${plan.price}</span>
        <span className="pb-1 text-sm text-[#6d665c]">one time</span>
      </div>
      <div className="mt-3 text-sm text-[#6d665c]">{plan.creditAmount} credits</div>
      <ul className="mt-6 space-y-3 text-sm text-[#403a31]">
        {plan.features.map((feature) => (
          <CheckLine key={feature} text={feature} />
        ))}
      </ul>
      <MagneticButton
        href="/register"
        className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
          recommended
            ? "bg-[#0f766e] text-white hover:bg-[#115e59]"
            : "border border-[#cbc4b4] bg-white text-[#191814] hover:border-[#0f766e]"
        }`}
      >
        Choose {plan.name}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </MagneticButton>
    </TiltCard>
  );
}

function LightInfo({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-[#ded7ca] bg-white p-5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[#6d665c]">{detail}</p>
    </div>
  );
}

function ThemeInput({ label, value }: { label: string; value: string }) {
  return (
    <label className="mb-4 block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        type="text"
        readOnly
        value={value}
        className="mt-2 h-12 w-full rounded-lg border border-[#d8d0bf] bg-[#fffdf8] px-3 text-sm text-[#6d665c] outline-none"
      />
    </label>
  );
}

function FooterLinks({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="font-semibold text-[#191814]">{title}</h3>
      <ul className="mt-3 space-y-2 text-[#6d665c]">
        {links.map((link) => (
          <li key={link}>{link}</li>
        ))}
      </ul>
    </div>
  );
}
