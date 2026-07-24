"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Mic, Play, RotateCcw } from "lucide-react";

const visaTypes = ["F-1 student", "B1/B2 visitor", "Follow-up drill"] as const;

const prompts = {
  "F-1 student": {
    question: "Why did you choose this university for your program?",
    feedback:
      "Good answers connect the program, funding, and return plan without sounding memorized.",
  },
  "B1/B2 visitor": {
    question: "What is the purpose and length of your visit?",
    feedback:
      "Strong answers stay specific, temporary, and consistent with your documents.",
  },
  "Follow-up drill": {
    question: "Your answer is short. Can you explain that with one concrete detail?",
    feedback:
      "Follow-ups test consistency. Keep your next answer direct and anchored in facts.",
  },
};

export function SampleInterview() {
  const [selectedVisa, setSelectedVisa] =
    useState<(typeof visaTypes)[number]>("F-1 student");
  const [answer, setAnswer] = useState("");
  const activePrompt = prompts[selectedVisa];

  const score = useMemo(() => {
    const words = answer.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 0;
    return Math.min(92, 46 + words.length * 3);
  }, [answer]);

  return (
    <section
      id="practice"
      className="bg-[#f0eee6] px-4 py-14 sm:px-6 lg:px-8"
      aria-label="Sample interview"
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-[color:var(--teal)]">
            Try the rhythm
          </p>
          <h2 className="mt-3 max-w-lg text-3xl font-semibold leading-tight text-[color:var(--ink)] sm:text-4xl">
            Practice one focused answer before the full simulation.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[color:var(--muted)]">
            Officer Charles trains the moment that matters: a clear question, a
            steady answer, and feedback you can use before your next attempt.
          </p>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist">
            {visaTypes.map((visaType) => (
              <button
                key={visaType}
                type="button"
                role="tab"
                aria-selected={selectedVisa === visaType}
                onClick={() => setSelectedVisa(visaType)}
                className={`h-10 rounded-lg border px-4 text-sm font-semibold transition ${
                  selectedVisa === visaType
                    ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-white"
                    : "border-[#cbc4b4] bg-white text-[#312d25] hover:border-[color:var(--teal)]"
                }`}
              >
                {visaType}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#d8d0bf] bg-white p-4 shadow-[0_24px_80px_rgba(43,36,26,0.12)] sm:p-5">
          <div className="flex items-center justify-between border-b border-[#ebe5d8] pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e7f4ef] text-[color:var(--teal)]">
                <Mic size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1f1b15]">
                  Officer Charles
                </p>
                <p className="truncate text-xs text-[color:var(--muted)]">
                  Simulated interview question
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-[#f7e9a9] px-3 py-1 text-xs font-semibold text-[#5a4200]">
              Live mode
            </span>
          </div>

          <div className="mt-5 rounded-lg bg-[#f7f5ef] p-4">
            <p className="text-xs font-semibold uppercase text-[color:var(--teal)]">
              Question
            </p>
            <p className="mt-2 text-lg font-semibold leading-7 text-[#1d1a15]">
              {activePrompt.question}
            </p>
          </div>

          <label htmlFor="answer" className="mt-5 block text-sm font-semibold">
            Your answer
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={5}
            placeholder="I chose this university because..."
            className="mt-2 w-full resize-none rounded-lg border border-[#d8d0bf] bg-white p-3 text-sm leading-6 outline-none transition placeholder:text-[#9b9385] focus:border-[color:var(--teal)] focus:ring-4 focus:ring-[#0f766e1c]"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-lg border border-[#d8d0bf] p-4">
              <p className="text-xs font-semibold uppercase text-[color:var(--muted)]">
                Readiness
              </p>
              <p className="mt-2 text-3xl font-semibold text-[#1d1a15]">
                {score}%
              </p>
              <div className="mt-3 h-2 rounded-full bg-[#e9e3d6]">
                <div
                  className="h-2 rounded-full bg-[color:var(--teal)] transition-all"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-[#d8d0bf] p-4">
              <div className="flex items-start gap-2">
                <Check
                  className="mt-0.5 shrink-0 text-[color:var(--teal)]"
                  size={18}
                  aria-hidden
                />
                <p className="text-sm leading-6 text-[#403a31]">
                  {activePrompt.feedback}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href="/register"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#191814] px-5 text-sm font-semibold text-white transition hover:bg-[#2b261f]"
            >
              <Play size={17} aria-hidden />
              Start full practice
            </a>
            <button
              type="button"
              onClick={() => setAnswer("")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbc4b4] bg-white px-5 text-sm font-semibold text-[#26221c] transition hover:border-[#9e9584]"
            >
              <RotateCcw size={17} aria-hidden />
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroActions() {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <a
        href="/register"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#c4d82e] px-6 text-sm font-bold text-[#15150e] shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition hover:bg-[#d5ea36]"
      >
        Start with 20 credits
        <ArrowRight size={18} aria-hidden />
      </a>
      <a
        href="#practice"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/38 bg-white/12 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
      >
        <Play size={17} aria-hidden />
        Try sample flow
      </a>
    </div>
  );
}
