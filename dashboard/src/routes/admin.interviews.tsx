import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/interviews")({
  head: () => ({ meta: [{ title: "Interviews · Admin" }] }),
  component: AdminInterviews,
});

function AdminInterviews() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const interviews = useQuery({ queryKey: ["admin-interviews"], queryFn: () => adminService.getInterviews({ limit: 50 }) });

  if (pathname !== "/admin/interviews") {
    return <Outlet />;
  }

  return (
    <>
      <Topbar title="Interviews" />
      <PageHeader title="Interviews" subtitle={`${interviews.data?.total ?? 0} sessions`} />
      {interviews.isLoading && <State text="Loading interviews..." />}
      {interviews.isError && <State text={errorMessage(interviews.error)} />}
      <div className="mt-6">
        <DataTable
          rows={interviews.data?.items || []}
          columns={[
            { key: "startedAt", label: "Date", render: (item) => item.startedAt ? new Date(item.startedAt).toLocaleDateString() : "—" },
            { key: "visaType", label: "Visa" },
            { key: "mode", label: "Mode" },
            { key: "interviewType", label: "Type" },
            { key: "finalScore", label: "Score", render: (item) => item.finalScore ?? "—" },
            { key: "status", label: "Status" },
            { key: "actions", label: "", render: (item) => <Link to="/admin/interviews/$id" params={{ id: item.id }} className="text-xs text-primary hover:underline">View</Link> },
          ]}
        />
      </div>
    </>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
