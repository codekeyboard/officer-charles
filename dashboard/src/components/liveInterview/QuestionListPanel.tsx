import { Check, Circle } from "lucide-react";

interface Q { id: number; text: string; status: "completed" | "current" | "pending" }

export function QuestionListPanel({ questions }: { questions: Q[] }) {
  return (
    <div className="dashboard-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Questions</div>
        <div className="text-xs text-muted-foreground">
          {questions.filter((q) => q.status === "completed").length} answered
        </div>
      </div>
      <div className="mt-3 max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
        {questions.map((q) => (
          <div
            key={q.id}
            className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
              q.status === "current"
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-white/5"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {q.status === "completed" ? (
                <div className="grid h-4 w-4 place-items-center rounded-full bg-primary/20">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              ) : q.status === "current" ? (
                <div className="h-4 w-4 rounded-full purple-gradient purple-glow" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
            <div
              className={
                q.status === "completed"
                  ? "text-muted-foreground line-through"
                  : q.status === "current"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }
            >
              {q.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}