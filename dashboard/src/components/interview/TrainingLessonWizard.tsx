import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, DoorOpen, GraduationCap, MapPinned, Plane, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { GradientButton } from "@/components/common/GradientButton";

type VisaType = "F1" | "B1_B2" | string;

interface TrainingLessonWizardProps {
  visaType: VisaType;
  open: boolean;
  starting?: boolean;
  onClose: () => void;
  onFinish: () => void;
}

type Lesson = {
  title: string;
  text?: string;
  bullets?: string[];
  mistakes?: string[];
  visual: "embassy" | "student" | "rules" | "mistakes" | "ready" | "travel";
};

const F1_LESSONS: Lesson[] = [
  {
    title: "Welcome to F-1 Visa Training",
    text: "Welcome! Before you begin your mock interview, take a few minutes to understand what visa officers look for during an F-1 visa interview. These lessons are designed to help you stay confident, communicate clearly, and explain your study plans honestly.",
    visual: "student",
  },
  {
    title: "What Happens During the Interview?",
    text: "A U.S. visa interview usually lasts only a few minutes. The officer will ask questions about your education, finances, and future plans. Their goal is to determine whether you qualify for an F-1 student visa.",
    bullets: ["Embassy entrance", "Waiting room", "Visa interview window"],
    visual: "embassy",
  },
  {
    title: "Build Your Story",
    text: "Every successful applicant has a clear story. You should be able to explain:",
    bullets: ["Why you chose this course.", "Why you chose this university.", "Who is paying for your education.", "What you plan to do after graduation."],
    visual: "student",
  },
  {
    title: "Five Golden Rules",
    bullets: ["Be honest.", "Answer only what is asked.", "Know your financial sponsor.", "Explain your plans after graduation.", "Stay calm and confident."],
    visual: "rules",
  },
  {
    title: "Common Mistakes",
    mistakes: ["Memorizing answers.", "Giving very long answers.", "Contradicting your DS-160 or I-20.", "Not knowing your university.", "Looking nervous."],
    visual: "mistakes",
  },
  {
    title: "You're Ready!",
    text: "Congratulations! Preparation builds confidence. Speak naturally. Smile. Tell your story honestly. Believe in yourself. Good luck!",
    visual: "ready",
  },
];

const B1B2_LESSONS: Lesson[] = [
  {
    title: "Welcome to B1/B2 Visa Training",
    text: "This short training will prepare you to explain your travel plans clearly and confidently.",
    visual: "travel",
  },
  {
    title: "What Will the Officer Ask?",
    text: "The officer wants to understand:",
    bullets: ["Why are you traveling?", "How long will you stay?", "Who is paying?", "Why will you return home?"],
    visual: "embassy",
  },
  {
    title: "Know Your Travel Story",
    text: "You should clearly explain:",
    bullets: ["Why you are visiting.", "Where you will stay.", "How long you will stay.", "Who you will visit.", "Who will pay for your trip."],
    visual: "travel",
  },
  {
    title: "Five Golden Rules",
    bullets: ["Tell the truth.", "Keep answers short.", "Know your itinerary.", "Show strong ties to your home country.", "Stay calm."],
    visual: "rules",
  },
  {
    title: "Common Mistakes",
    mistakes: ["Saying you'll look for work.", "Giving inconsistent answers.", "Not knowing your travel plans.", "Appearing unsure.", "Bringing unnecessary information into your answers."],
    visual: "mistakes",
  },
  {
    title: "You're Ready!",
    text: "Travel confidently. Speak honestly. Remember why you're traveling. Good luck!",
    visual: "ready",
  },
];

export const TRAINING_TIPS = [
  "Listen carefully before answering.",
  "Take a second to think before speaking.",
  "Keep your answers natural.",
  "Short answers are often stronger than long ones.",
  "Do not memorize scripts.",
  "Smile.",
  "Sit up straight.",
  "Speak clearly.",
  "Confidence comes from preparation.",
  "Every question has a purpose.",
  "Tell your own story.",
  "If you do not know, be honest.",
  "The officer wants to understand you, not trick you.",
];

export function pickTrainingTip(seed = Date.now()) {
  return TRAINING_TIPS[Math.abs(seed) % TRAINING_TIPS.length];
}

export function TrainingTipCard({ tip }: { tip: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4" /> Training tip
      </div>
      <p className="mt-2 leading-6 text-amber-100/85">{tip}</p>
    </div>
  );
}

