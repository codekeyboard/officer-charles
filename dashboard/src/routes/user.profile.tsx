import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { SmartNotice } from "@/components/common/SmartNotice";
import { userService } from "@/services/user.service";
import { errorMessage } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/user/profile")({
  head: () => ({ meta: [{ title: "Profile · Officer Charles" }] }),
  component: Profile,
});

function Profile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const profile = useQuery({ queryKey: ["profile"], queryFn: userService.getProfile });
  const [form, setForm] = useState({ name: "", country: "" });
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile.data) {
      setForm({
        name: profile.data.name || "",
        country: profile.data.country || "",
      });
    }
  }, [profile.data]);

  const updateProfile = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: (data) => {
      setUser(data);
      queryClient.setQueryData(["profile"], data);
      setMessage("Profile updated.");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const changePassword = useMutation({
    mutationFn: userService.changePassword,
    onSuccess: () => {
      setPasswords({ oldPassword: "", newPassword: "" });
      setMessage("Password updated.");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    updateProfile.mutate(form);
  }

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    changePassword.mutate(passwords);
  }

  return (
    <>
      <Topbar title="Profile" />
      <PageHeader title="Your Profile" subtitle="Manage your account and interview preferences" />
      {message && <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{message}</div>}
      {profile.isLoading && <State text="Loading profile..." />}
      {profile.isError && <State text={errorMessage(profile.error)} />}

      <form onSubmit={submitProfile} className="mt-6 dashboard-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} /></Field>
          <Field label="Email"><input value={profile.data?.email || ""} type="email" disabled className={`${fieldClass} opacity-70`} /></Field>
          <Field label="Country"><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={fieldClass} /></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <GradientButton disabled={updateProfile.isPending}>{updateProfile.isPending ? "Updating..." : "Update profile"}</GradientButton>
        </div>
      </form>

      <form onSubmit={submitPassword} className="mt-6 dashboard-card p-6">
        <div className="text-sm font-semibold">Change password</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Current password"><input value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} type="password" className={fieldClass} /></Field>
          <Field label="New password"><input value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} type="password" minLength={8} className={fieldClass} /></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <GradientButton variant="outline" disabled={changePassword.isPending}>{changePassword.isPending ? "Updating..." : "Update password"}</GradientButton>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const fieldClass = "theme-field h-10";

function State({ text }: { text: string }) {
  return <SmartNotice text={text} tone={/loading|updated|changed/i.test(text) ? "info" : "auto"} />;
}
