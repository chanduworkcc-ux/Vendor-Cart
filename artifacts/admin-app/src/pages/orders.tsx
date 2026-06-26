import { useState } from "react";
import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, Lock } from "lucide-react";

const STATUS_OPTIONS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

const statusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useListOrders(
    statusFilter !== "all" ? { status: statusFilter as any } : {}
  );
  const orders = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">View and manage all platform orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
            {orders.filter((o: any) => o.isLocked).length > 0 && (
              <span className="text-xs font-normal text-amber-600 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Lock className="h-3 w-3" />
                {orders.filter((o: any) => o.isLocked).length} locked
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-3 text-left font-medium">Order</th>
                    <th className="pb-3 text-left font-medium">Ref</th>
                    <th className="pb-3 text-left font-medium">User</th>
                    <th className="pb-3 text-left font-medium">Status</th>
                    <th className="pb-3 text-left font-medium">Lock</th>
                    <th className="pb-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className={`border-b last:border-0 ${o.isLocked ? "bg-amber-50/40" : ""}`}>
                      <td className="py-3">
                        <Link href={`/orders/${o.id}`} className="font-medium hover:underline text-primary">
                          {o.title}
                        </Link>
                        {o.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{o.description}</p>
                        )}
                      </td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">{o.orderRef || "—"}</td>
                      <td className="py-3 text-muted-foreground">{o.userName || `#${o.userId}`}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor[o.status] || "bg-gray-100 text-gray-800"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {o.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(o.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