export function TrainingLessonWizard({ visaType, open, starting = false, onClose, onFinish }: TrainingLessonWizardProps) {
  const lessons = visaType === "B1_B2" ? B1B2_LESSONS : F1_LESSONS;
  const [index, setIndex] = useState(0);
  const lesson = lessons[index];
  const isFirst = index === 0;
  const isLast = index === lessons.length - 1;
  const progress = Math.round(((index + 1) / lessons.length) * 100);
  const label = visaType === "B1_B2" ? "B1/B2 Visitor Visa Training" : "F-1 Student Visa Training";

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, visaType]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-xl">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Officer Charles Training</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{label}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:text-foreground"
            aria-label="Skip training"
            title="Skip training"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-1 bg-background">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
          <LessonVisual lesson={lesson} visaType={visaType} />
          <div className="flex min-h-[460px] flex-col p-5 sm:p-7">
            <div className="text-xs font-semibold uppercase text-primary">
              {isFirst ? "Welcome" : isLast ? "Final lesson" : `Lesson ${index}`}
            </div>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground">{lesson.title}</h2>
            {lesson.text && <p className="mt-4 text-base leading-7 text-muted-foreground">{lesson.text}</p>}
            {lesson.bullets && (
              <div className="mt-5 grid gap-3">
                {lesson.bullets.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-border bg-background/35 p-3 text-sm text-foreground">
                    <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
            {lesson.mistakes && (
              <div className="mt-5 grid gap-3">
                {lesson.mistakes.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
            {isLast && (
              <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> You're ready
                </div>
                <p className="mt-2 leading-6 text-emerald-100/85">Be honest. Stay calm. Believe in yourself. Tell your story with confidence.</p>
              </div>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <GradientButton type="button" variant="ghost" disabled={isFirst} onClick={() => setIndex((value) => Math.max(value - 1, 0))}>
                <ArrowLeft className="h-4 w-4" /> Back
              </GradientButton>
              {isLast ? (
                <GradientButton type="button" disabled={starting} onClick={onFinish}>
                  <CheckCircle2 className="h-4 w-4" /> {starting ? "Starting..." : "Start Mock Interview"}
                </GradientButton>
              ) : (
                <GradientButton type="button" onClick={() => setIndex((value) => Math.min(value + 1, lessons.length - 1))}>
                  {isFirst ? "Start Training" : "Next"} <ArrowRight className="h-4 w-4" />
                </GradientButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonVisual({ lesson, visaType }: { lesson: Lesson; visaType: VisaType }) {
  const isVisitor = visaType === "B1_B2";
  const visuals = {
    embassy: [Building2, DoorOpen, ShieldCheck],
    student: [GraduationCap, Sparkles, CheckCircle2],
    rules: [Star, ShieldCheck, CheckCircle2],
    mistakes: [X, ShieldCheck, AlertIcon],
    ready: [CheckCircle2, Sparkles, DoorOpen],
    travel: [Plane, MapPinned, ShieldCheck],
  } as const;
  const [Primary, Secondary, Tertiary] = visuals[lesson.visual];

  return (
    <div className="relative min-h-[320px] overflow-hidden bg-[radial-gradient(circle_at_25%_20%,rgba(59,130,246,0.28),transparent_32%),linear-gradient(135deg,rgba(16,185,129,0.18),rgba(124,58,237,0.16),rgba(14,165,233,0.12))] p-6 md:min-h-full">
      <div className="absolute inset-x-6 top-6 flex items-center justify-between rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white backdrop-blur">
        <span className="text-sm font-semibold">{isVisitor ? "B1/B2" : "F-1"}</span>
        <span className="text-xs text-white/75">Training preview</span>
      </div>
      <div className="grid h-full place-items-center pt-16">
        <div className="relative h-56 w-56 sm:h-64 sm:w-64">
          <div className="absolute inset-0 rounded-full border border-white/20 bg-white/10 backdrop-blur" />
          <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl bg-white text-primary shadow-xl">
            <Primary className="h-14 w-14" strokeWidth={1.4} />
          </div>
          <div className="absolute left-2 top-8 grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-black/20 text-white backdrop-blur">
            <Secondary className="h-8 w-8" strokeWidth={1.4} />
          </div>
          <div className="absolute bottom-7 right-0 grid h-20 w-20 place-items-center rounded-2xl border border-white/20 bg-black/20 text-white backdrop-blur">
            <Tertiary className="h-9 w-9" strokeWidth={1.4} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertIcon({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return <X className={className} strokeWidth={strokeWidth} />;
}
