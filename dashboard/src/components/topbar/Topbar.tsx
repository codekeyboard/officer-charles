import { Bell, CreditCard, LogOut, Settings, User, UserCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { userService } from "@/services/user.service";
import { billingService } from "@/services/billing.service";
import { getPackLabel } from "@/utils/billingLabels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ title }: { title: string }) {
  const nav = useNavigate();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: userService.getNotifications,
    enabled: Boolean(user),
  });
  const notificationItems = notifications.data?.notifications ?? [];
  const unread = notifications.data?.notifications.filter((item) => !item.readAt) ?? [];
  const billing = useQuery({
    queryKey: ["subscription"],
    queryFn: billingService.getSubscription,
    enabled: Boolean(user),
  });
  const packLabel = getPackLabel(billing.data);
  const markRead = useMutation({
    mutationFn: userService.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: userService.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-white/5 bg-background/60 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Officer Charles
          </div>
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title={unread[0]?.title || "Notifications"}
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground shadow-sm hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unread.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unread.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl border-border bg-popover p-2">
            <div className="flex items-center justify-between gap-3 px-2 py-1.5">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unread.length > 0 && (
                <button
                  type="button"
                  disabled={markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                  className="rounded-md px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-60"
                >
                  {markAllRead.isPending ? "Marking..." : "Mark all read"}
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notificationItems.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                No notifications yet.
              </div>
            )}
            {notificationItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => {
                  if (!item.readAt) markRead.mutate(item.id);
                }}
                className="items-start rounded-lg p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!item.readAt && <span className="h-2 w-2 rounded-full bg-primary" />}
                    <div className="truncate text-sm font-medium">{item.title}</div>
                  </div>
                  {item.body && (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.body}
                    </div>
                  )}
                  {item.createdAt && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card/70 pl-1 pr-3 text-left shadow-sm hover:border-primary/40">
              <div className="grid h-7 w-7 place-items-center rounded-lg purple-gradient text-xs font-bold text-primary-foreground">
                {user?.name?.[0] ?? "A"}
              </div>
              <div className="hidden text-xs sm:block">
                <div className="max-w-32 truncate font-medium leading-tight text-foreground">
                  {user?.name}
                </div>
                <div className="text-muted-foreground leading-tight">{packLabel}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-popover p-2">
            <DropdownMenuLabel>
              <div className="truncate text-sm">{user?.name}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">
                {user?.email}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === "admin" ? (
              <>
                <DropdownMenuItem onSelect={() => void nav({ to: "/admin/dashboard" })}>
                  <UserCircle /> Admin dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void nav({ to: "/admin/settings" })}>
                  <Settings /> Admin settings
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => void nav({ to: "/user/profile" })}>
                  <User /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void nav({ to: "/user/settings" })}>
                  <Settings /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void nav({ to: "/user/billing" })}>
                  <CreditCard /> Pricing & billing
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void logout().then(() => nav({ to: "/login" }));
              }}
            >
              <LogOut /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
