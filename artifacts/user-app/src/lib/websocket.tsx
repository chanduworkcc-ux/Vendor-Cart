import { useEffect } from "react";
import { useAuth } from "./auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getListNotificationsQueryKey, getListOrdersQueryKey, getGetMeQueryKey, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    
    let ws: WebSocket;
    
    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case "new_notification":
              toast({
                title: "New Notification",
                description: data.message || "You have a new notification",
              });
              queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
              break;
              
            case "order_status_changed":
              toast({
                title: "Order Update",
                description: data.message || "An order status has changed",
              });
              queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
              break;
              
            case "order_shipped":
              toast({
                title: "Order Shipped!",
                description: `Your order has shipped. Tracking: ${data.trackingLink || "Available soon"}`,
                variant: "default",
              });
              queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
              break;
              
            case "account_status_changed":
              toast({
                title: "Account Update",
                description: data.message || "Your account status has changed",
              });
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              if (data.status === "approved" || data.message?.includes("approved")) {
                setLocation("/");
              }
              break;
              
            case "settings_changed":
              queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
              break;
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.onclose = () => {
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };
    
    connect();

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [token, toast, queryClient, setLocation]);

  return <>{children}</>;
}
