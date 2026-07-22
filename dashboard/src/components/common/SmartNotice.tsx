import { AlertTriangle, CheckCircle2, CreditCard, Info } from "lucide-react";
import { GradientButton } from "@/components/common/GradientButton";

type NoticeTone = "auto" | "info" | "warning" | "error" | "success";

interface SmartNoticeProps {
  text: string;
  title?: string;
  tone?: NoticeTone;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function SmartNotice({ text, title, tone = "auto", actionLabel, onAction, className = "" }: SmartNoticeProps) {
  const creditIssue = isCreditIssue(text);
  const resolvedTone = tone === "auto" ? (creditIssue ? "warning" : "error") : tone;
  const Icon = creditIssue ? CreditCard : resolvedTone === "success" ? CheckCircle2 : resolvedTone === "info" ? Info : AlertTriangle;
  const resolvedTitle = title || (creditIssue ? "Add credits to continue" : resolvedTone === "success" ? "All set" : "Needs attention");
  const actionText = actionLabel || (creditIssue ? "Buy credits" : "");

  const shellClass = {
    info: "border-sky-500/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(124,58,237,0.10))]",
    warning: "border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(124,58,237,0.12))]",
    error: "border-rose-500/25 bg-[linear-gradient(135deg,rgba(244,63,94,0.14),rgba(124,58,237,0.10))]",
    success: "border-emerald-500/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(14,165,233,0.08))]",
  }[resolvedTone];

  const iconClass = {
    info: "bg-sky-500/15 text-sky-300",
    warning: "bg-amber-500/15 text-amber-300",
    error: "bg-rose-500/15 text-rose-300",
    success: "bg-emerald-500/15 text-emerald-300",
  }[resolvedTone];

  return (
    <div className={`mt-4 overflow-hidden rounded-2xl border shadow-xl shadow-black/10 ${shellClass} ${className}`}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{resolvedTitle}</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">{text}</div>
          </div>
        </div>
        {onAction && actionText && (
          <GradientButton size="sm" onClick={onAction} className="shrink-0">
            {creditIssue && <CreditCard className="h-4 w-4" />}
            {actionText}
          </GradientButton>
        )}
      </div>
    </div>
  );
}

export function isCreditIssue(text: string) {
  return /credit|payment|billing|subscription|insufficient/i.test(text);
}
