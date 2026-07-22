import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Sun, User } from "lucide-react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { GradientButton } from "@/components/common/GradientButton";
import { useThemeStore } from "@/store/themeStore";

export const Route = createFileRoute("/user/settings")({
  head: () => ({ meta: [{ title: "Settings · Officer Charles" }] }),
  component: Settings,
});

function Settings() {
  const { theme, setTheme } = useThemeStore();
  return (
    <>
      <Topbar title="Settings" />
      <PageHeader title="Settings" subtitle="Customize local app preferences" />
      <div className="mt-6 grid gap-3">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">Appearance</div>
              <div className="mt-0.5 text-xs text-muted-foreground">This preference is stored in your browser.</div>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border bg-background/60 p-1">
              <button onClick={() => setTheme("light")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${theme === "light" ? "purple-gradient text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Sun className="h-3.5 w-3.5" /> Light
              </button>
              <button onClick={() => setTheme("dark")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${theme === "dark" ? "purple-gradient text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Moon className="h-3.5 w-3.5" /> Dark
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Account settings</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Profile and password changes are saved through the backend.</div>
            </div>
            <Link to="/user/profile">
              <GradientButton variant="outline"><User className="h-4 w-4" /> Open profile</GradientButton>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
