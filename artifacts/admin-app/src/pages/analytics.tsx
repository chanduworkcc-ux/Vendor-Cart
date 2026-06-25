import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, Users, Gift, Wallet, Loader2 } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Analytics() {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="text-center py-20 text-muted-foreground">Failed to load analytics.</div>
  );

  const { ordersPerDay = [], statusBreakdown = {}, totalCoinsAwarded = 0, totalWithdrawalAmount = 0, recentOrders = [], recentUsers = [] } = data || {};

  const maxOrders = Math.max(...ordersPerDay.map((d: any) => d.orders), 1);
  const maxUsers = Math.max(...ordersPerDay.map((d: any) => d.users), 1);

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-gray-500",
    processing: "bg-blue-500",
    shipped: "bg-orange-500",
    delivered: "bg-green-500",
    cancelled: "bg-red-500",
  };

  const totalOrders = Object.values(statusBreakdown).reduce((a: any, b: any) => a + b, 0) as number;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" /> Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Real-time platform data analysis.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><Gift className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Coins Awarded</p>
                <p className="text-2xl font-bold text-purple-600">🪙 {totalCoinsAwarded.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Wallet className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                <p className="text-2xl font-bold text-green-600">₹{totalWithdrawalAmount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Package className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><TrendingUp className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-orange-600">{(statusBreakdown as any).delivered || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Orders per day chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders & Users — Last 7 Days</CardTitle>
            <CardDescription>Daily activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ordersPerDay.map((day: any) => (
                <div key={day.date}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground w-20">{format(new Date(day.date + "T00:00:00"), "MMM d")}</span>
                    <span className="text-xs font-medium text-blue-600 w-16 text-right">{day.orders} orders</span>
                    <span className="text-xs font-medium text-green-600 w-16 text-right">{day.users} users</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${(day.orders / maxOrders) * 100}%`, minWidth: day.orders > 0 ? "4px" : "0" }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${(day.users / maxUsers) * 100}%`, minWidth: day.users > 0 ? "4px" : "0" }} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-2 border-t text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-full bg-blue-500" /><span>Orders</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-full bg-green-500" /><span>New Users</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
            <CardDescription>Current distribution of all orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusBreakdown).map(([status, count]: [string, any]) => (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium">{status}</span>
                    <span className="text-muted-foreground">{count} ({totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-2 rounded-full ${STATUS_COLORS[status] || "bg-gray-500"} transition-all`}
                      style={{ width: totalOrders > 0 ? `${(count / totalOrders) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent orders */}
        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <span className="font-mono text-sm font-medium text-primary">{o.orderRef}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                      ${o.status === "delivered" ? "bg-green-100 text-green-800" :
                        o.status === "shipped" ? "bg-orange-100 text-orange-800" :
                        o.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                      {o.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(o.createdAt), "MMM d")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card>
          <CardHeader><CardTitle>Recent Users</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <span className="text-sm font-medium">{u.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                      ${u.status === "approved" ? "bg-green-100 text-green-800" :
                        u.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {u.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(u.createdAt), "MMM d")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
