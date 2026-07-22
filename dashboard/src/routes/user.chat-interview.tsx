import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, StopCircle, Lightbulb, Play, CheckCircle2, AlertTriangle, Wand2 } from "lucide-react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { ActiveInterviewLeaveDialog } from "@/components/common/ActiveInterviewLeaveDialog";
import { SmartNotice } from "@/components/common/SmartNotice";
import { TrainingLessonWizard, TrainingTipCard, pickTrainingTip } from "@/components/interview/TrainingLessonWizard";
import { interviewService } from "@/services/interview.service";
import { errorMessage } from "@/services/api";
import { useActiveInterviewGuard } from "@/hooks/useActiveInterviewGuard";

type Message = { id: string; role: "user" | "assistant" | "tip"; text: string };
type FeedbackValue = string | Record<string, unknown> | null;
type CoachingFeedback = { good: string; weak: string; improvement: string; prompt: string };

export const Route = createFileRoute("/user/chat-interview")({
  head: () => ({ meta: [{ title: "Chat Interview · Officer Charles" }] }),
  component: ChatInterview,
});

function ChatInterview() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [visaType, setVisaType] = useState("F1");
  const [mode, setMode] = useState("TRAINING");
  const [interviewId, setInterviewId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [lastFeedback, setLastFeedback] = useState<FeedbackValue>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [trainingWizardOpen, setTrainingWizardOpen] = useState(false);

  const start = useMutation({
    mutationFn: () => interviewService.startChatInterview({ visaType, mode }),
    onSuccess: (data) => {
      setError("");
      setInterviewId(data.interviewId);
      const firstQuestion = data.message || data.currentQuestion;
      setMessages([
        ...(mode === "TRAINING" ? [{ id: `tip_start_${Date.now()}`, role: "tip" as const, text: pickTrainingTip(Date.now()) }] : []),
        { id: "start", role: "assistant", text: firstQuestion },
      ]);
      setLastFeedback("");
      setLastScore(null);
      setTrainingWizardOpen(false);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const send = useMutation({
    mutationFn: (message: string) => interviewService.sendChatMessage(interviewId, message),
    onSuccess: async (data) => {
      setMessages((items) => [
        ...items,
        ...(mode === "TRAINING" ? [{ id: `tip_${Date.now()}`, role: "tip" as const, text: pickTrainingTip(Date.now() + items.length) }] : []),
        { id: `a_${Date.now()}`, role: "assistant", text: data.assistantMessage || data.nextQuestion || "Answer received." },
      ]);
      setLastFeedback((data.feedback || null) as FeedbackValue);
      setLastScore(typeof data.score === "number" ? data.score : null);
      if (data.status === "COMPLETED" || data.nextAction === "COMPLETE_INTERVIEW") {
        const completedInterviewId = data.interviewId || interviewId;
        setInterviewId("");
        await invalidateInterviewData(queryClient);
        await nav({ to: "/user/evaluation/$id", params: { id: completedInterviewId } });
      }
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const complete = useMutation({
    mutationFn: () => interviewService.completeChatInterview(interviewId),
    onSuccess: async () => {
      await invalidateInterviewData(queryClient);
      await nav({ to: "/user/evaluation/$id", params: { id: interviewId } });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const endForNavigation = useCallback(async () => {
    if (!interviewId) return;
    try {
      await interviewService.completeChatInterview(interviewId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      await invalidateInterviewData(queryClient);
      setInterviewId("");
    }
  }, [interviewId, queryClient]);

  const leaveGuard = useActiveInterviewGuard({
    active: Boolean(interviewId) && !complete.isPending,
    onConfirmEnd: endForNavigation,
  });

  function submitMessage() {
    const message = input.trim();
    if (!message || !interviewId) return;
    setMessages((items) => [...items, { id: `u_${Date.now()}`, role: "user", text: message }]);
    setInput("");
    setError("");
    send.mutate(message);
  }

  function requestStartInterview() {
    if (mode === "TRAINING") {
      setTrainingWizardOpen(true);
      return;
    }
    start.mutate();
  }

  function startAfterTraining() {
    if (start.isPending) return;
    setTrainingWizardOpen(false);
    start.mutate();
  }

  return (
    <>
      <ActiveInterviewLeaveDialog guard={leaveGuard} />
      <TrainingLessonWizard
        visaType={visaType}
        open={trainingWizardOpen}
        starting={start.isPending}
        onClose={startAfterTraining}
        onFinish={startAfterTraining}
      />
      <Topbar title="Chat Interview" />
      <PageHeader
        title="Chat Interview"
        subtitle="Text-based practice with Officer Charles"
        actions={
          interviewId ? (
            <GradientButton variant="outline" disabled={complete.isPending} onClick={() => complete.mutate()}>
              <StopCircle className="h-4 w-4" /> {complete.isPending ? "Ending..." : "End interview"}
            </GradientButton>
          ) : null
        }
      />

      {error && <SmartNotice text={error} onAction={() => void nav({ to: "/user/billing" })} />}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="dashboard-card flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-5 py-4">
            <Selector label="Visa" value={visaType} onChange={setVisaType} disabled={Boolean(interviewId)} options={[{ value: "F1", label: "F1 Student" }, { value: "B1_B2", label: "B1/B2 Visitor" }]} />
            <Selector label="Mode" value={mode} onChange={setMode} disabled={Boolean(interviewId)} options={[{ value: "TRAINING", label: "Training" }, { value: "SIMULATION", label: "Real simulation" }]} />
            <div className="ml-auto flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {interviewId ? "Active" : "Ready"}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5 min-h-[420px] max-h-[560px]">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                <div>
                  <p>Select your visa and mode, then start a backend interview session.</p>
                  <GradientButton className="mt-4" disabled={start.isPending} onClick={requestStartInterview}>
                    <Play className="h-4 w-4" /> {start.isPending ? "Starting..." : "Start interview"}
                  </GradientButton>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "tip" ? (
                    <div className="w-full max-w-[32rem]">
                      <TrainingTipCard tip={message.text} />
                    </div>
                  ) : (
                    <>
                  {message.role === "assistant" && (
                    <div className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-full purple-gradient text-xs font-bold text-white">OC</div>
                  )}
                  <ChatBubble message={message} />
                    </>
                  )}
                </div>
              ))
            )}
            {send.isPending && <div className="text-xs text-muted-foreground">Officer Charles is responding...</div>}
            {send.isSuccess && !interviewId && <div className="text-xs text-muted-foreground">Generating evaluation...</div>}
          </div>

          <div className="border-t border-white/5 p-4">
            <div className="theme-input-shell flex items-center gap-2 rounded-2xl px-3 py-2">
              <input
                value={input}
                disabled={!interviewId || send.isPending}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitMessage()}
                placeholder={interviewId ? "Type your answer..." : "Start an interview first"}
                className="flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <GradientButton size="sm" onClick={submitMessage} disabled={!interviewId || send.isPending}>
                <Send className="h-4 w-4" />
              </GradientButton>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="dashboard-card p-5">
            <div className="text-sm font-semibold">Interview details</div>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Visa type" value={visaType} />
              <Row label="Mode" value={mode} />
              <Row label="Messages" value={String(messages.length)} />
              <Row label="Current score" value={lastScore === null ? "—" : String(lastScore)} />
            </div>
          </div>

          {lastFeedback && (
            <div className="dashboard-card p-5">
              <div className="text-sm font-semibold">Latest feedback</div>
              <FeedbackCards feedback={lastFeedback} />
            </div>
          )}

          <div className="dashboard-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" /> Tips
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>Keep answers short and specific.</li>
              <li>Show strong ties to your home country.</li>
              <li>Use exact details for funding and study plans.</li>
            </ul>
            {interviewId && (
              <Link to="/user/evaluation/$id" params={{ id: interviewId }} className="mt-4 inline-block text-xs text-primary hover:underline">
                Open saved evaluation
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ChatBubble({ message }: { message: Message }) {
  if (message.role === "tip") return null;
  if (message.role === "user") {
    return (
      <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm purple-gradient text-primary-foreground">
        {message.text}
      </div>
    );
  }

  const coaching = parseCoachingFeedback(message.text);
  if (!coaching) {
    return (
      <div className="max-w-[75%] rounded-2xl border border-border bg-card/80 px-4 py-2.5 text-sm text-foreground">
        {message.text}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[min(34rem,82%)] rounded-2xl border border-border bg-card/90 p-3 text-sm text-foreground shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Coaching feedback
      </div>
      <div className="grid gap-2">
        <InlineFeedbackRow icon={CheckCircle2} label="Good" value={coaching.good} tone="good" />
        <InlineFeedbackRow icon={AlertTriangle} label="Needs work" value={coaching.weak} tone="weak" />
        <InlineFeedbackRow icon={Wand2} label="Improve next" value={coaching.improvement} tone="improve" />
      </div>
      {coaching.prompt && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-foreground">
          {coaching.prompt}
        </div>
      )}
    </div>
  );
}

function InlineFeedbackRow({ icon: Icon, label, value, tone }: { icon: typeof CheckCircle2; label: string; value: string; tone: "good" | "weak" | "improve" }) {
  const toneClass = tone === "good" ? "text-emerald-500 bg-emerald-500/10" : tone === "weak" ? "text-amber-500 bg-amber-500/10" : "text-primary bg-primary/10";
  return (
    <div className="flex gap-3 rounded-xl border border-border/80 bg-background/35 p-3">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm leading-5 text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Selector({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <label className="min-w-[150px] text-xs">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="theme-select h-9 text-xs">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function FeedbackCards({ feedback }: { feedback: FeedbackValue }) {
  const normalized = normalizeFeedback(feedback);
  return (
    <div className="mt-3 grid gap-3">
      <FeedbackCard icon={CheckCircle2} label="Good" value={normalized.good} tone="good" />
      <FeedbackCard icon={AlertTriangle} label="Needs work" value={normalized.weak} tone="weak" />
      <FeedbackCard icon={Wand2} label="Improve next" value={normalized.improvement} tone="improve" />
    </div>
  );
}

function FeedbackCard({ icon: Icon, label, value, tone }: { icon: typeof CheckCircle2; label: string; value: string; tone: "good" | "weak" | "improve" }) {
  const toneClass = tone === "good" ? "text-emerald-500 bg-emerald-500/10" : tone === "weak" ? "text-amber-500 bg-amber-500/10" : "text-primary bg-primary/10";
  return (
    <div className="rounded-xl border border-border bg-card/70 p-3">
      <div className="flex items-start gap-3">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm text-foreground">{value || "No feedback yet."}</div>
        </div>
      </div>
    </div>
  );
}

function normalizeFeedback(feedback: FeedbackValue) {
  if (!feedback) return { good: "", weak: "", improvement: "" };
  if (typeof feedback === "string") {
    const parsed = parseCoachingFeedback(feedback);
    return parsed ? { good: parsed.good, weak: parsed.weak, improvement: parsed.improvement } : { good: feedback, weak: "", improvement: "" };
  }
  return {
    good: stringifyFeedback(feedback.good),
    weak: stringifyFeedback(feedback.weak),
    improvement: stringifyFeedback(feedback.improvement || feedback.improve || feedback.recommendation),
  };
}

function stringifyFeedback(value: unknown) {
  if (Array.isArray(value)) return value.join(" ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value || "");
}

function parseCoachingFeedback(text: string): CoachingFeedback | null {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const match = normalized.match(/^Good:\s*(.*?)\s+Weak:\s*(.*?)\s+Improvement:\s*(.*?)(?:\s+(Please .*))?$/i);
  if (!match) return null;
  return {
    good: match[1]?.trim() || "No strength recorded yet.",
    weak: match[2]?.trim() || "No weakness recorded yet.",
    improvement: match[3]?.trim() || "Keep adding specific details.",
    prompt: match[4]?.trim() || "",
  };
}

async function invalidateInterviewData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["usage"] }),
    queryClient.invalidateQueries({ queryKey: ["interviews"] }),
    queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
  ]);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
