import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({ meta: [{ title: "User Detail · Admin" }] }),
  component: UserDetail,
});

function UserDetail() {
  const { id } = Route.useParams();
  const detail = useQuery({ queryKey: ["admin-user", id], queryFn: () => adminService.getUserDetails(id) });
  const profile = detail.data?.profile;
  const interviews = detail.data?.interviews?.items || [];

  return (
    <>
      <Topbar title="User Detail" />
      <PageHeader
        title={profile?.name || "User"}
        subtitle={profile?.email || id}
        actions={<Link to="/admin/users"><GradientButton variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</GradientButton></Link>}
      />
      {detail.isLoading && <State text="Loading user..." />}
      {detail.isError && <State text={errorMessage(detail.error)} />}
      {detail.data && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="dashboard-card p-5">
            <div className="text-sm font-semibold">Profile</div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Role" value={profile?.role} />
              <Row label="Status" value={profile?.status} />
              <Row label="Country" value={profile?.country} />
              <Row label="Target visa" value={profile?.targetVisa} />
            </dl>
          </div>
          <div className="dashboard-card p-5">
            <div className="text-sm font-semibold">Usage</div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Chat used" value={detail.data.usage?.chatInterviewsUsed ?? detail.data.usage?.chat_interviews_used} />
              <Row label="Live used" value={detail.data.usage?.liveInterviewsUsed ?? detail.data.usage?.live_interviews_used} />
            </dl>
          </div>
          <div className="dashboard-card p-5">
            <div className="text-sm font-semibold">Subscription</div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Status" value={detail.data.subscription?.status || "none"} />
              <Row label="Plan" value={detail.data.subscription?.plan?.name || detail.data.subscription?.planId || "—"} />
            </dl>
          </div>
          <div className="dashboard-card p-5 lg:col-span-3">
            <div className="text-sm font-semibold">Recent interviews</div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {interviews.length === 0 && <div>No interviews found.</div>}
              {interviews.map((item: any) => (
                <Link key={item.id} to="/admin/interviews/$id" params={{ id: item.id }} className="block rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                  {item.interviewType} · {item.visaType} · {item.status}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{String(value ?? "—")}</dd>
    </div>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
