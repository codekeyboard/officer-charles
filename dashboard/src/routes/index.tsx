import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";
import "swiper/css/pagination";
import {
  ArrowRight,
  BadgeCheck,
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
import { Logo } from "@/components/common/Logo";
import { billingService } from "@/services/billing.service";
import { errorMessage } from "@/services/api";
import type { Plan } from "@/services/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Officer Charles — AI Visa Interview Coach" },
      {
        name: "description",
        content:
          "Try Officer Charles free with 20 signup credits. Practice F1 and B1/B2 US visa interviews with an AI officer, scoring, feedback, and history.",
      },
      { property: "og:title", content: "Officer Charles — AI Visa Interview Coach" },
      {
        property: "og:description",
        content: "Practice F1 and B1/B2 US visa interviews with an AI officer and 20 free credits.",
      },
    ],
  }),
  component: Landing,
});

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-14% 0px" },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
} as const;

const navItems = [
  { label: "Agents", target: "agents" },
  { label: "FAQs", target: "faqs" },
  { label: "Pricing", target: "pricing" },
];

const publicImages = {
  training: "/chat_teaining.png",
  simulation: "/real_visa_simulation.png",
  video: "/video_traiing.png",
  avatar: "/avtar.png",
  dashboard: "/dashboard_Card.png",
  interview: "/interview_Card.png",
  evaluation: "/ChatGPT%20Image%20Jul%2014,%202026,%2005_25_34%20AM.png",
};

const modeAgents = [
  {
    codeName: "training",
    name: "Chat Training",
    imageTone: "from-sky-300/25 via-white/10 to-amber-300/20",
    description:
      "Practice with hints, retries, coaching, and feedback after every answer. Best for improving weak responses before a serious run.",
    cost: "5 credits",
    status: "Available now",
    icon: GraduationCap,
    image: publicImages.training,
  },
  {
    codeName: "simulation",
    name: "Real Visa Simulation",
    imageTone: "from-amber-300/25 via-white/10 to-sky-300/20",
    description:
      "Run a stricter interview flow with final scoring at the end, built for F1 and B1/B2 applicants who want exam-mode practice.",
    cost: "10 credits",
    status: "Available now",
    icon: BadgeCheck,
    image: publicImages.simulation,
  },
  {
    codeName: "video",
    name: "Video Training",
    imageTone: "from-slate-200/15 via-white/10 to-sky-300/16",
    description:
      "Voice and avatar-style visa interview practice is planned for the live experience. It stays locked until the feature is ready.",
    cost: "15 credits",
    status: "Coming Soon",
    icon: Video,
    image: publicImages.video,
  },
];

const overviewItems = [
  {
    icon: MessageSquare,
    title: "Real interview flow",
    text: "Officer Charles asks one focused question at a time and keeps the conversation on your visa type.",
    metric: "F1",
    metricLabel: "B1/B2",
  },
  {
    icon: BrainCircuit,
    title: "Answer intelligence",
    text: "Every response is evaluated for relevance, clarity, intent, ties, funding, and communication.",
    metric: "6",
    metricLabel: "signals",
  },
  {
    icon: FileText,
    title: "Saved progress",
    text: "Your transcripts, scores, feedback, and recommendations remain available in history.",
    metric: "1",
    metricLabel: "dashboard",
  },
];

const faqItems = [
  {
    question: "What does Try free include?",
    answer: "New users receive 20 free credits after signup. That covers 4 chat training sessions or 2 real visa simulations.",
  },
  {
    question: "Which interview types work today?",
    answer: "Chat Training and Chat Real Visa Simulation are available now. Video and live interview flows are marked Coming Soon.",
  },
  {
    question: "Which visas are supported?",
    answer: "Officer Charles currently supports F1 student visa practice and B1/B2 visitor visa practice.",
  },
  {
    question: "Does this guarantee visa approval?",
    answer: "No. Officer Charles is a preparation tool and is not affiliated with any government agency.",
  },
];

const testimonials = [
  {
    name: "Muhammad A.",
    title: "F1 applicant",
    quote: "Training mode helped me fix short answers before I moved into the stricter simulation.",
  },
  {
    name: "Sara K.",
    title: "B1/B2 applicant",
    quote: "I finally understood which answers sounded weak and how to explain my travel purpose clearly.",
  },
  {
    name: "Hamza R.",
    title: "Student visa prep",
    quote: "The final report made my preparation feel organized instead of random.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <HeroSection />
      <WhatOfficerCharlesDoes />
      <AvailableAgentsSection />
      <ComparisonSection />
      <CustomAgentSection />
      <DesignedForEverything />
      <FaqSection />
      <PricingSection />
      <LetsTalkSection />
      <GetStartedSection />
      <TestimonialsSection />
      <FooterSection />
    </main>
  );
}

