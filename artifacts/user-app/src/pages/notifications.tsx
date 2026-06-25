import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell, CheckCircle, AlertTriangle, Package, Check, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");

  const { data: notificationsData, isLoading } = useListNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = notificationsData?.data || [];
  
  const filteredNotifications = tab === "unread" 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => {
        // Optimistic update could go here, but invalidate works too
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "All caught up",
          description: "All notifications marked as read.",
        });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "info": return <Bell className="h-5 w-5 text-blue-500" />;
      case "success": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "order_update": return <Package className="h-5 w-5 text-primary" />;
      case "account_update": return <Bell className="h-5 w-5 text-purple-500" />;
      case "broadcast": return <Bell className="h-5 w-5 text-gray-500" />;
      default: return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your orders and account.</p>
        </div>
        
        {notificationsData?.unreadCount ? (
          <Button variant="outline" onClick={handleMarkAllRead} disabled={markAllReadMutation.isPending}>
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        ) : null}
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <CardHeader className="border-b pb-0">
            <div className="flex items-center justify-between">
              <TabsList className="bg-transparent mb-[-1px]">
                <TabsTrigger 
                  value="all"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-3"
                >
                  All Notifications
                </TabsTrigger>
                <TabsTrigger 
                  value="unread"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-3"
                >
                  Unread
                  {notificationsData?.unreadCount ? (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary w-5 h-5 text-[10px] text-primary-foreground font-bold">
                      {notificationsData.unreadCount}
                    </span>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="all" className="m-0 border-0 outline-none">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />)}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No notifications</p>
                  <p className="text-sm">You don't have any notifications yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex gap-4 p-6 transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                    >
                      <div className="shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className={`text-base font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                        <p className={`text-sm ${!notification.isRead ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                          {notification.message}
                        </p>
                        
                        {!notification.isRead && (
                          <div className="pt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-primary -ml-3" 
                              onClick={() => handleMarkRead(notification.id)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Mark as read
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="unread" className="m-0 border-0 outline-none">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />)}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">You're all caught up</p>
                  <p className="text-sm">No unread notifications.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className="flex gap-4 p-6 bg-primary/5"
                    >
                      <div className="shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-base font-medium text-foreground">
                            {notification.title}
                          </p>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                        <p className="text-sm text-foreground/90">
                          {notification.message}
                        </p>
                        <div className="pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-primary -ml-3" 
                            onClick={() => handleMarkRead(notification.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Mark as read
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
