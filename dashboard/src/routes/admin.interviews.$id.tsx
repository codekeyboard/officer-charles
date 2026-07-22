import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/interviews/$id")({
  head: () => ({ meta: [{ title: "Interview Detail · Admin" }] }),
  component: InterviewDetail,
});

function InterviewDetail() {
  const { id } = Route.useParams();
  const detail = useQuery({ queryKey: ["admin-interview", id], queryFn: () => adminService.getInterviewDetails(id) });
  const interview = detail.data?.interview;

  return (
    <>
      <Topbar title="Interview Detail" />
      <PageHeader
        title={interview ? `${interview.interviewType} · ${interview.visaType}` : "Interview"}
        subtitle={interview ? `${interview.mode} · ${interview.status}` : id}
        actions={<Link to="/admin/interviews"><GradientButton variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</GradientButton></Link>}
      />
      {detail.isLoading && <State text="Loading interview..." />}
      {detail.isError && <State text={errorMessage(detail.error)} />}
      {detail.data && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="dashboard-card p-5">
            <div className="text-sm font-semibold">Messages</div>
            <div className="mt-4 space-y-3">
              {detail.data.messages?.length === 0 && <div className="text-sm text-muted-foreground">No messages stored.</div>}
              {detail.data.messages?.map((message: any) => (
                <div key={message.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{message.role}</div>
                  <div className="mt-1">{message.content}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="dashboard-card p-5">
              <div className="text-sm font-semibold">Evaluation</div>
              <div className="mt-3 text-4xl font-semibold text-gradient">{interview?.finalScore ?? "—"}</div>
              <div className="mt-1 text-xs text-muted-foreground">{interview?.finalFeedback || "No final feedback recorded."}</div>
            </div>
            <Payload title="Transcripts" items={detail.data.transcripts || []} />
            <Payload title="Usage logs" items={detail.data.usageLogs || []} />
          </div>
        </div>
      )}
    </>
  );
}

function Payload({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="dashboard-card p-5">
      <div className="text-sm font-semibold">{title}</div>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(items, null, 2)}</pre>
    </div>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
