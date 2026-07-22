import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Video, Trophy, ArrowRight, BarChart3, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { SmartNotice } from "@/components/common/SmartNotice";
import { userService } from "@/services/user.service";
import { billingService } from "@/services/billing.service";
import { errorMessage } from "@/services/api";
import type { InterviewSummary } from "@/services/types";

export const Route = createFileRoute("/user/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Officer Charles" }] }),
  component: UserDashboard,
});

function UserDashboard() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: userService.getProfile });
  const usage = useQuery({ queryKey: ["usage"], queryFn: userService.getUsage });
  const interviews = useQuery({
    queryKey: ["interviews", "recent"],
    queryFn: () => userService.getInterviews({ limit: 6 }),
  });
  const subscription = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getSubscription,
  });

  const firstName = profile.data?.name?.split(" ")[0] ?? "there";
  const interviewItems = interviews.data?.items ?? [];
  const scores = interviewItems
    .filter((item) => typeof item.finalScore === "number")
    .slice()
    .reverse()
    .map((item, index) => ({ label: `#${index + 1}`, score: item.finalScore || 0 }));

  return (
    <>
      <Topbar title="Dashboard" />
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Continue your visa interview preparation with Officer Charles."
        actions={
          <Link to="/user/live-interview">
            <GradientButton>
              <Video className="h-4 w-4" /> Start Live Interview
            </GradientButton>
          </Link>
        }
      />

      {(profile.isError || usage.isError || interviews.isError) && (
        <State text={errorMessage(profile.error || usage.error || interviews.error)} />
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="dashboard-card relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Recommended
          </div>
          <h2 className="mt-2 text-xl font-semibold">Start your next interview</h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Your answers and evaluations will be saved to the backend and available in history.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/user/live-interview">
              <GradientButton>
                Start Live <ArrowRight className="h-4 w-4" />
              </GradientButton>
            </Link>
            <Link to="/user/chat-interview">
              <GradientButton variant="ghost">
                <MessageSquare className="h-4 w-4" /> Start Chat Interview
              </GradientButton>
            </Link>
          </div>
        </div>

        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Score progress
              </div>
              <div className="mt-1 text-lg font-semibold">Recent completed sessions</div>
            </div>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 h-32">
            {scores.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                No completed scores yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.02 285)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="oklch(0.72 0.22 320)"
                    strokeWidth={2}
                    fill="oklch(0.72 0.22 320 / 0.18)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 dashboard-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Recent interviews</div>
            <div className="text-xs text-muted-foreground">
              Your latest sessions with Officer Charles
            </div>
          </div>
          <Link to="/user/history" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        <InterviewTable items={interviewItems} loading={interviews.isLoading} />
      </div>
    </>
  );
}

function InterviewTable({ items, loading }: { items: InterviewSummary[]; loading: boolean }) {
  if (loading) return <State text="Loading interviews..." />;
  if (items.length === 0)
    return <State text="No interviews yet. Start a chat or live session to see it here." />;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-widest text-muted-foreground">
            {["Date", "Visa", "Mode", "Type", "Score", "Status", "Action"].map((h) => (
              <th key={h} className="pb-3 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-3">{formatDate(item.startedAt || item.createdAt)}</td>
              <td className="py-3">{item.visaType}</td>
              <td className="py-3">{item.mode}</td>
              <td className="py-3">{item.interviewType}</td>
              <td className="py-3">{item.finalScore ?? "—"}</td>
              <td className="py-3">{item.status}</td>
              <td className="py-3 text-right">
                <Link
                  to="/user/evaluation/$id"
                  params={{ id: item.id }}
                  className="text-xs text-primary hover:underline"
                >
                  View evaluation
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function State({ text }: { text: string }) {
  return <SmartNotice text={text} tone={/loading|no interviews/i.test(text) ? "info" : "auto"} />;
}
