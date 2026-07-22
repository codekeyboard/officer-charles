import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/topbar/Topbar";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { GradientButton } from "@/components/common/GradientButton";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users · Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [search, setSearch] = useState("");
  const users = useQuery({ queryKey: ["admin-users", search], queryFn: () => adminService.getUsers({ search, limit: 50 }) });
  const status = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => adminService.updateUserStatus(id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  if (pathname !== "/admin/users") {
    return <Outlet />;
  }

  return (
    <>
      <Topbar title="Users" />
      <PageHeader
        title="Users"
        subtitle={`${users.data?.total ?? 0} accounts`}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 h-9 w-64">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        }
      />
      {(users.isError || status.isError) && <State text={errorMessage(users.error || status.error)} />}
      {users.isLoading && <State text="Loading users..." />}
      <div className="mt-6">
        <DataTable
          rows={users.data?.items || []}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" },
            { key: "actions", label: "", render: (user) => (
              <div className="flex items-center gap-3">
                <Link to="/admin/users/$id" params={{ id: user.id }} className="text-xs text-primary hover:underline">View</Link>
                <GradientButton size="sm" variant="outline" disabled={status.isPending} onClick={() => status.mutate({ id: user.id, next: user.status === "active" ? "suspended" : "active" })}>
                  {user.status === "active" ? "Suspend" : "Activate"}
                </GradientButton>
              </div>
            ) },
          ]}
        />
      </div>
    </>
  );
}

function State({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}
