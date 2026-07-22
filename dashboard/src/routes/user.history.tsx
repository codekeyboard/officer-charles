import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { SmartNotice } from "@/components/common/SmartNotice";
import { interviewService } from "@/services/interview.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/user/history")({
  head: () => ({ meta: [{ title: "Interview History · Officer Charles" }] }),
  component: History,
});

function History() {
  const interviews = useQuery({ queryKey: ["interviews", "all"], queryFn: () => interviewService.listInterviews({ limit: 50 }) });
  return (
    <>
      <Topbar title="Interview History" />
      <PageHeader title="Interview History" subtitle="All your past sessions with Officer Charles" />
      {interviews.isLoading && <State text="Loading interview history..." />}
      {interviews.isError && <State text={errorMessage(interviews.error)} />}
      {interviews.data?.items.length === 0 && <State text="No interviews yet." />}
      {Boolean(interviews.data?.items.length) && (
        <div className="mt-6 dashboard-card p-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                {["Date", "Visa", "Mode", "Type", "Score", "Status", "Action"].map((h) => (
                  <th key={h} className="pb-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {interviews.data?.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3">{item.startedAt ? new Date(item.startedAt).toLocaleDateString() : "—"}</td>
                  <td className="py-3">{item.visaType}</td>
                  <td className="py-3">{item.mode}</td>
                  <td className="py-3">{item.interviewType}</td>
                  <td className="py-3 font-semibold text-primary">{item.finalScore ?? "—"}</td>
                  <td className="py-3">{item.status}</td>
                  <td className="py-3">
                    <Link to="/user/evaluation/$id" params={{ id: item.id }} className="text-xs text-primary hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function State({ text }: { text: string }) {
  return <SmartNotice text={text} tone={/loading|no interviews/i.test(text) ? "info" : "auto"} className="mt-6" />;
}
