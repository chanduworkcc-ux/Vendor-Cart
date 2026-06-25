import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, Loader2, User, Wifi } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ActivityLogs() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/activity-logs`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15000,
  });

  const { data: onlineData, isLoading: onlineLoading } = useQuery({
    queryKey: ["online-users"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/online-users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 10000,
  });

  const logs = logsData?.data || [];
  const onlineUsers = onlineData?.users || [];
  const onlineCount = onlineData?.onlineCount || 0;

  const filtered = search
    ? logs.filter((l: any) =>
        l.userName?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.details?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" /> Activity Logs & Online Users
        </h1>
        <p className="text-muted-foreground mt-1">Monitor customer activity and online presence in real-time.</p>
      </div>

      {/* Online users section */}
      <Card className="border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <CardTitle>Online Users ({onlineCount})</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200">Live</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {onlineLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {onlineUsers.filter((u: any) => u.isOnline).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center font-bold text-green-800 text-sm">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs shrink-0">{u.role}</Badge>
                </div>
              ))}
              {onlineUsers.filter((u: any) => u.isOnline).length === 0 && (
                <p className="text-sm text-muted-foreground col-span-3 py-2">No users online right now.</p>
              )}
            </div>
          )}
          
          {/* All users with last seen */}
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium mb-3 text-muted-foreground">All Users — Last Seen</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {onlineUsers.filter((u: any) => !u.isOnline).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gray-400 border-2 border-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.lastSeen ? `Last seen ${format(new Date(u.lastSeen), "MMM d, h:mm a")}` : "Never"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Activity Logs</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {search ? "No matching logs found." : "No activity logs yet."}
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 text-sm">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.userName || `User #${log.userId}`}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-primary font-medium">{log.action}</span>
                    </div>
                    {log.details && <p className="text-muted-foreground text-xs mt-0.5 truncate">{log.details}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                      {log.ipAddress && <span className="text-xs text-muted-foreground">· {log.ipAddress}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
