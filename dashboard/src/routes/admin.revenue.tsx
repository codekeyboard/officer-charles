import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { DollarSign, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/revenue")({
  head: () => ({ meta: [{ title: "Revenue · Admin" }] }),
  component: Revenue,
});

function Revenue() {
  const revenue = useQuery({ queryKey: ["admin-revenue"], queryFn: adminService.getRevenue });
  return (
    <>
      <Topbar title="Revenue" />
      <PageHeader title="Revenue Analytics" subtitle="Successful payment revenue from backend records" />
      {revenue.isError && <State text={errorMessage(revenue.error)} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Revenue" value={`$${Number(revenue.data?.totalRevenue || 0).toFixed(2)}`} icon={DollarSign} accent />
        <StatCard label="MRR" value={`$${Number(revenue.data?.mrr || 0).toFixed(2)}`} icon={TrendingUp} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Chart title="Revenue by month">
          <AreaChart data={revenue.data?.byMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="revenue" stroke="#A855F7" strokeWidth={2} fill="#A855F733" />
          </AreaChart>
        </Chart>
        <Chart title="Plan distribution">
          <BarChart data={revenue.data?.planDistribution || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="plan" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="activeSubscriptions" fill="#D946EF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>
      </div>
    </>
  );
}

const tooltipStyle = { background: "oklch(0.18 0.02 285)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 };

function Chart({ title, children }: { title: string; children: ReactElement }) {
  return (
    <div className="dashboard-card p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
