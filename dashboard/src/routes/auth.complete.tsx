import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/auth/complete")({
  component: AuthComplete,
});

function dashboardPath(role?: string) {
  return role === "admin" || role === "development" ? "/admin/dashboard" : "/user/dashboard";
}

function AuthComplete() {
  const navigate = useNavigate();
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    let mounted = true;

    hydrate().then((user) => {
      if (!mounted) return;

      if (user) {
        void navigate({ to: dashboardPath(user.role), replace: true });
        return;
      }

      void navigate({ to: "/login", replace: true });
    });

    return () => {
      mounted = false;
    };
  }, [hydrate, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Finishing sign-in...</p>
        <p className="text-xs text-muted-foreground">You will be redirected automatically.</p>
      </div>
    </main>
  );
}