function HeroSection() {
  const scrollToTarget = (target: string) => {
    const el = document.getElementById(target);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.24),transparent_36%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.16),transparent_34%),linear-gradient(135deg,#020617,#06161f_48%,#020617)]" />
        <div
          className="absolute left-1/2 top-24 grid h-[38rem] w-[38rem] -translate-x-1/2 place-items-center rounded-full border border-sky-300/15"
        >
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="h-72 w-72 rounded-full object-cover object-center opacity-10 blur-[0.5px] saturate-150 sm:h-96 sm:w-96"
          />
        </div>
        <div className="absolute left-1/2 top-44 h-72 w-72 -translate-x-1/2 rounded-full border border-sky-300/10 bg-sky-300/5 blur-2xl sm:h-96 sm:w-96" />
        <motion.div
          className="absolute bottom-[-8rem] right-[-6rem] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl"
          animate={{ y: [0, -24, 0], x: [0, 18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header className="fixed left-0 right-0 top-4 z-50 flex justify-center px-4 py-3">
        <div className="flex w-full max-w-6xl items-center justify-between rounded-full border border-white/15 bg-black/35 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur-2xl md:justify-center">
          <Link to="/" className="md:absolute md:left-3">
            <Logo variant="light" />
          </Link>
          <nav className="hidden items-center gap-2 text-sm font-medium text-white/70 md:flex">
            {navItems.map((item) => (
              <button
                key={item.target}
                type="button"
                onClick={() => scrollToTarget(item.target)}
                className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </button>
            ))}
            <Link to="/blog" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-2 md:absolute md:right-3">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
              Try free
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-28 pt-36 text-center">
        <motion.div {...reveal} className="mx-auto max-w-4xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.42em] text-sky-100">
            <Sparkles className="h-3.5 w-3.5 text-sky-200" />
            AI visa officer
          </span>
          <h1 className="text-5xl font-light tracking-tight sm:text-6xl lg:text-7xl">
            <b className="font-semibold">Officer</b> Charles - practice for your
            <span className="block text-sky-100">US visa interview</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
            Train for F1 and B1/B2 interviews with realistic questions, per-answer coaching,
            final evaluations, and 20 free credits when you sign up.
          </p>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center px-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-900 shadow-xl shadow-white/20 transition hover:scale-105">
            Try free <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => scrollToTarget("agents")}
            className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:scale-105 hover:bg-white/15"
          >
            Explore modes
          </button>
          <button
            type="button"
            onClick={() => scrollToTarget("pricing")}
            className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:scale-105 hover:bg-white/15"
          >
            View pricing
          </button>
        </div>
      </div>
    </section>
  );
}

function WhatOfficerCharlesDoes() {
  return (
    <section className="space-y-12 bg-slate-950 px-4 py-16 sm:px-6 sm:py-24">
      <motion.header {...reveal} className="mx-auto max-w-6xl space-y-4 text-center lg:text-left">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          What Officer Charles does
        </h2>
        <p className="mx-auto max-w-3xl text-base text-slate-400 lg:mx-0">
          The same demo-style capability section, now focused on visa practice: realistic prompts,
          intelligent scoring, and a dashboard that keeps your progress organized.
        </p>
      </motion.header>
      <ul className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {overviewItems.map(({ icon: Icon, title, text, metric, metricLabel }) => (
          <li
            key={title}
            className="group relative flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-sky-500/5 transition hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-sky-500/20 motion-safe:[transform:perspective(1000px)] motion-safe:hover:[transform:perspective(1000px)_rotateY(3deg)_rotateX(-2deg)]"
          >
            <div className="flex items-center gap-3 text-sky-300">
              <span className="text-3xl font-semibold">{metric}</span>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{metricLabel}</span>
            </div>
            <Icon className="h-6 w-6 text-amber-300" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="text-sm leading-6 text-slate-400">{text}</p>
            </div>
            <span className="pointer-events-none absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-950/60 text-slate-400 transition group-hover:border-sky-400 group-hover:text-sky-300">
              ↑
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AvailableAgentsSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const currentCodeRef = useRef(modeAgents[0].codeName);
  const isProgrammaticScroll = useRef(false);
  const [currentCode, setCurrentCode] = useState(modeAgents[0].codeName);
  const [tiltTarget, setTiltTarget] = useState({ x: 0, y: 0 });
  const current = useMemo(
    () => modeAgents.find((agent) => agent.codeName === currentCode) ?? modeAgents[0],
    [currentCode],
  );

  const changeAgent = (codeName: string) => {
    const next = modeAgents.find((agent) => agent.codeName === codeName);
    if (!next || next.codeName === currentCodeRef.current) return;

    setCurrentCode(next.codeName);
    currentCodeRef.current = next.codeName;

    if (!isProgrammaticScroll.current && scrollTriggerRef.current) {
      const idx = modeAgents.findIndex((agent) => agent.codeName === codeName);
      const trigger = scrollTriggerRef.current;
      const totalScroll = trigger.end - trigger.start;
      const targetScroll = trigger.start + (idx / (modeAgents.length - 1)) * totalScroll;
      const scrollY = Math.min(Math.max(targetScroll, trigger.start + 1), trigger.end - 1);

      isProgrammaticScroll.current = true;
      gsap.to(window, {
        scrollTo: scrollY,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          isProgrammaticScroll.current = false;
        },
      });
    }
  };

  useEffect(() => {
    currentCodeRef.current = currentCode;
  }, [currentCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    const updateHeight = () => {
      const isMobile = window.innerWidth < 768;
      section.style.height = isMobile ? "auto" : `${(modeAgents.length + 1) * window.innerHeight}px`;
    };
    updateHeight();

    let trigger: ScrollTrigger | null = null;
    const createTrigger = () => {
      trigger?.kill();
      if (window.innerWidth < 768) {
        scrollTriggerRef.current = null;
        return;
      }
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${window.innerHeight * (modeAgents.length + 0.5)}`,
        pin: sticky,
        pinSpacing: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (isProgrammaticScroll.current) return;
          const index = Math.round(self.progress * (modeAgents.length - 1));
          const next = modeAgents[index];
          if (next && next.codeName !== currentCodeRef.current) {
            isProgrammaticScroll.current = true;
            setCurrentCode(next.codeName);
            currentCodeRef.current = next.codeName;
            window.setTimeout(() => {
              isProgrammaticScroll.current = false;
            }, 160);
          }
        },
      });
      scrollTriggerRef.current = trigger;
    };

    createTrigger();

    const handleResize = () => {
      updateHeight();
      createTrigger();
      ScrollTrigger.refresh();
    };
    const handlePointer = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 14;
      const y = (0.5 - e.clientY / window.innerHeight) * 14;
      setTiltTarget({ x, y });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointer);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointer);
      trigger?.kill();
      scrollTriggerRef.current = null;
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="agents"
      className="relative w-full overflow-visible scroll-mt-28 bg-[linear-gradient(-10deg,#000_0%,#000_33%,#111_33%,#111_66%,#06110f_66%,#06110f_100%)] text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.12),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.1),transparent_60%)]" />
      <div ref={stickyRef} className="sticky top-0 flex min-h-screen items-center justify-center px-3 py-8 sm:px-6">
        <div className="relative w-full max-w-6xl rounded-3xl border border-white/15 bg-white/15 px-4 py-6 shadow-2xl backdrop-blur-xl sm:px-8 lg:px-24">
          <ModeTabs agents={modeAgents} currentAgent={current} changeAgent={changeAgent} />

          <div className="mt-10 flex flex-col-reverse items-center justify-between gap-10 lg:flex-row lg:items-start">
            <ModeImageCarousel
              agents={modeAgents}
              currentAgent={current}
              changeAgent={changeAgent}
              tiltTarget={tiltTarget}
            />

            <motion.div
              key={`${current.codeName}-copy`}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-lg text-center lg:text-left"
            >
              <div className="inline-flex items-center rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
                {current.status}
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{current.name}</h2>
              <p className="mt-5 text-base leading-8 text-slate-200">{current.description}</p>
              <div className="mt-8 grid gap-3 text-sm">
                <AgentPoint text="Connected to your dashboard history" />
                <AgentPoint text="Built around F1 and B1/B2 interview readiness" />
                <AgentPoint text="Uses credits instead of confusing subscriptions" />
              </div>
              <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
                Try free <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const [genericChoice, setGenericChoice] = useState("");
  const [officerChoice, setOfficerChoice] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const scopedSelector = gsap.utils.selector(section);
      const cards = scopedSelector("[data-card]");
      const items = scopedSelector("[data-stack-item]");
      const cleanupFns: Array<() => void> = [];
      let stackBaseOffset = -800;

      const initItems = () => {
        stackBaseOffset = window.innerWidth < 768 ? -160 : -800;
        items.forEach((item, index) => {
          (item as HTMLElement).dataset.stackIndex = String(index);
          gsap.set(item, {
            y: stackBaseOffset + index * 14,
            autoAlpha: 0,
          });
        });
      };

      initItems();
      gsap.set(cards, { autoAlpha: 0, yPercent: 42 });

      if (window.innerWidth >= 768) {
        const entranceTimeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: section,
            start: "top 50%",
            end: () => "+=80",
            scrub: true,
            pin: sticky,
            pinSpacing: true,
            anticipatePin: 0.2,
          },
        });

        entranceTimeline.to(cards, { autoAlpha: 1, yPercent: 0, duration: 2.4, stagger: 0.25 }, 0);
        cleanupFns.push(() => {
          entranceTimeline.scrollTrigger?.kill();
          entranceTimeline.kill();
        });
      } else {
        gsap.set(cards, { autoAlpha: 1, yPercent: 0 });
      }

      const animateStackItems = (targets: Element[]) => {
        gsap.to(targets, {
          y: 0,
          autoAlpha: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.08,
        });
      };
      const resetStackItems = (targets: Element[]) => {
        targets.forEach((item) => {
          const index = Number((item as HTMLElement).dataset.stackIndex) || 0;
          gsap.set(item, {
            y: stackBaseOffset + index * 14,
            autoAlpha: 0,
          });
        });
      };
      const stackTriggers: any = ScrollTrigger.batch(items, {
        start: "top 90%",
        end: "bottom 70%",
        once: false,
        onEnter: animateStackItems,
        onEnterBack: animateStackItems,
        onLeaveBack: resetStackItems,
      });

      cleanupFns.push(() => {
        if (Array.isArray(stackTriggers)) stackTriggers.forEach((trigger) => trigger.kill());
        else stackTriggers?.kill?.();
      });

      const refreshInit = () => initItems();
      ScrollTrigger.addEventListener("refreshInit", refreshInit);
      cleanupFns.push(() => ScrollTrigger.removeEventListener("refreshInit", refreshInit));
      ScrollTrigger.refresh();

      return () => cleanupFns.forEach((fn) => fn());
    }, section);

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} id="comparison" className="relative w-full overflow-visible bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.14),transparent_55%)]" />
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="mx-auto w-[86%] max-w-4xl space-y-6 text-left">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[36px]">
            <span className="block">How</span>
            <span className="block text-sky-200">Officer Charles</span>
            <span className="block">is different</span>
          </h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            A traditional prep flow gives you generic questions. Officer Charles keeps context,
            evaluates your answer, and guides the next step.
          </p>
        </motion.div>

        <div ref={stickyRef} className="sticky top-0 flex min-h-screen flex-col justify-start pt-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:gap-6">
            <AnimatedComparisonCard
              tone="plain"
              title="Generic prep"
              subtitle="Rigid lists, memorized scripts, no real coaching loop."
              icon={<MessageSquare className="h-5 w-5" />}
            >
              <div className="mt-6 space-y-4 text-xs sm:text-sm text-slate-200">
                <StackDivider label="Rigid answer practice" />
                <StackChatItem align="right" speaker="Applicant" text="Why did I choose this university?" />
                <Connector muted />
                <StackChatItem speaker="Prep sheet" text="Read a sample answer and memorize it." muted />
                <Connector muted />
                <div data-stack-item className="relative rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="absolute bottom-4 left-4 top-4 border-l border-dashed border-white/15" />
                  <div className="space-y-5 pl-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <span>Decision gate</span>
                        <div className="h-px flex-1 border-t border-dashed border-white/20" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Memorize", "Restart"].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setGenericChoice(option)}
                            className={`rounded-full border px-4 py-1.5 text-[11px] font-semibold transition ${
                              genericChoice === option
                                ? "border-white bg-white text-slate-900 shadow-lg shadow-white/20"
                                : "border-white/25 text-slate-200 hover:border-white/60"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 rounded-2xl border border-white/15 bg-slate-900/60 px-3 py-2 text-xs text-slate-100">
                        {genericChoice
                          ? `${genericChoice}: the flow still cannot judge whether the answer sounds credible.`
                          : "Tap an option to see the limitation."}
                      </div>
                    </div>
                  </div>
                </div>
                <Connector muted />
                <StackChatItem align="right" speaker="Applicant" text="What if my answer is too short?" />
                <Connector muted />
                <StackChatItem speaker="Prep sheet" text="No score, no retry logic, no saved evaluation." muted />
              </div>
            </AnimatedComparisonCard>

            <AnimatedComparisonCard
              tone="smart"
              title="Officer Charles"
              subtitle="Contextual, score-driven, and tied to your visa goal."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <div className="mt-8 space-y-5 text-xs sm:text-sm text-slate-100">
                <StackDivider label="Assistive interview" smart />
                <StackChatItem align="right" speaker="Applicant" text="I chose this university for its CS research and career fit." smart />
                <Connector smart />
                <StackChatItem speaker="Officer Charles" text="Good. Now connect that program to your return plan after graduation." smart />
                <Connector smart />
                <div data-stack-item className="mx-auto flex w-full max-w-sm items-center gap-3 rounded-3xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  <BadgeCheck className="h-8 w-8 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-amber-200/80">Answer accepted</p>
                    <p className="text-base font-semibold text-white">Score and feedback saved</p>
                  </div>
                </div>
                <Connector smart />
                <StackChatItem speaker="Officer Charles" text="Who will sponsor your studies?" smart />
                <Connector smart />
                <div data-stack-item className="rounded-3xl border border-sky-400/30 bg-sky-500/15 px-4 py-3 text-sky-50">
                  Choose what to review next:
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Strengths", "Weak points", "Next question"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setOfficerChoice(option)}
                        className={`rounded-full border px-4 py-1.5 text-[11px] font-semibold transition ${
                          officerChoice === option
                            ? "border-sky-100 bg-sky-300/25 text-white shadow-lg shadow-sky-900/40"
                            : "border-sky-300/40 text-sky-100 hover:border-sky-100"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-sky-100/80">
                    {officerChoice || "Select a review action to keep improving inside the dashboard."}
                  </div>
                </div>
              </div>
            </AnimatedComparisonCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomAgentSection() {
  return (
    <section id="custom-agent" className="relative w-full overflow-hidden bg-gradient-to-b from-sky-50 via-white to-amber-50 py-20 text-slate-900">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.18),transparent_40%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.14),transparent_42%),radial-gradient(circle_at_50%_82%,rgba(56,189,248,0.1),transparent_46%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-sky-50" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="mx-auto w-[82%] max-w-4xl space-y-6 text-left">
          <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[36px]">
            <span>Build </span>
            <span className="text-sky-500">your</span>
            <span className="block">visa interview routine</span>
          </h2>
          <p className="text-center text-sm leading-7 text-slate-600 sm:text-base">
            Use free credits first, then build a repeatable prep plan with training sessions,
            real simulations, saved reports, and focused improvement.
          </p>
        </motion.div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_44px_rgba(59,130,246,0.14)] backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["20 free credits", "Start without payment"],
                  ["5-credit training", "Practice with coaching"],
                  ["10-credit simulation", "Review after completion"],
                ].map(([label, detail]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <p className="mt-1 text-xs text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.1)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Practice plan</p>
                  <h3 className="text-lg font-semibold text-slate-900">What you can set up</h3>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Dashboard ready</span>
              </div>
              <ul className="mt-4 space-y-3">
                {[
                  "Start with free credits and pick your visa category",
                  "Use Training mode until your answer structure improves",
                  "Move into Real Simulation for stricter final evaluation",
                  "Review saved transcripts, scores, strengths, and weak points",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 text-sky-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-6">
            <div className="absolute inset-6 -z-10 rounded-[26px] bg-gradient-to-br from-sky-200/50 via-white to-amber-100/50 blur-2xl" />
            <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
              <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-sky-950 to-amber-950">
                <img
                  src={publicImages.avatar}
                  alt="Officer Charles AI visa officer avatar"
                  className="aspect-[3/3.6] h-full w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Officer Charles</p>
                <h3 className="mt-1 text-xl font-semibold">Your AI visa officer</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Focused on visa interview behavior, not generic chatbot answers.
                </p>
              </div>
            </div>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]">
              Try free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesignedForEverything() {
  return (
    <section className="relative w-full bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_50%)]" />
      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="mx-auto w-[90%] max-w-5xl space-y-6 text-left">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[36px]">
            <span className="block">Designed</span>
            <span className="block text-sky-200">for</span>
            <span className="block">every prep stage</span>
          </h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Start on desktop, continue on laptop, and return to your saved evaluations whenever you need.
            The dashboard keeps your interview history, feedback, credits, and reports together.
          </p>
          <p className="text-sm leading-7 text-slate-200 italic sm:text-base">
            Live video practice is marked Coming Soon, while chat training and real simulation stay available now.
          </p>
        </motion.div>
        <div className="mt-10 flex justify-center">
          <div className="w-[90%] max-w-5xl">
            <div className="aspect-[4/2.5] w-full overflow-hidden rounded-3xl bg-[#0a0a0a] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="grid h-full grid-cols-3 gap-4 p-5">
                {[
                  {
                    title: "Dashboard",
                    image: publicImages.dashboard,
                    text: "Credits, usage, recent sessions, and progress in one place.",
                  },
                  {
                    title: "Interview",
                    image: publicImages.interview,
                    text: "Focused chat practice with realistic Officer Charles prompts.",
                  },
                  {
                    title: "Evaluation",
                    image: publicImages.evaluation,
                    text: "Final score, strengths, weaknesses, and next-step advice.",
                  },
                ].map((item) => (
                  <div key={item.title} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                    <img
                      src={item.image}
                      alt={`${item.title} preview`}
                      className="h-[68%] w-full object-cover object-center transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="p-4">
                      <div className="text-xl font-semibold">{item.title}</div>
                      <p className="mt-2 text-xs leading-5 text-white/62">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faqs" className="relative overflow-hidden bg-slate-950 py-20 text-white">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.18),transparent_38%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-slate-950/70 to-slate-950" />
      </div>
      <motion.div {...reveal} className="relative mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            <Sparkles className="h-4 w-4 text-sky-300" />
            FAQs
          </div>
          <h2 className="text-3xl font-semibold sm:text-4xl">Answers before you start practicing</h2>
          <p className="mx-auto max-w-3xl text-sm text-slate-200/80 sm:text-base">
            Free credits, supported visa categories, active modes, and what the tool can and cannot promise.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqItems.map((faq, index) => (
            <div key={faq.question} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-white/6" />
              <div className="relative space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sky-200">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold">{faq.question}</p>
                </div>
                <p className="text-sm leading-6 text-slate-100/75">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function PricingSection() {
  const plans = useQuery({ queryKey: ["plans"], queryFn: billingService.getPlans });
  return (
    <section id="pricing" className="relative w-full overflow-hidden bg-slate-950 py-20 text-white">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 18, ease: "linear", repeat: Infinity }}
        style={{
          backgroundImage: "linear-gradient(135deg, #020617, #0c2238, #020617)",
          backgroundSize: "200% 200%",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(245,158,11,0.12),transparent_42%)]" />
      <motion.div {...reveal} className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Credits & Pricing</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/55 md:text-base">
            Start with 20 free credits. Buy more one-time credits when you need deeper practice.
          </p>
          <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/10 p-1 text-sm">
            <span className="rounded-full bg-white px-4 py-2 font-semibold text-slate-950">Credit packs</span>
            <span className="px-4 py-2 text-white/55">No monthly plan</span>
          </div>
        </div>
        {plans.isLoading && <DarkState>Loading credit packs...</DarkState>}
        {plans.isError && <DarkState>{errorMessage(plans.error)}</DarkState>}
        {plans.data?.length === 0 && <DarkState>No active credit packs are available.</DarkState>}
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {plans.data?.map((plan, idx) => (
            <PricingCard key={plan.id} plan={plan} delay={idx * 0.06} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function LetsTalkSection() {
  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-amber-50 py-20 text-slate-900">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.14),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.12),transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-sky-50" />
      </div>
      <motion.div {...reveal} className="relative mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-sky-700">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-amber-400 shadow-[0_0_0_6px_rgba(14,165,233,0.14)]" />
            Let's practice
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">Tell Officer Charles what you want to prepare for</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              This mirrors the demo contact section, but the action is simple: create an account and start your first practice session with free credits.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LightInfo title="Free start" detail="20 credits included" />
            <LightInfo title="Supported visas" detail="F1 and B1/B2" />
          </div>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute inset-2 rounded-3xl bg-gradient-to-br from-sky-200/60 via-white to-amber-100/70 blur-3xl" />
          <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
            <div className="space-y-5 p-6 sm:p-8">
              <ThemeInput label="Name" value="Your full name" />
              <ThemeInput label="Visa type" value="F1 or B1/B2" />
              <ThemeInput label="Goal" value="Practice, simulation, or both" />
              <Link to="/register" className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(59,130,246,0.25)]">
                Create account and try free
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function GetStartedSection() {
  const steps = [
    ["Sign up", "Create your account and receive 20 free credits."],
    ["Choose visa", "Pick F1 or B1/B2 and select training or simulation."],
    ["Answer", "Respond to realistic Officer Charles questions."],
    ["Review", "Read scores, feedback, recommendations, and history."],
  ];
  return (
    <section id="get-started" className="relative overflow-hidden bg-gradient-to-br from-sky-700 via-sky-700 to-amber-700 py-20 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_88%_80%,rgba(255,255,255,0.12),transparent_38%)]" />
      <motion.div {...reveal} className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] shadow-[0_10px_30px_rgba(7,89,133,0.35)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-300 to-amber-300 shadow-[0_0_0_6px_rgba(96,165,250,0.16)]" />
            Get started
          </div>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Get started in 4 simple steps</h2>
          <p className="text-sm text-white/80 sm:text-base">
            From signup to first evaluation, the flow is made for fast practice and clear improvement.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, description], index) => (
            <div key={title} className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-5 shadow-[0_18px_50px_rgba(8,47,73,0.3)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/5 to-sky-300/10 opacity-0 transition group-hover:opacity-100" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-xl font-semibold text-white ring-1 ring-white/35 backdrop-blur-md transition group-hover:scale-105">
                  {index + 1}
                </div>
                <div className="h-10 w-px bg-gradient-to-b from-white/60 via-white/20 to-transparent" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold leading-tight">{title}</h3>
                  <p className="text-sm text-white/80">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-amber-50 py-20 text-slate-900">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.14),transparent_36%),radial-gradient(circle_at_86%_14%,rgba(245,158,11,0.12),transparent_34%),radial-gradient(circle_at_50%_82%,rgba(56,189,248,0.12),transparent_42%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/65 to-sky-50" />
      </div>
      <motion.div {...reveal} className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 shadow-[0_10px_28px_rgba(59,130,246,0.14)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-amber-400 shadow-[0_0_0_6px_rgba(59,130,246,0.15)]" />
            Testimonials
          </div>
          <h2 className="text-3xl font-semibold sm:text-4xl">What practice users say</h2>
          <p className="mx-auto max-w-2xl text-sm text-slate-600 sm:text-base">
            Realistic prep, clearer answers, and reports applicants can return to before interview day.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.name} className="group relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/70 p-6 text-slate-900 shadow-[0_18px_46px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition hover:-translate-y-1">
              <div className="relative flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#020617] via-[#0c2238] to-[#062b26] text-base font-semibold text-white ring-2 ring-white/40 shadow-[0_12px_30px_rgba(255,255,255,0.24)]">
                  {item.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="space-y-1">
                  <h3 className="bg-gradient-to-r from-[#020617] via-[#0c2238] to-[#062b26] bg-clip-text text-lg font-semibold text-transparent">{item.name}</h3>
                  <p className="text-sm text-slate-600">{item.title}</p>
                  <div className="flex items-center gap-1 text-sky-500" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="relative mt-4 text-sm leading-relaxed text-slate-800">{item.quote}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="relative overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_80%_18%,rgba(245,158,11,0.14),transparent_36%),radial-gradient(circle_at_45%_80%,rgba(14,165,233,0.12),transparent_40%)]" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/85" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-amber-500 text-lg font-semibold shadow-[0_15px_40px_rgba(56,189,248,0.25)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Officer Charles</p>
              <p className="text-lg font-semibold">Practice US visa interviews</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-white/70">
            AI interview preparation for F1 and B1/B2 applicants. Not affiliated with any government agency.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
            Try free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          <FooterLinks title="Product" links={["Training", "Simulation", "History", "Credits"]} />
          <FooterLinks title="Practice" links={["F1 visa", "B1/B2 visa", "Feedback", "Reports"]} />
          <FooterLinks title="Account" links={["Sign up", "Login", "Pricing", "Dashboard"]} />
        </div>
      </div>
      <div className="relative border-t border-white/10 px-4 py-6 text-center text-xs text-white/45">
        © {new Date().getFullYear()} Officer Charles. All rights reserved.
      </div>
    </footer>
  );
}

function AgentPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <Check className="h-4 w-4 text-amber-200" />
      <span className="text-white/75">{text}</span>
    </div>
  );
}

type ModeAgent = (typeof modeAgents)[number];

function ModeTabs({
  agents,
  currentAgent,
  changeAgent,
}: {
  agents: ModeAgent[];
  currentAgent: ModeAgent;
  changeAgent: (codeName: string) => void;
}) {
  return (
    <div className="relative flex w-full items-center justify-center">
      <div className="relative flex w-full max-w-4xl flex-nowrap items-center justify-center gap-2 overflow-hidden sm:gap-3">
        {agents.map((agent) => {
          const isActive = currentAgent.codeName === agent.codeName;
          return (
            <motion.button
              key={agent.codeName}
              type="button"
              onClick={() => changeAgent(agent.codeName)}
              aria-pressed={isActive}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              animate={{ opacity: isActive ? 1 : 0.9, scale: isActive ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.6 }}
              className={`flex-none whitespace-nowrap rounded-xl border px-3 py-1.5 text-center text-[2.6vw] font-medium leading-tight transition-colors sm:px-4 sm:py-2 sm:text-sm lg:text-base ${
                isActive
                  ? "border-sky-300/45 bg-gradient-to-r from-sky-500/30 to-amber-400/25 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {agent.name}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ModeImageCarousel({
  agents,
  currentAgent,
  changeAgent,
  tiltTarget,
}: {
  agents: ModeAgent[];
  currentAgent: ModeAgent;
  changeAgent: (codeName: string) => void;
  tiltTarget: { x: number; y: number };
}) {
  const swiperRef = useRef<any>(null);
  const paginationRef = useRef<HTMLDivElement | null>(null);
  const isSyncing = useRef(false);
  const transitionMs = 550;

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || !agents.length) return;
    const targetIdx = Math.max(0, agents.findIndex((agent) => agent.codeName === currentAgent.codeName));
    const activeIdx = typeof swiper.activeIndex === "number" ? swiper.activeIndex : 0;
    if (targetIdx !== activeIdx) {
      isSyncing.current = true;
      swiper.slideTo(targetIdx, transitionMs);
      window.setTimeout(() => {
        isSyncing.current = false;
      }, transitionMs + 50);
    }
  }, [agents, currentAgent]);

  return (
    <div className="relative h-[300px] w-full max-w-[320px] overflow-visible px-[5vw] sm:h-[380px] sm:max-w-[360px] sm:px-4 md:h-[450px] md:max-w-[420px] lg:w-[390px] lg:max-w-none lg:px-0 lg:pr-12">
      <Swiper
        effect="cards"
        grabCursor
        loop={false}
        speed={transitionMs}
        resistanceRatio={0.8}
        threshold={8}
        longSwipes
        longSwipesRatio={0.25}
        longSwipesMs={250}
        touchStartPreventDefault={false}
        modules={[EffectCards, Pagination]}
        pagination={{ clickable: true, el: paginationRef.current }}
        cardsEffect={{
          rotate: true,
          perSlideRotate: 3,
          perSlideOffset: 12,
          slideShadows: false,
        }}
        onBeforeInit={(swiper) => {
          if (paginationRef.current) swiper.params.pagination = { clickable: true, el: paginationRef.current };
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          if (paginationRef.current) {
            swiper.params.pagination = { clickable: true, el: paginationRef.current };
            swiper.pagination?.init();
            swiper.pagination?.update();
          }
        }}
        onSlideChange={(swiper) => {
          if (isSyncing.current) return;
          const idx = typeof swiper.activeIndex === "number" ? swiper.activeIndex : 0;
          const next = agents[idx];
          if (next && next.codeName !== currentAgent.codeName) changeAgent(next.codeName);
        }}
        className="h-full w-full cursor-grab overflow-visible active:cursor-grabbing"
      >
        {agents.map((agent) => (
          <SwiperSlide key={agent.codeName} className="!overflow-visible">
            <TiltCard agent={agent} tiltTarget={tiltTarget} />
          </SwiperSlide>
        ))}
      </Swiper>
      <div ref={paginationRef} className="mt-3 flex justify-center" />
    </div>
  );
}

function TiltCard({ agent, tiltTarget }: { agent: ModeAgent; tiltTarget: { x: number; y: number } }) {
  const rX = useMotionValue(0);
  const rY = useMotionValue(0);
  const s = useMotionValue(1);
  const rotateX = useSpring(rX, { stiffness: 160, damping: 18, mass: 0.4 });
  const rotateY = useSpring(rY, { stiffness: 160, damping: 18, mass: 0.4 });
  const scale = useSpring(s, { stiffness: 200, damping: 20, mass: 0.4 });

  useEffect(() => {
    rX.set(tiltTarget.y);
    rY.set(tiltTarget.x);
    s.set(1.02);
  }, [rX, rY, s, tiltTarget]);

  return (
    <div className="relative h-full w-full" style={{ perspective: 1000 }}>
      <motion.div
        style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
        className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-transparent shadow-lg"
      >
        <div className={`absolute inset-0 bg-gradient-to-b ${agent.imageTone}`} />
        <img
          src={agent.image}
          alt={agent.name}
          className="absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
          loading="lazy"
          decoding="async"
          style={{ transform: "translateZ(20px)" }}
        />
        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{agent.name}</div>
              <div className="text-xs text-white/60">{agent.status}</div>
            </div>
            <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold">{agent.cost}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AnimatedComparisonCard({
  title,
  subtitle,
  tone,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "plain" | "smart";
  icon: ReactNode;
  children: ReactNode;
}) {
  const smart = tone === "smart";
  return (
    <div
      data-card
      className={`rounded-3xl border p-5 shadow-2xl ${
        smart
          ? "border-sky-300/30 bg-gradient-to-br from-sky-500/25 via-amber-500/10 to-slate-950/70"
          : "border-white/10 bg-gradient-to-br from-white/15 via-white/5 to-transparent"
      }`}
    >
      <div data-header className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${smart ? "bg-sky-300/15 text-sky-200" : "bg-white/10 text-white/70"}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function StackDivider({ label, smart = false }: { label: string; smart?: boolean }) {
  return (
    <div data-stack-item className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] ${smart ? "text-sky-200/80" : "text-slate-400"}`}>
      <span className={`h-px flex-1 ${smart ? "bg-sky-500/20" : "bg-white/10"}`} />
      <span>{label}</span>
      <span className={`h-px flex-1 ${smart ? "bg-sky-500/20" : "bg-white/10"}`} />
    </div>
  );
}

function StackChatItem({
  speaker,
  text,
  align = "left",
  muted = false,
  smart = false,
}: {
  speaker: string;
  text: string;
  align?: "left" | "right";
  muted?: boolean;
  smart?: boolean;
}) {
  const isUser = align === "right";
  return (
    <div data-stack-item className={`flex flex-col gap-1 ${isUser ? "items-end text-right" : ""}`}>
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${smart ? "text-sky-200/80" : "text-slate-500"}`}>{speaker}</span>
      <div
        className={`w-full max-w-xs rounded-2xl px-3 py-2 text-left shadow-lg ${
          isUser
            ? "bg-white text-slate-900 shadow-sky-900/20"
            : smart
              ? "border border-sky-300/30 bg-sky-500/15 text-sky-50"
              : muted
                ? "border border-white/10 bg-slate-900/70 text-slate-100"
                : "border border-white/10 bg-slate-900/80 text-slate-100"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function Connector({ muted = false, smart = false }: { muted?: boolean; smart?: boolean }) {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <div className={`h-5 w-px ${smart ? "bg-sky-400/30" : muted ? "bg-white/10" : "bg-white/15"}`} />
    </div>
  );
}

function PricingCard({ plan, delay }: { plan: Plan; delay: number }) {
  const price = Number(plan.price);
  const recommended = plan.name.toLowerCase() === "pro";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`relative overflow-hidden rounded-[1.5rem] border p-6 backdrop-blur-xl ${recommended ? "border-sky-300/45 bg-sky-300/[0.08] shadow-[0_18px_60px_rgba(56,189,248,0.18)]" : "border-white/12 bg-white/[0.06]"}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {recommended && <span className="rounded-full bg-sky-300/15 px-2.5 py-1 text-xs font-semibold text-sky-200">Popular</span>}
      </div>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-semibold">${Number.isFinite(price) ? price.toFixed(2) : plan.price}</span>
        <span className="pb-1 text-sm text-white/50">one time</span>
      </div>
      <div className="mt-3 text-sm text-white/60">{plan.creditAmount ?? plan.chatLimit} credits</div>
      <ul className="mt-6 space-y-3 text-sm">
        {(plan.features?.length ? plan.features : [`${plan.creditAmount ?? plan.chatLimit} credits`]).map((feature) => (
          <PlanFeature key={feature}>{feature}</PlanFeature>
        ))}
        <PlanFeature>F1 and B1/B2 chat practice</PlanFeature>
        <PlanFeature>Saved reports and history</PlanFeature>
      </ul>
      {plan.stripeConfigured === false && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/55">
          Checkout will be available after a payment provider is configured.
        </div>
      )}
      <Link to="/register" className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${recommended ? "bg-white text-slate-950 hover:bg-white/90" : "border border-white/14 bg-white/[0.06] text-white hover:bg-white/[0.1]"}`}>
        Choose {plan.name} <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}

function PlanFeature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-white/72">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
      <span>{children}</span>
    </li>
  );
}

function DarkState({ children }: { children: ReactNode }) {
  return <div className="mt-10 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white/62">{children}</div>;
}

function LightInfo({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-[1px] shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-200/40 via-white to-amber-100/60 opacity-40 blur-xl transition group-hover:opacity-80" />
      <div className="relative rounded-[15px] bg-white px-4 py-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{title}</p>
        <p className="text-base font-medium text-slate-900">{detail}</p>
      </div>
    </div>
  );
}

function ThemeInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-600 backdrop-blur">
        {value}
      </div>
    </div>
  );
}

function FooterLinks({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-white/55">
        {links.map((link) => (
          <li key={link}>{link}</li>
        ))}
      </ul>
    </div>
  );
}
