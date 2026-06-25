import { useAuth } from "@/lib/auth";
import { useListOrders, useListNotifications, useGetAdminSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, CheckCircle, Bell, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: ordersData, isLoading: isOrdersLoading } = useListOrders();
  const { data: notificationsData, isLoading: isNotificationsLoading } = useListNotifications({ unreadOnly: true });
  const { data: settingsData } = useGetAdminSettings();

  const orders = ordersData?.data || [];
  const notifications = notificationsData?.data || [];
  
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const processingOrders = orders.filter(o => o.status === "processing").length;
  const shippedOrders = orders.filter(o => o.status === "shipped").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground mt-1">Here is a summary of your account.</p>
        </div>
      </div>

      {settingsData && !settingsData.acceptingOrders && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>
            We are not currently accepting new orders. Please check back later.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippedOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest 5 orders</CardDescription>
          </CardHeader>
          <CardContent>
            {isOrdersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No orders found.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline text-primary">
                        {order.title}
                      </Link>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-medium">Qty: {order.quantity}</div>
                      <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
                        ${order.status === "pending" ? "bg-gray-100 text-gray-800" :
                          order.status === "processing" ? "bg-blue-100 text-blue-800" :
                          order.status === "shipped" ? "bg-orange-100 text-orange-800" :
                          order.status === "delivered" ? "bg-green-100 text-green-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Latest Notifications</CardTitle>
            <CardDescription>You have {notificationsData?.unreadCount || 0} unread</CardDescription>
          </CardHeader>
          <CardContent>
            {isNotificationsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                <Bell className="h-8 w-8 text-muted/50 mb-2" />
                You're all caught up.
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card">
                    <div className="mt-1">
                      {notification.type === "info" && <Bell className="h-4 w-4 text-blue-500" />}
                      {notification.type === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {notification.type === "warning" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                      {notification.type === "order_update" && <Package className="h-4 w-4 text-primary" />}
                      {notification.type === "account_update" && <Bell className="h-4 w-4 text-purple-500" />}
                      {notification.type === "broadcast" && <Bell className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
                {notifications.length > 5 && (
                  <div className="text-center pt-2 border-t">
                    <Link href="/notifications" className="text-sm font-medium text-primary hover:underline">
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
