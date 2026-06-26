import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListOrders, useListNotifications, useGetAdminSettings } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, CheckCircle, Bell, AlertTriangle, Megaphone, X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

function WelcomeBanner({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-6 text-primary-foreground shadow-xl shadow-primary/20">
      {/* Animated background orbs */}
      <motion.div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="relative z-10 space-y-1">
        <motion.p
          className="text-sm font-medium text-primary-foreground/70 uppercase tracking-widest"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {greeting}
        </motion.p>
        <motion.h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          Welcome,{" "}
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {name}!
          </motion.span>
        </motion.h1>
        <motion.p
          className="text-sm text-primary-foreground/60 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          Here is a summary of your account.
        </motion.p>
      </div>

      {/* Floating sparkle dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/40"
          style={{
            top: `${25 + i * 22}%`,
            right: `${12 + i * 8}%`,
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.4, 0.9, 0.4],
          }}
          transition={{
            duration: 2.5 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.6,
          }}
        />
      ))}
    </div>
  );
}

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

  const statCards = [
    { label: "Pending Orders", value: pendingOrders, icon: Package, color: "text-muted-foreground" },
    { label: "Processing", value: processingOrders, icon: Package, color: "text-blue-500" },
    { label: "Shipped", value: shippedOrders, icon: Truck, color: "text-orange-500" },
    { label: "Delivered", value: deliveredOrders, icon: CheckCircle, color: "text-green-500" },
  ];

  return (
    <div className="space-y-8">
      <WelcomeBanner name={user?.name || "there"} />

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
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.07 }}
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
