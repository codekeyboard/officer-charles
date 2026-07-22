import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CreditCard, MessageSquare, Target, Trophy, Video } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SmartNotice } from "@/components/common/SmartNotice";
import { userService } from "@/services/user.service";
import { errorMessage } from "@/services/api";
import type { InterviewSummary, UsageSummary } from "@/services/types";

export const Route = createFileRoute("/user/usage")({
  head: () => ({ meta: [{ title: "Usage · Officer Charles" }] }),
  component: Usage,
});

function Usage() {
  const usage = useQuery({ queryKey: ["usage"], queryFn: userService.getUsage });
  const interviews = useQuery({
    queryKey: ["interviews", "usage"],
    queryFn: () => userService.getInterviews({ limit: 100 }),
  });
  const interviewItems = interviews.data?.items || [];
  const analytics = buildUsageAnalytics(interviewItems, usage.data);
  const weekly = groupByWeek(interviewItems);

  return (
    <>
      <Topbar title="Usage" />
      <PageHeader title="Usage" subtitle="Backend-tracked credits and interview usage" />
      {(usage.isError || interviews.isError) && (
        <State text={errorMessage(usage.error || interviews.error)} />
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Credits"
          value={analytics.availableCredits}
          hint="Available balance"
          icon={CreditCard}
          accent
        />
        <StatCard
          label="Credits Spent"
          value={analytics.creditsSpent}
          hint="Consumed by interviews"
          icon={BarChart3}
        />
        <StatCard
          label="Chat Interviews"
          value={analytics.chat}
          hint={`${analytics.chatTraining} training · ${analytics.chatSimulation} real`}
          icon={MessageSquare}
        />
        <StatCard
          label="Live Interviews"
          value={analytics.live}
          hint={`${analytics.liveTraining} training · ${analytics.liveSimulation} real`}
          icon={Video}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed"
          value={analytics.completed}
          hint={`${analytics.inProgress} in progress`}
          icon={Trophy}
        />
        <StatCard
          label="Average Score"
          value={analytics.averageScore}
          hint={`${analytics.scored} scored sessions`}
          icon={Target}
        />
        <StatCard
          label="Training"
          value={analytics.training}
          hint="Practice-mode sessions"
          icon={MessageSquare}
        />
        <StatCard
          label="Real Simulation"
          value={analytics.simulation}
          hint="Exam-style sessions"
          icon={Target}
        />
      </div>
      <div className="mt-6 dashboard-card p-5">
        <div className="text-sm font-semibold">Interviews by week</div>
        <div className="mt-4 h-64">
          {weekly.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No interview usage yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.02 285)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="chat" fill="oklch(0.68 0.15 200)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="live" fill="oklch(0.72 0.17 165)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}

function buildUsageAnalytics(items: InterviewSummary[], usage?: UsageSummary) {
  const completedItems = items.filter((item) => normalizeStatus(item.status) === "COMPLETED");
  const scoredItems = completedItems.filter((item) => typeof item.finalScore === "number");
  const scoreTotal = scoredItems.reduce((sum, item) => sum + Number(item.finalScore || 0), 0);
  const chatItems = items.filter((item) => item.interviewType === "CHAT");
  const liveItems = items.filter((item) => item.interviewType === "LIVE");
  const trainingItems = items.filter((item) => normalizeMode(item.mode) === "TRAINING");
  const simulationItems = items.filter((item) => normalizeMode(item.mode) === "SIMULATION");

  return {
    availableCredits: usage?.subscription.availableCredits ?? "—",
    creditsSpent: usage?.subscription.lifetimeUsedCredits ?? 0,
    chat: chatItems.length,
    live: liveItems.length,
    chatTraining: chatItems.filter((item) => normalizeMode(item.mode) === "TRAINING").length,
    chatSimulation: chatItems.filter((item) => normalizeMode(item.mode) === "SIMULATION").length,
    liveTraining: liveItems.filter((item) => normalizeMode(item.mode) === "TRAINING").length,
    liveSimulation: liveItems.filter((item) => normalizeMode(item.mode) === "SIMULATION").length,
    completed: completedItems.length,
    inProgress: items.filter((item) => normalizeStatus(item.status) !== "COMPLETED").length,
    averageScore: scoredItems.length > 0 ? Math.round(scoreTotal / scoredItems.length) : "—",
    scored: scoredItems.length,
    training: trainingItems.length,
    simulation: simulationItems.length,
  };
}

function normalizeStatus(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeMode(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function groupByWeek(items: InterviewSummary[]) {
  const rows = new Map<string, { week: string; chat: number; live: number }>();
  for (const item of items) {
    const rawDate = item.startedAt || item.createdAt || null;
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const key = `${date.getFullYear()}-W${Math.ceil((date.getDate() + 6) / 7)}`;
    const row = rows.get(key) || { week: key, chat: 0, live: 0 };
    if (item.interviewType === "CHAT") row.chat += 1;
    if (item.interviewType === "LIVE") row.live += 1;
    rows.set(key, row);
  }
  return [...rows.values()].slice(-8);
}

function State({ text }: { text: string }) {
  return <SmartNotice text={text} tone={/loading/i.test(text) ? "info" : "auto"} />;
}
