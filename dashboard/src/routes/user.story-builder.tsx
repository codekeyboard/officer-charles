import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, Coins, FileText, Pencil, RefreshCw, Save, Sparkles, X } from "lucide-react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { SmartNotice } from "@/components/common/SmartNotice";
import { errorMessage } from "@/services/api";
import { billingService } from "@/services/billing.service";
import {
  interviewStoryService,
  type StoryFlow,
  type StoryFlowQuestion,
  type StoryPayload,
  type StoryVisaType,
} from "@/services/interviewStory.service";

export const Route = createFileRoute("/user/story-builder")({
  head: () => ({ meta: [{ title: "Story Builder · Officer Charles" }] }),
  component: StoryBuilder,
});

function StoryBuilder() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [visaType, setVisaType] = useState<StoryVisaType>("F1");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [flow, setFlow] = useState<StoryFlow | null>(null);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [storyDraft, setStoryDraft] = useState("");
  const [editingStory, setEditingStory] = useState(false);
  const [message, setMessage] = useState("");

  const storyQuery = useQuery({
    queryKey: ["interview-story", visaType],
    queryFn: () => interviewStoryService.get(visaType),
  });
  const subscription = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getSubscription,
  });

  const story = storyQuery.data?.story ?? null;
  const savedFlow = storyQuery.data?.flow ?? null;
  const creditCost = storyQuery.data?.creditCost ?? 10;
  const availableCredits = subscription.data?.availableCredits ?? subscription.data?.usage?.availableCredits ?? 0;
  const hasStory = Boolean(story?.storyText);
  const activeFlow = flow ?? savedFlow;
  const activeQuestion = activeFlow?.question ?? null;
  const progressPercent = activeFlow?.totalQuestions ? Math.round(((activeFlow.questionIndex + 1) / activeFlow.totalQuestions) * 100) : 0;

  useEffect(() => {
    setStoryDraft(story?.storyText || "");
  }, [story?.storyText]);

  useEffect(() => {
    setWizardOpen(false);
    setReviewMode(false);
    setFlow(null);
    setDraftAnswer("");
    setEditingStory(false);
    setMessage("");
  }, [visaType]);

  useEffect(() => {
    setDraftAnswer(activeQuestion?.answer || "");
    setSelectedOption(optionSelectionForQuestion(activeQuestion));
  }, [activeQuestion?.id, activeQuestion?.answer]);

  const startFlow = useMutation({
    mutationFn: ({ reset }: { reset: boolean }) => interviewStoryService.startFlow(visaType, reset),
    onSuccess: (data) => {
      applyStoryData(data);
      setFlow(data.flow);
      setReviewMode(false);
      setWizardOpen(true);
      setMessage("");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const saveAnswer = useMutation({
    mutationFn: ({ questionId, answer, direction, nextIndex }: { questionId: string; answer: string; direction?: "next" | "previous" | "stay"; nextIndex?: number }) =>
      interviewStoryService.saveFlowAnswer(visaType, { questionId, answer, direction, nextIndex }),
    onSuccess: (data) => {
      applyStoryData(data);
      setFlow(data.flow);
      if (data.flow.complete && activeQuestion?.index === data.flow.totalQuestions - 1) {
        setReviewMode(true);
      }
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const reviewFlow = useMutation({
    mutationFn: () => interviewStoryService.reviewFlow(visaType),
    onSuccess: (data) => {
      applyStoryData(data);
      setFlow(data.flow);
      setReviewMode(true);
      setWizardOpen(true);
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const generateStory = useMutation({
    mutationFn: () => interviewStoryService.generate(visaType),
    onSuccess: async (data) => {
      setStoryDraft(data.story.storyText || "");
      setWizardOpen(false);
      setReviewMode(false);
      setFlow(null);
      setEditingStory(false);
      setMessage("Story generated and saved.");
      queryClient.setQueryData(["interview-story", visaType], { story: data.story, creditCost: data.creditCost });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["interview-story", visaType] }),
        queryClient.invalidateQueries({ queryKey: ["subscription"] }),
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
      ]);
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const saveStory = useMutation({
    mutationFn: () => interviewStoryService.updateStoryText(visaType, storyDraft),
    onSuccess: async (data) => {
      setMessage("Story updated.");
      setEditingStory(false);
      queryClient.setQueryData(["interview-story", visaType], data);
      await queryClient.invalidateQueries({ queryKey: ["interview-story", visaType] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const pageStatus = useMemo(() => {
    if (storyQuery.isLoading) return "Loading";
    if (hasStory) return "Story saved";
    return "Ready to build";
  }, [hasStory, storyQuery.isLoading]);

  function applyStoryData(data: StoryPayload) {
    queryClient.setQueryData(["interview-story", visaType], {
      story: data.story,
      flow: data.flow,
      creditCost: data.creditCost,
    });
  }

  function openWizard(reset = false) {
    setEditingStory(false);
    startFlow.mutate({ reset });
  }

  function submitAnswer(event?: FormEvent) {
    event?.preventDefault();
    if (!activeQuestion || !draftAnswer.trim() || saveAnswer.isPending) return;
    saveAnswer.mutate({ questionId: activeQuestion.id, answer: draftAnswer.trim(), direction: "next" });
  }

  function goBack() {
    if (!activeFlow) return;
    if (reviewMode) {
      const last = activeFlow.answers.at(-1);
      if (last) setFlow({ ...activeFlow, question: last, questionIndex: last.index });
      setReviewMode(false);
      return;
    }
    const previous = activeFlow.answers[Math.max((activeQuestion?.index ?? 0) - 1, 0)];
    if (previous) setFlow({ ...activeFlow, question: previous, questionIndex: previous.index });
  }

  function editReviewAnswer(question: StoryFlowQuestion) {
    if (!activeFlow) return;
    setFlow({ ...activeFlow, question, questionIndex: question.index });
    setReviewMode(false);
  }

  return (
    <>
      <Topbar title="Story Builder" />
      <PageHeader
        title="AI Interview Story Builder"
        subtitle="Create a clear first-person story from your real visa interview details."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm">
            <Coins className="h-4 w-4 text-primary" />
            <span>{creditCost} credits per generation</span>
          </div>
        }
      />

      {message && (
        <SmartNotice
          text={message}
          tone={/saved|generated|updated/i.test(message) ? "success" : "auto"}
          onAction={/credit|payment|billing/i.test(message) ? () => void nav({ to: "/user/billing" }) : undefined}
        />
      )}

      <section className="mt-6 min-h-[640px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <VisaSelect value={visaType} onChange={setVisaType} />
          <div className="ml-auto flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {pageStatus}
          </div>
        </div>

        {hasStory ? (
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Your Interview Story</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {story?.answers.turns.length ?? 0} saved answers · {availableCredits} credits available
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <GradientButton type="button" variant="outline" disabled={startFlow.isPending} onClick={() => openWizard(true)}>
                  <RefreshCw className="h-4 w-4" /> {startFlow.isPending ? "Opening..." : "Regenerate"}
                </GradientButton>
                <GradientButton type="button" variant="ghost" onClick={() => setEditingStory((value) => !value)}>
                  {editingStory ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {editingStory ? "Cancel" : "Edit story"}
                </GradientButton>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/35 p-5">
              {editingStory ? (
                <>
                  <textarea
                    value={storyDraft}
                    onChange={(event) => setStoryDraft(event.target.value)}
                    className="theme-field min-h-72 resize-y py-3 text-base leading-7"
                  />
                  <GradientButton type="button" className="mt-4" variant="outline" disabled={saveStory.isPending} onClick={() => saveStory.mutate()}>
                    <Save className="h-4 w-4" /> {saveStory.isPending ? "Saving..." : "Save story"}
                  </GradientButton>
                </>
              ) : (
                <p className="whitespace-pre-wrap text-base leading-8 text-foreground">{storyDraft}</p>
              )}
            </div>

            <AnswerHistory answers={savedFlow?.answers ?? []} onEdit={(question) => {
              setWizardOpen(true);
              setReviewMode(false);
              setFlow({
                ...(savedFlow || emptyFlow(question)),
                question,
                questionIndex: question.index,
              });
            }} />
          </div>
        ) : (
          <div className="grid min-h-[560px] place-items-center p-6">
            <div className="max-w-2xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <BookOpenText className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-3xl font-semibold text-foreground">Build your interview foundation</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                A good story helps you remember your background, purpose, sponsor, and future plans before you practice. Answer a short set of guided questions, then Officer Charles will turn your real details into a natural first-person story.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <GradientButton type="button" size="lg" disabled={startFlow.isPending} onClick={() => openWizard(false)}>
                  <Sparkles className="h-5 w-5" /> {startFlow.isPending ? "Opening..." : "Generate Story"}
                </GradientButton>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4 text-primary" /> {creditCost} credits after review
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {wizardOpen && activeFlow && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-xl">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Story Builder</div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {reviewMode ? "Review your answers" : `Question ${(activeQuestion?.index ?? 0) + 1} of ${activeFlow.totalQuestions}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:text-foreground"
                aria-label="Close"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-1 bg-background">
              <div className="h-full bg-primary transition-all" style={{ width: reviewMode ? "100%" : `${progressPercent}%` }} />
            </div>

            {reviewMode ? (
              <div className="p-5 sm:p-6">
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Ready to generate
                  </div>
                  <p className="mt-2 text-emerald-100/80">
                    Review your answers below. Generating will use {creditCost} credits.
                  </p>
                </div>
                <div className="mt-4 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                  {activeFlow.answers.map((answer) => (
                    <button
                      type="button"
                      key={answer.id}
                      onClick={() => editReviewAnswer(answer)}
                      className="w-full rounded-2xl border border-border bg-background/35 p-4 text-left hover:bg-white/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs uppercase text-muted-foreground">{answer.category}</span>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">{answer.question}</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">{answer.answer}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <GradientButton type="button" variant="ghost" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </GradientButton>
                  <GradientButton type="button" disabled={!activeFlow.complete || generateStory.isPending} onClick={() => generateStory.mutate()}>
                    <FileText className="h-4 w-4" />
                    {generateStory.isPending ? "Generating..." : hasStory ? "Regenerate Story" : "Generate Story"}
                  </GradientButton>
                </div>
              </div>
            ) : (
              <form onSubmit={submitAnswer} className="p-5 sm:p-6">
                <div className="rounded-2xl border border-border bg-background/35 p-5">
                  <div className="text-xs uppercase text-muted-foreground">{activeQuestion?.category || "story"}</div>
                  <div className="mt-3 text-2xl font-semibold leading-9 text-foreground">{activeQuestion?.question}</div>
                  <StoryAnswerInput
                    question={activeQuestion}
                    value={draftAnswer}
                    selectedOption={selectedOption}
                    onValueChange={setDraftAnswer}
                    onOptionChange={setSelectedOption}
                  />
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <GradientButton type="button" variant="ghost" disabled={(activeQuestion?.index ?? 0) === 0} onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </GradientButton>
                  <GradientButton type="submit" disabled={!draftAnswer.trim() || saveAnswer.isPending}>
                    {saveAnswer.isPending ? "Saving..." : activeQuestion?.index === activeFlow.totalQuestions - 1 ? "Review answers" : "Next"}
                    <ArrowRight className="h-4 w-4" />
                  </GradientButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function VisaSelect({ value, onChange }: { value: StoryVisaType; onChange: (value: StoryVisaType) => void }) {
  return (
    <label className="w-full max-w-[220px] text-xs">
      <span className="mb-1 block text-[10px] uppercase text-muted-foreground">Which visa are you preparing for?</span>
      <select value={value} onChange={(event) => onChange(event.target.value as StoryVisaType)} className="theme-select h-9 text-xs">
        <option value="F1">F-1 Student Visa</option>
        <option value="B1_B2">B1/B2 Visitor Visa</option>
      </select>
    </label>
  );
}

function StoryAnswerInput({
  question,
  value,
  selectedOption,
  onValueChange,
  onOptionChange,
}: {
  question: StoryFlowQuestion | null;
  value: string;
  selectedOption: string;
  onValueChange: (value: string) => void;
  onOptionChange: (value: string) => void;
}) {
  if (!question) return null;
  const inputType = question.inputType || "textarea";
  const options = question.options || [];

  if (inputType === "options") {
    return (
      <div className="mt-5 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const active = selectedOption === option;
            return (
              <button
                type="button"
                key={option}
                onClick={() => {
                  onOptionChange(option);
                  if (option === "Other") {
                    if (options.includes(value)) onValueChange("");
                    return;
                  }
                  onValueChange(option);
                }}
                className={[
                  "min-h-11 rounded-xl border px-4 py-2 text-left text-sm transition",
                  active
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-background/35 text-muted-foreground hover:bg-white/5 hover:text-foreground",
                ].join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>
        {question.allowOther && selectedOption === "Other" && (
          <input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            className="theme-field h-11 text-sm"
            placeholder="Type your answer..."
            autoFocus
          />
        )}
      </div>
    );
  }

  if (inputType === "text") {
    return (
      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="theme-field mt-5 h-11 text-sm"
        placeholder={question.placeholder || "Type your real answer..."}
        autoFocus
      />
    );
  }

  return (
    <textarea
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className="theme-field mt-5 min-h-36 resize-y py-3 text-sm leading-6"
      placeholder={question.placeholder || "Type your real answer..."}
      autoFocus
    />
  );
}

function optionSelectionForQuestion(question: StoryFlowQuestion | null) {
  if (!question || question.inputType !== "options") return "";
  const options = question.options || [];
  if (!question.answer) return "";
  return options.includes(question.answer) ? question.answer : question.allowOther ? "Other" : "";
}

function AnswerHistory({ answers, onEdit }: { answers: StoryFlowQuestion[]; onEdit: (question: StoryFlowQuestion) => void }) {
  if (!answers.length) return null;
  return (
    <div className="mt-7">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Saved question and answer history
      </div>
      <div className="mt-3 space-y-3">
        {answers.map((answer) => (
          <button
            type="button"
            key={answer.id}
            onClick={() => onEdit(answer)}
            className="w-full rounded-2xl border border-border bg-background/30 p-4 text-left hover:bg-white/5"
          >
            <div className="text-xs uppercase text-muted-foreground">{answer.category}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{answer.question}</div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">{answer.answer || "No answer saved yet."}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function emptyFlow(question: StoryFlowQuestion): StoryFlow {
  return {
    question,
    questionIndex: question.index,
    totalQuestions: 1,
    answers: [question],
    answeredCount: question.answered ? 1 : 0,
    complete: question.answered,
    readyToGenerate: question.answered,
  };
}
