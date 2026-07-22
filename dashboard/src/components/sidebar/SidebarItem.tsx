import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarItem({
  to,
  icon: Icon,
  label,
  exact,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "sidebar-active"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-white" : "")} />
      <span className="truncate">{label}</span>
      {active && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white/90 shadow" />
      )}
    </Link>
  );
}