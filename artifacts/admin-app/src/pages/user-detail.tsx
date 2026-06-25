import { useParams, useLocation } from "wouter";
import {
  useGetUser,
  useUpdateUserStatus,
  useUpdateUserRole,
  useListOrders,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Loader2, UserCheck, UserX } from "lucide-react";
import { Link } from "wouter";

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetUser(id!);
  const { data: ordersData } = useListOrders({ userId: id });
  const orders = ordersData?.data || [];

  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();

  const handleStatus = (status: "approved" | "rejected") => {
    updateStatus.mutate({ userId: id!, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Updated", description: `User ${status}.` });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const handleRole = (role: "user" | "admin" | "special") => {
    updateRole.mutate({ userId: id!, data: { role } }, {
      onSuccess: () => {
        toast({ title: "Role updated", description: `Role changed to ${role}.` });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  if (!user) return (
    <div className="text-center py-16 text-muted-foreground">User not found.</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/users")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={user.status === "approved" ? "default" : user.status === "rejected" ? "destructive" : "secondary"}>
                {user.status}
              </Badge>
              <Badge variant="outline" className="capitalize">{user.role}</Badge>
              {user.emailVerified && <Badge variant="outline" className="text-green-600 border-green-300">Email Verified</Badge>}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Joined: </span>
              {format(new Date(user.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>

            <div className="pt-4 border-t space-y-3">
              {user.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => handleStatus("approved")} disabled={updateStatus.isPending}>
                    <UserCheck className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={() => handleStatus("rejected")} disabled={updateStatus.isPending}>
                    <UserX className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
              {user.status === "approved" && (
                <Button className="w-full" variant="destructive" onClick={() => handleStatus("rejected")} disabled={updateStatus.isPending}>
                  Reject Account
                </Button>
              )}
              {user.status === "rejected" && (
                <Button className="w-full" onClick={() => handleStatus("approved")} disabled={updateStatus.isPending}>
                  Approve Account
                </Button>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Change Role</p>
                <Select value={user.role} onValueChange={(r) => handleRole(r as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>{orders.length} total orders</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No orders placed.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <Link href={`/orders/${o.id}`} className="text-sm font-medium hover:underline text-primary">
                        {o.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(o.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize
                      ${o.status === "pending" ? "bg-gray-100 text-gray-800" :
                        o.status === "processing" ? "bg-blue-100 text-blue-800" :
                        o.status === "shipped" ? "bg-orange-100 text-orange-800" :
                        o.status === "delivered" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
