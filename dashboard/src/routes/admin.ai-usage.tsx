import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Cpu, Mic, MessageSquare } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/ai-usage")({
  head: () => ({ meta: [{ title: "AI Usage · Admin" }] }),
  component: AIUsage,
});

function AIUsage() {
  const usage = useQuery({ queryKey: ["admin-ai-usage"], queryFn: adminService.getAIUsage });
  return (
    <>
      <Topbar title="AI Usage" />
      <PageHeader title="AI Usage" subtitle="Token and audio usage from backend logs" />
      {usage.isError && <State text={errorMessage(usage.error)} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Input Tokens" value={usage.data?.inputTokens ?? 0} icon={MessageSquare} accent />
        <StatCard label="Output Tokens" value={usage.data?.outputTokens ?? 0} icon={Cpu} />
        <StatCard label="Audio Seconds" value={usage.data?.audioSeconds ?? 0} icon={Mic} />
      </div>
      <div className="mt-6 dashboard-card p-5">
        <div className="text-sm font-semibold">Usage by model</div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usage.data?.byModel || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="model" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.02 285)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="inputTokens" fill="#D946EF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outputTokens" fill="#60A5FA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
