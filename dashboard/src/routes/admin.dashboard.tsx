import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Users, CreditCard, DollarSign, MessageSquare, Video, Cpu, Wallet } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin · Officer Charles" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const dashboard = useQuery({ queryKey: ["admin-dashboard"], queryFn: adminService.getDashboard });
  const revenue = useQuery({ queryKey: ["admin-revenue"], queryFn: adminService.getRevenue });
  const aiUsage = useQuery({ queryKey: ["admin-ai-usage"], queryFn: adminService.getAIUsage });
  const users = useQuery({ queryKey: ["admin-users", "recent"], queryFn: () => adminService.getUsers({ limit: 6 }) });
  const data = dashboard.data;

  return (
    <>
      <Topbar title="Admin Dashboard" />
      <PageHeader title="Platform Overview" subtitle="Officer Charles administrative console" />
      {(dashboard.isError || revenue.isError || aiUsage.isError || users.isError) && (
        <State text={errorMessage(dashboard.error || revenue.error || aiUsage.error || users.error)} />
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={data?.totalUsers ?? "—"} icon={Users} accent />
        <StatCard label="Active Subscribers" value={data?.activeSubscriptions ?? "—"} icon={CreditCard} />
        <StatCard label="Total Revenue" value={`$${Number(data?.totalRevenue || 0).toFixed(2)}`} icon={DollarSign} />
        <StatCard label="Input Tokens" value={data?.aiUsage?.inputTokens ?? 0} icon={Cpu} />
        <StatCard label="Chat Interviews" value={data?.chatInterviews ?? 0} icon={MessageSquare} />
        <StatCard label="Live Interviews" value={data?.liveInterviews ?? 0} icon={Video} />
        <StatCard label="Completed" value={data?.completedInterviews ?? 0} icon={Wallet} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue by month">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue.data?.byMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#A855F7" strokeWidth={2} fill="#A855F733" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="AI usage by model">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aiUsage.data?.byModel || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="model" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="inputTokens" fill="#D946EF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 dashboard-card p-5 overflow-x-auto">
        <div className="text-sm font-semibold">Recent users</div>
        <table className="mt-4 w-full min-w-[400px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-muted-foreground">
              {["Name", "Email", "Role", "Status"].map((header) => <th key={header} className="pb-3 text-left font-medium">{header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.data?.items.map((user) => (
              <tr key={user.id}>
                <td className="py-2.5">{user.name}</td>
                <td className="py-2.5">{user.email}</td>
                <td className="py-2.5">{user.role}</td>
                <td className="py-2.5">{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const tooltipStyle = { background: "oklch(0.18 0.02 285)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 };

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="dashboard-card p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
