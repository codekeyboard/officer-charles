import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CreditCard, Mic, Radio, RotateCcw, ShieldCheck, Square, Timer, User as UserIcon, Video, Wand2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { ActiveInterviewLeaveDialog } from "@/components/common/ActiveInterviewLeaveDialog";
import { SmartNotice } from "@/components/common/SmartNotice";
import { TrainingLessonWizard, TrainingTipCard, pickTrainingTip } from "@/components/interview/TrainingLessonWizard";
import { TranscriptPanel, type TranscriptMessage } from "@/components/liveInterview/TranscriptPanel";
import { Switch } from "@/components/ui/switch";
import { useActiveInterviewGuard } from "@/hooks/useActiveInterviewGuard";
import {
  connectVoiceSession,
  liveInterviewService,
  requestMicrophonePermission,
  type VoiceSessionConnection,
  type VoiceTranscriptEvent,
} from "@/services/interview.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/user/live-interview")({
  head: () => ({ meta: [{ title: "Live Interview" }] }),
  component: LiveInterview,
});

type SpeakingState = "idle" | "user" | "assistant" | "processing";
type FeedbackValue = string | Record<string, unknown> | null;
const AVATAR_STAGE_BG = "bg-[linear-gradient(180deg,#f7fbf9_0%,#eef8f5_100%)]";

interface LiveTrainingFeedback {
  answerAccepted?: boolean;
  score?: number;
  feedback?: FeedbackValue;
  shouldRepeatQuestion?: boolean;
  retryCount?: number;
  nextAction?: string;
}

