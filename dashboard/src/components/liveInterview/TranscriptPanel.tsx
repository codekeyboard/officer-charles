import { motion } from "motion/react";
import { Bot, Mic, User } from "lucide-react";
import { useEffect, useRef } from "react";

export interface TranscriptMessage {
  id: string;
  speaker: "user" | "assistant";
  text: string;
  isFinal?: boolean;
}

export function TranscriptPanel({
  messages,
  speaking,
}: {
  messages: TranscriptMessage[];
  speaking: "user" | "ai" | "idle";
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  return (
    <div className="dashboard-card flex h-[420px] flex-col p-4 xl:h-auto xl:min-h-0 xl:flex-1">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Live Transcript</div>
        {speaking !== "idle" && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <Mic className="h-3.5 w-3.5" />
            <span>{speaking === "user" ? "You're speaking..." : "Officer is speaking..."}</span>
            <SpeakingDots />
          </div>
        )}
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card/70 p-3">
        {messages.length ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <TranscriptBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="grid min-h-[180px] place-items-center text-center text-sm italic text-muted-foreground">
            Transcript will appear here in realtime...
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptBubble({ message }: { message: TranscriptMessage }) {
  const isOfficer = message.speaker === "assistant";
  const Icon = isOfficer ? Bot : User;
  return (
    <div className={`flex items-start gap-3 ${isOfficer ? "pr-10" : "flex-row-reverse pl-10"}`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isOfficer ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-300"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className={`min-w-0 max-w-[82%] ${isOfficer ? "text-left" : "text-right"}`}>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {isOfficer ? "Officer" : "You"}
        </div>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
            isOfficer
              ? "rounded-tl-sm border border-border bg-background text-foreground"
              : "rounded-tr-sm bg-primary text-primary-foreground"
          } ${message.isFinal === false ? "opacity-75" : ""}`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

function SpeakingDots() {
  return (
    <div className="flex items-end gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-0.5 rounded bg-primary"
          animate={{ height: [4, 12, 4] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
