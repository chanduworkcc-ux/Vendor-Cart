import { useGetAdminStats, useListUsers, useListOrders } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Clock, CheckCircle, Truck, AlertTriangle, Wifi, MessageSquare, TicketIcon, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Dashboard() {
  const { token } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({ query: { refetchInterval: 15000 } });
  const { data: pendingUsersData } = useListUsers({ status: "pending" });
  const { data: recentOrdersData } = useListOrders({ limit: 5 });

  const { data: ticketsData } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tickets?admin=true`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15000,
  });

  const pendingUsers = pendingUsersData?.data || [];
  const recentOrders = recentOrdersData?.data || [];
  const recentTickets = (ticketsData?.data || []).filter((t: any) => t.status === "open" || t.status === "in_progress").slice(0, 5);

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50", href: "/users" },
    { label: "Pending Approvals", value: stats?.pendingUsers ?? 0, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", href: "/users?status=pending" },
    { label: "Online Now", value: (stats as any)?.onlineUsers ?? 0, icon: Wifi, color: "text-green-600", bg: "bg-green-50", href: null, live: true },
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: Package, color: "text-purple-500", bg: "bg-purple-50", href: "/orders" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? 0, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50", href: "/orders?status=pending" },
    { label: "Open Tickets", value: (stats as any)?.openTickets ?? 0, icon: MessageSquare, color: "text-red-500", bg: "bg-red-50", href: "/tickets" },
    { label: "Shipped Orders", value: stats?.shippedOrders ?? 0, icon: Truck, color: "text-blue-400", bg: "bg-blue-50", href: "/orders?status=shipped" },
    { label: "Delivered Orders", value: stats?.deliveredOrders ?? 0, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", href: "/orders?status=delivered" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time platform overview and activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const card = (
            <Card className={`transition-all hover:shadow-md ${s.href ? "cursor-pointer hover:border-primary/40" : ""} ${s.live ? "ring-1 ring-green-200" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`rounded-lg p-2 ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold">{s.value}</div>
                    {s.live && <div className="flex items-center gap-1 mb-1"><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-green-600 font-medium">live</span></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
          return s.href ? <Link key={s.label} href={s.href}>{card}</Link> : <div key={s.label}>{card}</div>;
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Users awaiting account approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Link href={`/users/${u.id}`}>
                      <span className="text-xs text-primary hover:underline font-medium ml-2 shrink-0">Review →</span>
                    </Link>
                  </div>
                ))}
                {pendingUsers.length > 5 && (
                  <Link href="/users?status=pending">
                    <span className="text-sm text-primary hover:underline block text-center pt-2 border-t">
                      +{pendingUsers.length - 5} more
                    </span>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders placed</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/orders/${o.id}`}>
                        <p className="text-sm font-medium hover:underline text-primary truncate">{(o as any).orderRef ?? o.title}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">{format(new Date(o.createdAt), "MMM d")}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0
                      ${o.status === "pending" ? "bg-gray-100 text-gray-800" :
                        o.status === "shipped" ? "bg-orange-100 text-orange-800" :
                        o.status === "delivered" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Tickets</CardTitle>
            <CardDescription>Support tickets needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No open tickets!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/tickets/${t.id}`}>
                        <p className="text-sm font-medium hover:underline text-primary truncate">{t.subject}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">{t.userName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0
                      ${t.priority === "urgent" ? "bg-red-100 text-red-700" : t.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"}`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
                <Link href="/tickets">
                  <span className="text-sm text-primary hover:underline block text-center pt-2 border-t">View all tickets →</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
