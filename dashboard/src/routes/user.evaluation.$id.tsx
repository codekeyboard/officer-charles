import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ComponentType } from "react";
import {
  Download,
  RefreshCcw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
} from "lucide-react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { SmartNotice } from "@/components/common/SmartNotice";
import { interviewService } from "@/services/interview.service";
import type { FinalEvaluation } from "@/services/interview.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/user/evaluation/$id")({
  head: () => ({ meta: [{ title: "Evaluation · Officer Charles" }] }),
  component: EvaluationPage,
});

function EvaluationPage() {
  const { id } = Route.useParams();
  const interview = useQuery({
    queryKey: ["interview", id],
    queryFn: () => interviewService.getInterview(id),
  });
  const evaluation = useQuery({
    queryKey: ["evaluation", id],
    queryFn: () => interviewService.getEvaluation(id),
  });
  const messages = useQuery({
    queryKey: ["messages", id],
    queryFn: () => interviewService.getInterviewMessages(id),
  });
  const data = evaluation.data;

  function downloadReport() {
    const text = [
      "Officer Charles Interview Evaluation",
      `Interview: ${id}`,
      `Score: ${data?.finalScore ?? "Not available"}`,
      `Strengths: ${(data?.strengths || []).join(", ") || "None recorded"}`,
      `Weaknesses: ${(data?.weaknesses || []).join(", ") || "None recorded"}`,
      `Recommendations: ${(data?.recommendations || []).join(", ") || "None recorded"}`,
      data?.finalFeedback ? `\nFull report:\n${data.finalFeedback}` : "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `officer-charles-evaluation-${id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Topbar title="Interview Evaluation" />
      <PageHeader
        title="Interview Evaluation"
        subtitle={`${interview.data?.visaType ?? "—"} · ${interview.data?.mode ?? "—"} · ${interview.data?.interviewType ?? "—"}`}
        actions={
          <>
            <Link to="/user/dashboard">
              <GradientButton variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" /> Back
              </GradientButton>
            </Link>
            <Link to="/user/chat-interview">
              <GradientButton variant="outline" size="sm">
                <RefreshCcw className="h-4 w-4" /> Retake
              </GradientButton>
            </Link>
            <GradientButton size="sm" disabled={!data} onClick={downloadReport}>
              <Download className="h-4 w-4" /> Download report
            </GradientButton>
          </>
        }
      />
      {(interview.isLoading || evaluation.isLoading || messages.isLoading) && (
        <State text="Loading evaluation..." />
      )}
      {(interview.isError || evaluation.isError || messages.isError) && (
        <State text={errorMessage(interview.error || evaluation.error || messages.error)} />
      )}

      {data && (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="dashboard-card relative overflow-hidden p-6 text-center">
              <div
                className="pointer-events-none absolute -inset-16"
                style={{ background: "var(--gradient-glow)" }}
              />
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Final score
                </div>
                <div className="mt-2 text-6xl font-semibold text-gradient">
                  {data.finalScore ?? "—"}
                </div>
                <div className="mt-1 inline-flex rounded-full purple-gradient px-3 py-1 text-xs font-semibold text-white">
                  {data.result || interview.data?.status || "Evaluation"}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-left text-xs">
                  <Meta label="Visa" value={interview.data?.visaType || "—"} />
                  <Meta label="Mode" value={interview.data?.mode || "—"} />
                  <Meta label="Type" value={interview.data?.interviewType || "—"} />
                  <Meta label="Status" value={interview.data?.status || "—"} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeedbackCard
                icon={CheckCircle2}
                title="Strengths"
                tone="success"
                items={data.strengths || []}
              />
              <FeedbackCard
                icon={AlertTriangle}
                title="Weaknesses"
                tone="warning"
                items={data.weaknesses || []}
              />
              <div className="sm:col-span-2">
                <FeedbackCard
                  icon={Lightbulb}
                  title="Recommendations"
                  tone="primary"
                  items={data.recommendations || []}
                />
              </div>
            </div>
          </div>

          {data.finalEvaluation ? (
            <StructuredEvaluation evaluation={data.finalEvaluation} />
          ) : (
            data.finalFeedback && <FinalReport text={data.finalFeedback} />
          )}

          <div className="mt-6 dashboard-card p-5">
            <div className="text-lg font-semibold">Transcript</div>
            <div className="mt-4 space-y-3">
              {messages.data?.messages.length === 0 && (
                <div className="text-sm text-muted-foreground">No messages stored.</div>
              )}
              {messages.data?.messages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                >
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {message.role}
                  </div>
                  <div className="mt-1">{message.content}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function StructuredEvaluation({ evaluation }: { evaluation: FinalEvaluation }) {
  const categories = Object.entries(evaluation.categoryScores || {});
  return (
    <div className="mt-6 space-y-6">
      <div className="dashboard-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold">Rubric Scorecard</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {evaluation.summary || "Evaluation summary was not recorded."}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
            {evaluation.rubricVersion || "legacy"} · {evaluation.scoringAuthority || "unknown"}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categories.map(([key, item]) => {
            const score = Number(item.score || 0);
            const max = Number(item.max || 0);
            const pct = max > 0 ? Math.round((score / max) * 100) : 0;
            return (
              <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold">{item.label || titleFromKey(key)}</div>
                  <div className="shrink-0 text-sm font-semibold text-primary">{score}/{max || "—"}</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                </div>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                  {(item.evidence || []).map((evidence, index) => (
                    <li key={index}>{evidence}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EvidenceList title="Rule Hits" items={evaluation.ruleHits || []} tone="primary" />
        <EvidenceList title="Red Flags" items={evaluation.redFlags || []} tone="warning" empty="No major red flags recorded." />
      </div>

      <div className="dashboard-card p-5">
        <div className="text-lg font-semibold">Question Reviews</div>
        <div className="mt-4 grid gap-4">
          {(evaluation.questionReviews || []).length === 0 && (
            <div className="text-sm text-muted-foreground">No question-level review was recorded.</div>
          )}
          {(evaluation.questionReviews || []).map((review, index) => (
            <div key={index} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Question {index + 1}</div>
                  <div className="mt-1 text-sm font-semibold">{review.question || "Interview question"}</div>
                </div>
                {typeof review.score === "number" && (
                  <div className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    {review.score}/100
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ReviewField label="Answer Summary" value={review.answerSummary || ""} />
                <ReviewField label="Evidence" value={(review.evidence || []).join("; ")} />
                <ReviewField label="Strengths" value={(review.strengths || []).join("; ")} />
                <ReviewField label="Needs Improvement" value={(review.weaknesses || []).join("; ")} />
              </div>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                {review.recommendation || "Keep this answer concise, truthful, and supported by specific facts."}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm leading-6 text-muted-foreground">
        {evaluation.disclaimer || "Practice assessment only. This does not predict or guarantee a visa outcome."}
      </div>
    </div>
  );
}

function EvidenceList({ title, items, tone, empty = "None recorded." }: { title: string; items: string[]; tone: "primary" | "warning"; empty?: string }) {
  const style = tone === "warning"
    ? "border-[oklch(0.78_0.16_75)]/20 bg-[oklch(0.78_0.16_75)]/10 text-[oklch(0.78_0.16_75)]"
    : "border-primary/20 bg-primary/10 text-primary";
  const list = items.length ? items : [empty];
  return (
    <div className={`rounded-lg border p-4 ${style}`}>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {list.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinalReport({ text }: { text: string }) {
  const report = parseFinalReport(text);

  return (
    <div className="mt-6 dashboard-card overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">{report.title || "Final Interview Report"}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Practice assessment only. This does not predict or guarantee a visa outcome.
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {report.sections.map((section) => (
          <ReportSection key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}

function ReportSection({ section }: { section: ReportSectionData }) {
  const tone = sectionTone(section.title);
  if (isQuestionReviewSection(section.title)) {
    return <QuestionReviewSection section={section} />;
  }
  return (
    <section className={`rounded-lg border p-4 ${tone}`}>
      <div className="text-sm font-semibold">{section.title}</div>
      {section.items.length > 0 ? (
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          {section.items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {section.body}
        </p>
      )}
    </section>
  );
}

function QuestionReviewSection({ section }: { section: ReportSectionData }) {
  const reviews = parseQuestionReviewBody(section.body || section.items.join("\n"));
  return (
    <section className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-primary lg:col-span-2">
      <div className="text-sm font-semibold">{section.title}</div>
      <div className="mt-3 grid gap-3">
        {reviews.length === 0 ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{section.body}</p>
        ) : (
          reviews.map((review, index) => (
            <div key={index} className="rounded-lg border border-white/10 bg-card/70 p-4 text-foreground">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Question {index + 1}</div>
              <div className="mt-1 text-sm font-semibold">{review.question}</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ReviewField label="Answer Summary" value={review.answerSummary} />
                <ReviewField label="What Worked" value={review.whatWorked} />
                <ReviewField label="Needs Improvement" value={review.needsImprovement} />
                <ReviewField label="Recommendation" value={review.recommendation} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">{value || "Not recorded."}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function FeedbackCard({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  tone: "success" | "warning" | "primary";
}) {
  const map = {
    success: "bg-[oklch(0.72_0.18_155)]/15 text-[oklch(0.72_0.18_155)]",
    warning: "bg-[oklch(0.78_0.16_75)]/15 text-[oklch(0.78_0.16_75)]",
    primary: "bg-primary/15 text-primary",
  } as const;
  return (
    <div className="dashboard-card p-5 h-full">
      <div className="flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${map[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.length === 0 && <li>None recorded yet.</li>}
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function State({ text }: { text: string }) {
  return <SmartNotice text={text} tone={/loading/i.test(text) ? "info" : "auto"} className="mt-6" />;
}

interface ReportSectionData {
  title: string;
  items: string[];
  body: string;
}

function parseFinalReport(text: string): { title: string; sections: ReportSectionData[] } {
  const cleaned = String(text || "")
    .replace(/\r/g, "")
    .trim();
  const normalized = cleaned
    .replace(
      /\s+(Readiness summary|Question-by-question review|Strengths|Weaknesses(?:\s*\/\s*risks)?|Practical improvement steps(?:\s*\(short\))?|Recommended Practice Actions|Recommendations|What Went Well|Answers That Need Improvement|Note:)/gi,
      "\n$1",
    )
    .replace(/\s+(?=\d+\.\s)/g, "\n")
    .replace(/\s+-\s+/g, "\n- ");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: ReportSectionData[] = [];
  let title = "";
  let current: ReportSectionData | null = null;

  for (const line of lines) {
    const heading = extractHeading(line);
    if (heading) {
      if (!title && heading.isTitle) {
        title = heading.title;
        if (heading.rest) {
          current = { title: "Summary", items: [], body: heading.rest };
          sections.push(current);
        }
        continue;
      }
      current = { title: heading.title, items: [], body: "" };
      sections.push(current);
      addReportContent(current, heading.rest);
      continue;
    }

    if (!current) {
      if (!title) {
        title = line;
      } else {
        current = { title: "Summary", items: [], body: "" };
        sections.push(current);
        addReportContent(current, line);
      }
      continue;
    }

    if (isQuestionReviewSection(current.title)) {
      current.body = current.body ? `${current.body}\n${line}` : line;
      continue;
    }

    addReportContent(current, line);
  }

  if (!sections.length && cleaned) {
    sections.push({ title: "Summary", items: [], body: cleaned });
  }

  return { title, sections };
}

function extractHeading(line: string): { title: string; rest: string; isTitle?: boolean } | null {
  const titleMatch = line.match(
    /^(Final evaluation(?:\s*\([^)]+\))?.*?)(?:\s+-\s+|\s*:\s+)?(.*)$/i,
  );
  if (titleMatch) return { title: titleMatch[1], rest: titleMatch[2] || "", isTitle: true };

  const match = line.match(
    /^(Readiness summary|Question-by-question review|Strengths|Weaknesses(?:\s*\/\s*risks)?|Practical improvement steps(?:\s*\(short\))?|Recommended Practice Actions|Recommendations|What Went Well|Answers That Need Improvement|Note):?\s*(.*)$/i,
  );
  if (!match) return null;
  return { title: titleCaseReportHeading(match[1]), rest: match[2] || "" };
}

function addReportContent(section: ReportSectionData, value: string) {
  const text = value.trim();
  if (!text) return;
  const pieces = text
    .split(/(?:^|\s)(?:-\s+|(?:\d+\.\s+))/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (pieces.length > 1 || /^[-\d]/.test(text)) {
    section.items.push(...pieces);
    return;
  }

  if (section.body) section.body += `\n${text}`;
  else section.body = text;
}

function titleCaseReportHeading(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("weaknesses")) return "Weaknesses / Risks";
  if (normalized.startsWith("practical")) return "Practical Improvement Steps";
  if (normalized.startsWith("question-by-question")) return "Question-by-Question Review";
  if (normalized.startsWith("readiness")) return "Readiness Summary";
  if (normalized === "note") return "Important Note";
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function titleFromKey(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

function isQuestionReviewSection(title: string) {
  return title.toLowerCase().includes("question-by-question");
}

function parseQuestionReviewBody(body: string) {
  const reviews: Array<Record<string, string>> = [];
  let current: Record<string, string> | null = null;
  String(body || "").split("\n").map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const question = line.match(/^\d+\.\s*Question:\s*(.*)$/i);
    if (question) {
      current = { question: question[1] || "Interview question" };
      reviews.push(current);
      return;
    }
    if (!current) return;
    const field = line.match(/^(Answer summary|What worked|Needs improvement|Recommendation):\s*(.*)$/i);
    if (!field) return;
    const key = field[1].toLowerCase().replace(/\s+([a-z])/g, (_, letter: string) => letter.toUpperCase());
    current[key] = field[2] || "";
  });
  return reviews.map((review) => ({
    question: review.question || "Interview question",
    answerSummary: review.answerSummary || "",
    whatWorked: review.whatWorked || "",
    needsImprovement: review.needsImprovement || "",
    recommendation: review.recommendation || "",
  }));
}

function sectionTone(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("strength") || normalized.includes("went well")) {
    return "border-[oklch(0.72_0.18_155)]/20 bg-[oklch(0.72_0.18_155)]/10 text-[oklch(0.72_0.18_155)]";
  }
  if (normalized.includes("weak") || normalized.includes("risk") || normalized.includes("need")) {
    return "border-[oklch(0.78_0.16_75)]/20 bg-[oklch(0.78_0.16_75)]/10 text-[oklch(0.78_0.16_75)]";
  }
  if (normalized.includes("note")) {
    return "border-white/10 bg-white/5 text-muted-foreground";
  }
  return "border-primary/20 bg-primary/10 text-primary";
}
