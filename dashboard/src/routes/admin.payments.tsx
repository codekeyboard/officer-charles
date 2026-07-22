import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments · Admin" }] }),
  component: Payments,
});

function Payments() {
  const payments = useQuery({ queryKey: ["admin-payments"], queryFn: adminService.getPayments });
  return (
    <>
      <Topbar title="Payments" />
      <PageHeader title="Payments" subtitle={`${payments.data?.payments.length ?? 0} records`} />
      {payments.isError && <State text={errorMessage(payments.error)} />}
      {payments.isLoading && <State text="Loading payments..." />}
      <div className="mt-6">
        <DataTable
          rows={payments.data?.payments || []}
          columns={[
            { key: "userId", label: "User" },
            { key: "provider", label: "Provider" },
            { key: "amount", label: "Amount", render: (item) => `$${Number(item.amount).toFixed(2)}` },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Date", render: (item) => item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—" },
          ]}
        />
      </div>
    </>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
