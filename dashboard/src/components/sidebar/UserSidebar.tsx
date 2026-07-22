import {
  LayoutDashboard,
  MessageSquare,
  BookOpenText,
  Video,
  History,
  Gauge,
  CreditCard,
  User as UserIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/common/Logo";
import { SidebarItem } from "./SidebarItem";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "@tanstack/react-router";
import { billingService } from "@/services/billing.service";
import { getPackLabel } from "@/utils/billingLabels";

const items = [
  { to: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/user/story-builder", label: "Story Builder", icon: BookOpenText },
  { to: "/user/chat-interview", label: "Chat Interview", icon: MessageSquare },
  { to: "/user/live-interview", label: "Live Interview", icon: Video },
  { to: "/user/history", label: "Interview History", icon: History },
  { to: "/user/usage", label: "Usage", icon: Gauge },
  { to: "/user/billing", label: "Billing", icon: CreditCard },
  { to: "/user/profile", label: "Profile", icon: UserIcon },
  { to: "/user/settings", label: "Settings", icon: Settings },
];

export function UserSidebar() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  const billing = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getSubscription,
    enabled: Boolean(user),
  });
  const availableCredits = billing.data?.availableCredits;
  const packLabel = getPackLabel(billing.data);
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[260px] flex-col border-r border-white/5 bg-sidebar/80 backdrop-blur-xl">
      <div className="px-5 pt-5 pb-4">
        <Logo />
      </div>
      <div className="mx-4 mb-4 rounded-2xl border border-white/5 bg-white/5 p-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="grid h-6 w-6 place-items-center rounded-full purple-gradient text-white font-bold">
            {typeof availableCredits === "number" ? "C" : (user?.name?.[0] ?? "C")}
          </span>
          <span className="text-muted-foreground">Current pack</span>
          <span className="ml-auto font-semibold text-foreground">{packLabel}</span>
        </div>
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
