import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin Settings" }] }),
  component: Settings,
});

function Settings() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: adminService.getSettings });
  const [form, setForm] = useState({
    trainingMaxRetries: 3,
    trainingMaxQuestions: 8,
    simulationMaxQuestions: 10,
    enableVoiceLive: false,
    freeChatTrainingLimit: 3,
    freeChatSimulationLimit: 1,
    freeLiveTrainingLimit: 1,
    freeLiveSimulationLimit: 1,
    chatTrainingCreditCost: 5,
    chatSimulationCreditCost: 10,
    liveTrainingCreditCost: 15,
    liveSimulationCreditCost: 25,
    storyBuilderCreditCost: 10,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (settings.data) {
      setForm({
        trainingMaxRetries: Number(settings.data.trainingMaxRetries ?? 3),
        trainingMaxQuestions: Number(settings.data.trainingMaxQuestions ?? 8),
        simulationMaxQuestions: Number(settings.data.simulationMaxQuestions ?? 10),
        enableVoiceLive: Boolean(settings.data.enableVoiceLive),
        freeChatTrainingLimit: Number(settings.data.freeChatTrainingLimit ?? 3),
        freeChatSimulationLimit: Number(settings.data.freeChatSimulationLimit ?? 1),
        freeLiveTrainingLimit: Number(settings.data.freeLiveTrainingLimit ?? 1),
        freeLiveSimulationLimit: Number(settings.data.freeLiveSimulationLimit ?? 1),
        chatTrainingCreditCost: Number(settings.data.chatTrainingCreditCost ?? 5),
        chatSimulationCreditCost: Number(settings.data.chatSimulationCreditCost ?? 10),
        liveTrainingCreditCost: Number(settings.data.liveTrainingCreditCost ?? 15),
        liveSimulationCreditCost: Number(settings.data.liveSimulationCreditCost ?? 25),
        storyBuilderCreditCost: Number(settings.data.storyBuilderCreditCost ?? 10),
      });
    }
  }, [settings.data]);

  const update = useMutation({
    mutationFn: adminService.updateSettings,
    onSuccess: () => {
      setMessage("Settings updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    update.mutate(form);
  }

  return (
    <>
      <Topbar title="Admin Settings" />
      <PageHeader title="Platform Settings" subtitle="Interview and voice feature defaults" />
      {settings.isError && <State text={errorMessage(settings.error)} />}
      {message && <State text={message} />}
      <form onSubmit={submit} className="mt-6 dashboard-card p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <NumberField label="Training max retries" value={form.trainingMaxRetries} onChange={(value) => setForm({ ...form, trainingMaxRetries: value })} />
          <NumberField label="Training max questions" value={form.trainingMaxQuestions} onChange={(value) => setForm({ ...form, trainingMaxQuestions: value })} />
          <NumberField label="Simulation max questions" value={form.simulationMaxQuestions} onChange={(value) => setForm({ ...form, simulationMaxQuestions: value })} />
          <NumberField label="Free chat training interviews" value={form.freeChatTrainingLimit} onChange={(value) => setForm({ ...form, freeChatTrainingLimit: value })} />
          <NumberField label="Free chat real interviews" value={form.freeChatSimulationLimit} onChange={(value) => setForm({ ...form, freeChatSimulationLimit: value })} />
          <NumberField label="Free voice training interviews" value={form.freeLiveTrainingLimit} onChange={(value) => setForm({ ...form, freeLiveTrainingLimit: value })} />
          <NumberField label="Free voice real interviews" value={form.freeLiveSimulationLimit} onChange={(value) => setForm({ ...form, freeLiveSimulationLimit: value })} />
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Enable Live Voice</span>
            <select value={String(form.enableVoiceLive)} onChange={(event) => setForm({ ...form, enableVoiceLive: event.target.value === "true" })} className="theme-select mt-1.5 h-9 text-sm">
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </label>
        </div>
        <div className="mt-7 border-t border-border pt-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Credit usage per action</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These values control how many credits are charged when users start interviews or generate a story.
            </p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <NumberField min={1} label="Chat training credits" value={form.chatTrainingCreditCost} onChange={(value) => setForm({ ...form, chatTrainingCreditCost: value })} />
            <NumberField min={1} label="Chat real simulation credits" value={form.chatSimulationCreditCost} onChange={(value) => setForm({ ...form, chatSimulationCreditCost: value })} />
            <NumberField min={1} label="Live training credits" value={form.liveTrainingCreditCost} onChange={(value) => setForm({ ...form, liveTrainingCreditCost: value })} />
            <NumberField min={1} label="Live real simulation credits" value={form.liveSimulationCreditCost} onChange={(value) => setForm({ ...form, liveSimulationCreditCost: value })} />
            <NumberField min={1} label="Story Builder credits" value={form.storyBuilderCreditCost} onChange={(value) => setForm({ ...form, storyBuilderCreditCost: value })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <GradientButton disabled={update.isPending}>{update.isPending ? "Saving..." : "Save settings"}</GradientButton>
        </div>
      </form>
    </>
  );
}

function NumberField({ label, value, min = 0, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value))} className="theme-field mt-1.5 h-9 text-sm" />
    </label>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
