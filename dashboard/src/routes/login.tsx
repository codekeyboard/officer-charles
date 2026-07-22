import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { GradientButton } from "@/components/common/GradientButton";
import { SmartNotice } from "@/components/common/SmartNotice";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Officer Charles" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const hydrate = useAuthStore((s) => s.hydrate);
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasHydrated && !isLoading) {
      void hydrate();
      return;
    }
    if (hasHydrated && user) {
      void nav({ to: dashboardPath(user.role), replace: true });
    }
  }, [hasHydrated, hydrate, isLoading, nav, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const user = await loginWithPassword(email, password);
      await nav({ to: dashboardPath(user.role), replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!hasHydrated || user) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking session...</div>;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden purple-gradient">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col justify-between p-10 text-white">
          <Logo variant="light" size="lg" />
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              <Sparkles className="h-3.5 w-3.5" /> 20 free credits after signup
            </div>
            <div className="text-4xl font-semibold leading-tight">Ace your U.S. visa interview.</div>
            <p className="mt-3 max-w-md text-white/80">Practice with Officer Charles through your secure backend account.</p>
          </div>
          <div className="text-xs font-medium uppercase tracking-widest text-white/70">AI Visa Interview</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="dashboard-card w-full max-w-md p-7 sm:p-8">
          <div className="mb-7 rounded-2xl border border-border bg-background/60 p-4 shadow-sm">
            <Logo size="lg" />
          </div>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Sign in to continue your interview prep.</p>
            </div>
          </div>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="auth-input" />
            </Field>
            <Field label="Password">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="auth-input" />
            </Field>
            {error && <SmartNotice text={error} className="mt-0" />}
            <GradientButton className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </GradientButton>
          </form>
          <AuthDivider />
          <GoogleButton onClick={() => { window.location.href = authService.googleUrl(); }} />
          <div className="mt-5 text-center text-sm text-muted-foreground">
            No account? <Link to="/register" className="text-primary hover:underline">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function dashboardPath(role: string) {
  return role === "admin" ? "/admin/dashboard" : "/user/dashboard";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background/70 px-4 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-white text-sm font-bold text-slate-900">G</span>
      Continue with Google
    </button>
  );
}
