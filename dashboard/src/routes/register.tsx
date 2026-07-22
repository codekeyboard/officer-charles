import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BadgeCheck, Gift, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { GradientButton } from "@/components/common/GradientButton";
import { SmartNotice } from "@/components/common/SmartNotice";
import { useAuthStore } from "@/store/authStore";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account · Officer Charles" }] }),
  component: Register,
});

function Register() {
  const nav = useNavigate();
  const registerWithPassword = useAuthStore((s) => s.registerWithPassword);
  const verifyRegistration = useAuthStore((s) => s.verifyRegistration);
  const setUser = useAuthStore((s) => s.setUser);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [country, setCountry] = useState("");
  const [targetVisa, setTargetVisa] = useState("F1");
  const [verificationSent, setVerificationSent] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!verificationSent || resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds, verificationSent]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await registerWithPassword({ name, email, password });
      setVerificationSent(result.verificationRequired);
      setExpiresInMinutes(result.expiresInMinutes);
      setResendSeconds(60);
      setDevCode(result.devCode || "");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await verifyRegistration(email, code);
      const profile = await userService.updateProfile({ name, country, targetVisa });
      setUser(profile);
      await nav({ to: "/user/dashboard", replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function resendCode() {
    if (resendSeconds > 0 || isResending) return;
    setError("");
    setIsResending(true);
    try {
      const result = await authService.resendRegistrationCode({ email });
      setExpiresInMinutes(result.expiresInMinutes);
      setResendSeconds(60);
      setDevCode(result.devCode || "");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden bg-[linear-gradient(135deg,oklch(0.24_0.08_285),oklch(0.14_0.03_250))]">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-between p-10 text-white">
          <Logo variant="light" size="lg" />
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              <Gift className="h-3.5 w-3.5" /> Start with 20 free credits
            </div>
            <div className="text-4xl font-semibold leading-tight">Build your visa interview confidence.</div>
            <p className="mt-3 max-w-md text-white/80">Create your account, pick your visa type, and start practicing with Officer Charles.</p>
          </div>
          <div className="grid gap-3 text-sm text-white/80">
            <Feature icon={ShieldCheck} text="Secure account and saved history" />
            <Feature icon={BadgeCheck} text="Training and simulation modes" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md dashboard-card p-7 sm:p-8">
          <div className="mb-7 rounded-2xl border border-border bg-background/60 p-4 shadow-sm">
            <Logo size="lg" />
          </div>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              {verificationSent ? <BadgeCheck className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{verificationSent ? "Verify your email" : "Create your account"}</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {verificationSent
                  ? `Enter the one-time code sent to ${email}. It expires in ${expiresInMinutes} minutes.`
                  : "Start with 20 free credits for Officer Charles practice."}
              </p>
            </div>
          </div>
          {!verificationSent ? (
            <>
              <form className="mt-6 space-y-4" onSubmit={submit}>
                <Field label="Full name">
                  <input value={name} onChange={(e) => setName(e.target.value)} required className="auth-input" />
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="auth-input" />
                </Field>
                <Field label="Password">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="auth-input" />
                </Field>
                <Field label="Country">
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className="auth-input" />
                </Field>
                <Field label="Target visa">
                  <select value={targetVisa} onChange={(e) => setTargetVisa(e.target.value)} className="auth-input">
                    <option value="F1">F1 - Student</option>
                    <option value="B1_B2">B1/B2 - Tourist / Business</option>
                  </select>
                </Field>
                {error && <SmartNotice text={error} className="mt-0" />}
                <GradientButton className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? "Sending code..." : "Create account"}
                </GradientButton>
              </form>
              <AuthDivider />
              <GoogleButton onClick={() => { window.location.href = authService.googleUrl(); }} />
            </>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={verify}>
              <Field label="One-time code">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className="auth-input text-center text-2xl tracking-[0.4em]"
                />
              </Field>
              {devCode && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                  Development code: {devCode}
                </div>
              )}
              {error && <SmartNotice text={error} className="mt-0" />}
              <GradientButton className="w-full" size="lg" disabled={isLoading || code.length !== 6}>
                {isLoading ? "Verifying..." : "Verify and continue"}
              </GradientButton>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                  disabled={resendSeconds > 0 || isResending}
                  onClick={resendCode}
                >
                  {isResending
                    ? "Sending..."
                    : resendSeconds > 0
                      ? `Resend in ${formatTimer(resendSeconds)}`
                      : "Resend code"}
                </button>
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setVerificationSent(false); setResendSeconds(0); }}>
                  Edit details
                </button>
              </div>
            </form>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
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
