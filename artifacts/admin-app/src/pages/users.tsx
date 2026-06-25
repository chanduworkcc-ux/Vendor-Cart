import { useState } from "react";
import { Link, useSearch } from "wouter";
import {
  useListUsers,
  useUpdateUserStatus,
  useUpdateUserRole,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, UserCheck, UserX, Wifi, WifiOff } from "lucide-react";

export default function Users() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [statusFilter, setStatusFilter] = useState(params.get("status") || "all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListUsers(
    statusFilter !== "all" ? { status: statusFilter as any } : {}
  );
  const users = data?.data || [];

  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();

  const handleStatusChange = (userId: string, status: "approved" | "rejected") => {
    updateStatus.mutate(
      { userId, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "User updated", description: `User has been ${status}.` });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Failed to update user status.", variant: "destructive" }),
      }
    );
  };

  const handleRoleChange = (userId: string, role: "user" | "admin" | "special") => {
    updateRole.mutate(
      { userId, data: { role } },
      {
        onSuccess: () => {
          toast({ title: "Role updated", description: `User role changed to ${role}.` });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Failed to update role.", variant: "destructive" }),
      }
    );
  };

  const statusOptions = ["all", "pending", "approved", "rejected"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and approvals.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total ?? 0} {statusFilter !== "all" ? statusFilter : ""} users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/users/${u.id}`} className="font-medium hover:underline text-primary">
                        {u.name}
                      </Link>
                      {(u as any).isOnline ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />Online
                        </span>
                      ) : (u as any).lastSeen ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <WifiOff className="h-3 w-3" />
                          {format(new Date((u as any).lastSeen), "MMM d, h:mm a")}
                        </span>
                      ) : null}
                      <Badge variant={u.status === "approved" ? "default" : u.status === "rejected" ? "destructive" : "secondary"}>
                        {u.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{u.role}</Badge>
                      {u.emailVerified && <Badge variant="outline" className="text-green-600 border-green-300">Verified</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{u.email}</p>
                    <p className="text-xs text-muted-foreground">Joined {format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => handleStatusChange(u.id, "approved")} disabled={updateStatus.isPending}>
                          <UserCheck className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusChange(u.id, "rejected")} disabled={updateStatus.isPending}>
                          <UserX className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                    {u.status === "approved" && (
                      <Select value={u.role} onValueChange={(role) => handleRoleChange(u.id, role as any)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="special">Special</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {u.status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(u.id, "approved")} disabled={updateStatus.isPending}>
                        Re-approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