function LiveInterview() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const connectionRef = useRef<VoiceSessionConnection | null>(null);
  const completingRef = useRef(false);
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null);
  const [visaType, setVisaType] = useState("F1");
  const [mode, setMode] = useState("SIMULATION");
  const [avatarEnabled, setAvatarEnabled] = useState(true);
  const [status, setStatus] = useState("idle");
  const [avatarVideoReady, setAvatarVideoReady] = useState(false);
  const [speaking, setSpeaking] = useState<SpeakingState>("idle");
  const [session, setSession] = useState<any>(null);
  const [lines, setLines] = useState<TranscriptMessage[]>([]);
  const [lastFeedback, setLastFeedback] = useState<FeedbackValue>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastRetry, setLastRetry] = useState<LiveTrainingFeedback | null>(null);
  const [message, setMessage] = useState("");
  const [trainingWizardOpen, setTrainingWizardOpen] = useState(false);
  const [trainingTip, setTrainingTip] = useState(() => pickTrainingTip(1));
  const [isStarting, setIsStarting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const connected = ["connected", "ready", "connecting-avatar", "avatar-connected", "avatar-unavailable-voice-only"].includes(status);
  const avatarActive = avatarEnabled && status === "avatar-connected" && avatarVideoReady;

  async function start() {
    setMessage("");
    setIsStarting(true);
    try {
      const allowed = await requestMicrophonePermission();
      if (!allowed) throw new Error("Microphone permission is required for Live Interview.");
      const data = await liveInterviewService.startLiveInterview({ visaType, mode, provider: "VOICE_LIVE", enableAvatar: avatarEnabled });
      completingRef.current = false;
      setSession(data);
      setLines([]);
      setLastFeedback(null);
      setLastScore(null);
      setLastRetry(null);
      setTrainingTip(pickTrainingTip(Date.now()));
      setTrainingWizardOpen(false);
      setAvatarVideoReady(false);
      setStatus(data.connectionInfo?.configurationRequired ? "configuration-required" : "created");
      await invalidateLiveInterviewData(queryClient);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  async function connect() {
    if (!session?.sessionId) return;
    setMessage("");
    setIsConnecting(true);
    try {
      connectionRef.current?.disconnect();
      connectionRef.current = await connectVoiceSession(session.sessionId, {
        onStatus: handleStatus,
        onSpeaking: setSpeaking,
        onError: setMessage,
        onTranscript: handleTranscript,
        avatarEnabled,
        avatarVideoElement: avatarVideoRef.current,
      });
      setStatus("connecting");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setIsConnecting(false);
    }
  }

  const finishInterview = useCallback(async ({ openScore }: { openScore: boolean }) => {
    if (!session?.sessionId || completingRef.current) return;
    const activeSession = session;
    completingRef.current = true;
    setIsEnding(true);
    setMessage("");
    try {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
      await liveInterviewService.completeLiveInterview(activeSession.sessionId);
      await invalidateLiveInterviewData(queryClient);
      setSession(null);
      setStatus("idle");
      setSpeaking("idle");
      if (openScore) {
        await nav({ to: "/user/evaluation/$id", params: { id: activeSession.interviewId } });
      }
    } catch (error) {
      setMessage(errorMessage(error));
      completingRef.current = false;
    } finally {
      setIsEnding(false);
    }
  }, [nav, queryClient, session]);

  const endForNavigation = useCallback(async () => {
    await finishInterview({ openScore: false });
  }, [finishInterview]);

  const leaveGuard = useActiveInterviewGuard({
    active: Boolean(session?.sessionId) && !isEnding,
    onConfirmEnd: endForNavigation,
    message: "Leaving now will end this live interview and prepare your score.",
  });

  async function endInterview() {
    await finishInterview({ openScore: true });
  }

  function requestStart() {
    if (mode === "TRAINING") {
      setTrainingWizardOpen(true);
      return;
    }
    void start();
  }

  function startAfterTraining() {
    if (isStarting) return;
    setTrainingWizardOpen(false);
    void start();
  }

  async function reset() {
    const activeSessionId = session?.sessionId;
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    setMessage("");
    try {
      if (activeSessionId) await liveInterviewService.abandonLiveInterview(activeSessionId);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSession(null);
      completingRef.current = false;
      setLines([]);
      setLastFeedback(null);
      setLastScore(null);
      setLastRetry(null);
      setAvatarVideoReady(false);
      setStatus("idle");
      setSpeaking("idle");
    }
  }

  function handleStatus(nextStatus: string) {
    if (nextStatus === "connecting-avatar") setMessage("");
    if (nextStatus === "avatar-connected") setMessage("");
    setStatus(nextStatus);
  }

  function handleTranscript(event: VoiceTranscriptEvent) {
    setLines((current) => {
      if (!event.isFinal && event.speaker === "assistant") {
        const draftIndex = current.findIndex((line) => line.id === "assistant-draft");
        const draft = { id: "assistant-draft", speaker: "assistant" as const, text: event.text, isFinal: false };
        return draftIndex >= 0
          ? current.map((line, index) => (index === draftIndex ? draft : line))
          : [...current, draft];
      }

      const next = current.filter((line) => line.id !== `${event.speaker}-draft` && line.id !== "assistant-draft");
      next.push({
        id: `${event.speaker}-${Date.now()}-${next.length}`,
        speaker: event.speaker,
        text: event.text,
        isFinal: event.isFinal,
      });
      if (session?.sessionId && event.isFinal) {
        if (mode === "TRAINING" && event.speaker === "assistant") {
          setTrainingTip(pickTrainingTip(Date.now() + next.length));
        }
        void liveInterviewService.sendTranscript(session.sessionId, {
          speaker: event.speaker,
          text: event.text,
          isFinal: true,
        }).then((response) => {
          const feedback = response?.trainingFeedback as LiveTrainingFeedback | undefined;
          if (feedback) {
            setLastFeedback(feedback.feedback || null);
            setLastScore(typeof feedback.score === "number" ? feedback.score : null);
            setLastRetry(feedback);
          }
          if (response?.status === "COMPLETED" || response?.nextAction === "COMPLETE_INTERVIEW") {
            void finishInterview({ openScore: true });
          }
        }).catch(() => {});
      }
      return next;
    });
  }

  return (
    <>
      <ActiveInterviewLeaveDialog guard={leaveGuard} />
      <TrainingLessonWizard
        visaType={visaType}
        open={trainingWizardOpen}
        starting={isStarting}
        onClose={startAfterTraining}
        onFinish={startAfterTraining}
      />
      <Topbar title="Live Interview" />
      <PageHeader title="Live Visa Interview" subtitle="Practice with real-time speech interviews." />

      {message && <SmartNotice text={message} onAction={() => void nav({ to: "/user/billing" })} />}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className={`relative mx-auto aspect-[417/418] w-full max-w-[417px] overflow-hidden rounded-3xl border border-cyan-900/15 ${AVATAR_STAGE_BG} shadow-sm`}>
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full purple-gradient px-3 py-1.5 text-xs font-semibold text-primary-foreground purple-glow">
              <Timer className="h-3.5 w-3.5" />
              {labelStatus(status)}
            </div>
            <div className="absolute right-4 top-4 z-10 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
              {visaType} · {mode} · {avatarEnabled ? "Avatar" : "Voice"}
            </div>
            <div className={`absolute inset-0 ${AVATAR_STAGE_BG}`}>
              {avatarEnabled ? (
                <>
                  <video
                    ref={avatarVideoRef}
                    autoPlay
                    playsInline
                    onLoadedData={() => setAvatarVideoReady(true)}
                    onPlaying={() => setAvatarVideoReady(true)}
                    className={`h-full w-full object-contain ${AVATAR_STAGE_BG} ${avatarActive ? "block" : "hidden"}`}
                  />
                  {!avatarActive && (
                    <div className={`absolute inset-0 grid place-items-center ${AVATAR_STAGE_BG}`}>
                      <img
                        src="/avatar.png"
                        alt="Officer Charles avatar"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className={`grid h-full w-full place-items-center ${AVATAR_STAGE_BG}`}>
                  {connected ? <Mic className="h-16 w-16 text-primary/80" strokeWidth={1.2} /> : <UserIcon className="h-16 w-16 text-primary/80" strokeWidth={1.2} />}
                </div>
              )}
              <div className="absolute left-4 top-16 rounded-full border border-white/15 bg-black/35 p-1.5 text-white backdrop-blur">
                {avatarEnabled ? <Video className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </div>
              <div className="absolute inset-x-4 bottom-3 text-center text-sm text-muted-foreground">{stageLabel(status, speaking, avatarEnabled)}</div>
            </div>
          </div>

          <div className="dashboard-card p-3">
            <div className="flex items-end gap-3 overflow-x-auto">
              <div className="shrink-0 pb-2 text-sm font-semibold">Interview setup</div>
              <label className="w-[108px] shrink-0 text-xs">
                <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">Visa</span>
                <select value={visaType} onChange={(event) => setVisaType(event.target.value)} disabled={Boolean(session)} className="theme-select h-9 text-xs">
                  <option value="F1">F1</option>
                  <option value="B1_B2">B1/B2</option>
                </select>
              </label>
              <label className="w-[144px] shrink-0 text-xs">
                <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">Mode</span>
                <select value={mode} onChange={(event) => setMode(event.target.value)} disabled={Boolean(session)} className="theme-select h-9 text-xs">
                  <option value="SIMULATION">Simulation</option>
                  <option value="TRAINING">Training</option>
                </select>
              </label>
              <label className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs">
                <Video className="h-4 w-4 text-primary" />
                <span>Avatar</span>
                <Switch checked={avatarEnabled} onCheckedChange={setAvatarEnabled} disabled={Boolean(session)} />
              </label>
              <div className="ml-auto flex shrink-0 items-center gap-2">
              {!session ? (
                <GradientButton size="sm" disabled={isStarting} onClick={requestStart}>
                  <Mic className="h-4 w-4" /> {isStarting ? "Starting..." : "Start session"}
                </GradientButton>
              ) : (
                <>
                  <GradientButton size="sm" disabled={isConnecting || connected} onClick={connect}>
                    <Radio className="h-4 w-4" /> {isConnecting ? "Connecting..." : connected ? "Connected" : "Connect voice"}
                  </GradientButton>
                  <GradientButton size="sm" variant="outline" disabled={isEnding} onClick={endInterview}>
                    <Square className="h-4 w-4" /> {isEnding ? "Ending..." : "End interview"}
                  </GradientButton>
                  <button type="button" onClick={reset} className="theme-button h-9 justify-center px-3 text-xs">
                    <RotateCcw className="h-4 w-4" /> Reset
                  </button>
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:flex xl:max-h-[calc(100vh-200px)] xl:flex-col xl:overflow-hidden">
          <TranscriptPanel messages={lines} speaking={speaking === "user" ? "user" : speaking === "idle" ? "idle" : "ai"} />

          {mode === "TRAINING" && (
            <>
              <TrainingTipCard tip={trainingTip} />
              <div className="dashboard-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Latest feedback</div>
                  <div className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {lastScore === null ? "No score yet" : `${lastScore}/100`}
                  </div>
                </div>
                <FeedbackCards feedback={lastFeedback} />
                {lastRetry && (
                  <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${lastRetry.shouldRepeatQuestion ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
                    {lastRetry.shouldRepeatQuestion
                      ? `Retry recommended. Answer the same question again with more specific details. Retry ${lastRetry.retryCount || 1}.`
                      : "Answer accepted. Continue to the next question."}
                  </div>
                )}
              </div>
            </>
          )}

          <LiveCreditCard status={status} connected={connected} onBuyCredits={() => void nav({ to: "/user/billing" })} />
        </div>
      </div>
    </>
  );
}

function labelStatus(status: string) {
  return status.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function speakingLabel(speaking: SpeakingState) {
  if (speaking === "user") return "Listening to you...";
  if (speaking === "assistant") return "Officer is speaking...";
  if (speaking === "processing") return "Processing your answer...";
  return "Ready for voice interview";
}

function stageLabel(status: string, speaking: SpeakingState, avatarEnabled: boolean) {
  if (avatarEnabled && status === "connecting-avatar") return "Connecting Officer Charles...";
  if (avatarEnabled && status === "avatar-connected") return speaking === "assistant" ? "Officer Charles is speaking..." : speakingLabel(speaking);
  if (avatarEnabled && status === "avatar-unavailable-voice-only") return "Avatar unavailable. Voice interview is still active.";
  return speakingLabel(speaking);
}

function helpText(status: string, connected: boolean) {
  if (status === "connecting-avatar") return "Connecting Officer Charles. Voice will continue if video is unavailable.";
  if (status === "avatar-connected") return "Speak naturally. Officer Charles will answer with synced voice and video.";
  if (status === "avatar-unavailable-voice-only") return "Avatar video could not connect, so the interview is continuing in voice-only mode.";
  return connected
    ? "Your live practice is active. Stay focused, answer naturally, and finish strong."
    : "Live sessions are best for final rehearsal before a real interview. Use credits when you are ready to practice.";
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
  if (typeof feedback === "string") return { good: feedback, weak: "", improvement: "" };
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

async function invalidateLiveInterviewData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["subscription"] }),
    queryClient.invalidateQueries({ queryKey: ["usage"] }),
    queryClient.invalidateQueries({ queryKey: ["interviews"] }),
    queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
  ]);
}

function LiveCreditCard({ status, connected, onBuyCredits }: { status: string; connected: boolean; onBuyCredits: () => void }) {
  return (
    <div className="dashboard-card shrink-0 overflow-hidden p-0">
      <div className="border-b border-white/5 bg-white/[0.03] px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Live practice credits</div>
            <div className="text-xs text-muted-foreground">{connected ? "Session active" : labelStatus(status)}</div>
          </div>
        </div>
      </div>
      <div className="space-y-2.5 p-3">
        <p className="text-xs leading-5 text-muted-foreground">{helpText(status, connected)}</p>
        <div className="grid grid-cols-2 gap-2">
          <CreditPrice label="Training" value="15 credits" />
          <CreditPrice label="Simulation" value="25 credits" />
        </div>
        <GradientButton size="sm" className="h-8 w-full text-xs" onClick={onBuyCredits}>
          <CreditCard className="h-3.5 w-3.5" /> Buy credits
        </GradientButton>
      </div>
    </div>
  );
}

function CreditPrice({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
