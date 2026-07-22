import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";
import type { AdminUserRef, Payment, Subscription } from "@/services/types";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions · Admin" }] }),
  component: Subscriptions,
});

function Subscriptions() {
  const query = useQuery({ queryKey: ["admin-subscriptions"], queryFn: adminService.getSubscriptions });
  const subscriptions = query.data?.subscriptions || [];
  const payments = query.data?.payments || [];
  const paidPurchases = payments.filter((payment) => payment.status === "paid");
  return (
    <>
      <Topbar title="Subscriptions" />
      <PageHeader title="Subscriptions" subtitle={`${subscriptions.length} subscriptions • ${payments.length} purchase records`} />
      {query.isError && <State text={errorMessage(query.error)} />}
      {query.isLoading && <State text="Loading subscriptions..." />}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="Subscription rows" value={subscriptions.length} />
        <Metric label="Paid purchases" value={paidPurchases.length} />
        <Metric label="Purchase history" value={payments.length} />
      </div>

      <div className="mt-6">
        <SectionTitle title="Active subscriptions" />
        {subscriptions.length === 0 && <State text="No active subscription records yet. Paid credit purchases are shown in the history below." />}
        <DataTable
          rows={subscriptions}
          columns={[
            { key: "user", label: "User", render: (item) => <UserCell user={item.user} fallbackId={item.userId} /> },
            { key: "plan", label: "Plan", render: (item) => item.plan?.name || item.planKey || item.planId || "-" },
            { key: "status", label: "Status", render: (item) => <StatusBadge status={item.status} /> },
            { key: "period", label: "Period", render: subscriptionPeriod },
            { key: "chatRemaining", label: "Chat", render: (item) => formatNumber(item.chatRemaining) },
            { key: "liveRemaining", label: "Live", render: (item) => formatNumber(item.liveRemaining) },
          ]}
        />
      </div>

      <div className="mt-6">
        <SectionTitle title="Purchase history" />
        {payments.length === 0 && <State text="No payment or credit purchase history has been recorded yet." />}
        <DataTable
          rows={payments}
          columns={[
            { key: "user", label: "User", render: (item) => <UserCell user={item.user} fallbackId={item.userId} /> },
            { key: "plan", label: "Plan", render: (item) => item.plan?.name || item.planName || item.planKey || item.planId || "-" },
            { key: "provider", label: "Provider", render: (item) => titleCase(item.provider) },
            { key: "amount", label: "Amount", render: formatPaymentAmount },
            { key: "status", label: "Status", render: (item) => <StatusBadge status={item.status} /> },
            { key: "paidAt", label: "Paid", render: (item) => formatDate(item.paidAt) },
            { key: "createdAt", label: "Created", render: (item) => formatDate(item.createdAt) },
            { key: "reference", label: "Reference", render: paymentReference },
          ]}
        />
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="dashboard-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>;
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}

function UserCell({ user, fallbackId }: { user?: AdminUserRef | null; fallbackId?: string }) {
  if (user?.email || user?.name) {
    return (
      <div>
        <div className="font-medium text-foreground">{user.name || "Unnamed user"}</div>
        {user.email && <div className="mt-1 text-xs text-muted-foreground">{user.email}</div>}
      </div>
    );
  }

  return <span className="font-mono text-xs text-muted-foreground">{fallbackId || "-"}</span>;
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = String(status || "unknown").toLowerCase();
  const className = normalized === "paid" || normalized === "active"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : normalized === "pending" || normalized === "trialing"
      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
      : "border-white/10 bg-white/5 text-muted-foreground";

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${className}`}>{titleCase(normalized)}</span>;
}

function subscriptionPeriod(item: Subscription) {
  const start = formatDate(item.currentPeriodStart);
  const end = formatDate(item.currentPeriodEnd);
  if (start === "-" && end === "-") return "-";
  return `${start} - ${end}`;
}

function paymentReference(item: Payment) {
  return item.paystackReference || item.stripeCheckoutSessionId || item.stripePaymentIntentId || item.stripeInvoiceId || "-";
}

function formatPaymentAmount(item: Payment) {
  const cents = Number(item.amountCents || 0);
  const amount = cents > 0 ? cents / 100 : Number(item.amount || 0);
  const currency = String(item.currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatNumber(value?: number) {
  return Number(value || 0).toLocaleString();
}

function titleCase(value?: string) {
  return String(value || "-").replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
