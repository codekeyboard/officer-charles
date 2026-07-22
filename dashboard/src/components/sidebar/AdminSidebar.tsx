import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CreditCard,
  Wallet,
  TrendingUp,
  Settings,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { SidebarItem } from "./SidebarItem";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/interviews", label: "Interviews", icon: ClipboardList },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/payments", label: "Payments", icon: Wallet },
  { to: "/admin/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const { logout } = useAuthStore();
  const nav = useNavigate();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[260px] flex-col border-r border-white/5 bg-sidebar/80 backdrop-blur-xl">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <Logo />
      </div>
      <div className="mx-4 mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
          Admin Console
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">Full platform control</div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((i) => (
          <SidebarItem key={i.to} {...i} />
        ))}
      </nav>
      <div className="mt-2 space-y-1 px-3 pb-4">
        <button
          onClick={() => void logout().then(() => nav({ to: "/login" }))}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
