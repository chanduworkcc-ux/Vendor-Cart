import { useGetAdminStats, useListUsers, useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Clock, CheckCircle, Truck, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: pendingUsersData } = useListUsers({ status: "pending" });
  const { data: recentOrdersData } = useListOrders({ limit: 5 });

  const pendingUsers = pendingUsersData?.data || [];
  const recentOrders = recentOrdersData?.data || [];

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Pending Approvals", value: stats?.pendingUsers ?? 0, icon: Clock, color: "text-yellow-500" },
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: Package, color: "text-purple-500" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? 0, icon: AlertTriangle, color: "text-orange-500" },
    { label: "Shipped Orders", value: stats?.shippedOrders ?? 0, icon: Truck, color: "text-blue-400" },
    { label: "Delivered Orders", value: stats?.deliveredOrders ?? 0, icon: CheckCircle, color: "text-green-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and recent activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-3xl font-bold">{s.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Users waiting for approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending users.</p>
            ) : (
              <div className="space-y-3">
                {pendingUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Link href={`/users/${u.id}`} className="text-xs text-primary hover:underline font-medium">
                      Review
                    </Link>
                  </div>
                ))}
                {pendingUsers.length > 5 && (
                  <Link href="/users?status=pending" className="text-sm text-primary hover:underline block text-center pt-2 border-t">
                    View all {pendingUsers.length} pending users
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest 5 orders placed</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
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
