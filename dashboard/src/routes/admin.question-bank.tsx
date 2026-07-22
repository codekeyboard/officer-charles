import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { DataTable } from "@/components/common/DataTable";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/question-bank")({
  head: () => ({ meta: [{ title: "Question Bank · Admin" }] }),
  component: QuestionBank,
});

function QuestionBank() {
  const queryClient = useQueryClient();
  const questions = useQuery({ queryKey: ["question-bank"], queryFn: adminService.getQuestionBank });
  const [form, setForm] = useState({ visaType: "F1", questionText: "", category: "", difficulty: "medium" });
  const [message, setMessage] = useState("");
  const create = useMutation({
    mutationFn: adminService.createQuestion,
    onSuccess: () => {
      setForm({ visaType: "F1", questionText: "", category: "", difficulty: "medium" });
      setMessage("Question created.");
      queryClient.invalidateQueries({ queryKey: ["question-bank"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });
  const disable = useMutation({
    mutationFn: adminService.deleteQuestion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["question-bank"] }),
    onError: (err) => setMessage(errorMessage(err)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(form);
  }

  return (
    <>
      <Topbar title="Question Bank" />
      <PageHeader title="Question Bank" subtitle="Manage B1/B2 and F1 interview questions" />
      {message && <State text={message} />}
      {questions.isError && <State text={errorMessage(questions.error)} />}
      <form onSubmit={submit} className="mt-6 dashboard-card p-5">
        <div className="grid gap-3 lg:grid-cols-[120px_1fr_180px_140px_auto]">
          <select value={form.visaType} onChange={(event) => setForm({ ...form, visaType: event.target.value })} className="auth-input">
            <option value="F1">F1</option>
            <option value="B1_B2">B1/B2</option>
          </select>
          <input value={form.questionText} onChange={(event) => setForm({ ...form, questionText: event.target.value })} placeholder="Question text" className="auth-input" />
          <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" className="auth-input" />
          <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className="auth-input">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <GradientButton disabled={create.isPending}><Plus className="h-4 w-4" /> Add</GradientButton>
        </div>
      </form>
      <div className="mt-6">
        <DataTable
          rows={questions.data?.questions || []}
          columns={[
            { key: "questionText", label: "Question" },
            { key: "visaType", label: "Visa" },
            { key: "category", label: "Category" },
            { key: "difficulty", label: "Difficulty" },
            { key: "isActive", label: "Status", render: (item) => item.isActive ? "Active" : "Disabled" },
            { key: "actions", label: "", render: (item) => (
              <GradientButton size="sm" variant="outline" disabled={disable.isPending || !item.isActive} onClick={() => disable.mutate(item.id)}>
                Disable
              </GradientButton>
            ) },
          ]}
        />
      </div>
    </>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
