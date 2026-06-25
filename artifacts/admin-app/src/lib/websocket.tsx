import { useEffect } from "react";
import { useAuth } from "./auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListUsersQueryKey,
  getListOrdersQueryKey,
  getListNotificationsQueryKey,
  getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
            case "new_user_registered":
              toast({ title: "New User", description: data.message || "A new user registered" });
              queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
              break;
            case "user_email_verified":
              toast({ title: "Email Verified", description: data.message || "A user verified their email" });
              queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
              break;
            case "new_order":
              toast({ title: "New Order", description: data.message || "A new order was placed" });
              queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
              break;
            case "order_status_changed":
              queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
              break;
            case "new_notification":
              queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
              break;
          }
        } catch (e) {
          console.error("WS parse error", e);
        }
      };

      ws.onclose = () => setTimeout(connect, 3000);
    };

    connect();
    return () => {
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, [token, toast, queryClient]);

  return <>{children}</>;
}
