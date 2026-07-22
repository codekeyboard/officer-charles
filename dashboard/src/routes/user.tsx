import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { UserSidebar } from "@/components/sidebar/UserSidebar";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/user")({
  component: UserLayout,
});

function UserLayout() {
  const nav = useNavigate();
  const { user, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) void nav({ to: "/login", replace: true });
  }, [hasHydrated, nav, user]);

  if (!hasHydrated) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading session...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <UserSidebar />
      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
