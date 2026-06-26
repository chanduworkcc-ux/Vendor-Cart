import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, Loader2, User, Wifi, Globe, Smartphone, Filter } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ACTION_BADGES: Record<string, { label: string; color: string }> = {
  login_success:       { label: "Login", color: "bg-green-100 text-green-800" },
  login_failed:        { label: "Failed Login", color: "bg-red-100 text-red-800" },
  login_account_locked:{ label: "Account Locked", color: "bg-red-200 text-red-900" },
  login_locked:        { label: "Locked Attempt", color: "bg-orange-100 text-orange-800" },
  login_blocked_ip:    { label: "IP Blocked", color: "bg-red-200 text-red-900" },
  login_wrong_device:  { label: "Wrong Device", color: "bg-orange-100 text-orange-800" },
  login_rejected:      { label: "Rejected User", color: "bg-red-100 text-red-800" },
  register:            { label: "Register", color: "bg-blue-100 text-blue-800" },
  register_blocked_device: { label: "Device Blocked", color: "bg-orange-100 text-orange-800" },
  register_duplicate_email: { label: "Duplicate Email", color: "bg-yellow-100 text-yellow-800" },
  email_verified:      { label: "Email Verified", color: "bg-teal-100 text-teal-800" },
  verify_email_failed: { label: "Verify Failed", color: "bg-orange-100 text-orange-800" },
  logout:              { label: "Logout", color: "bg-gray-100 text-gray-700" },
  referral_coin_credited: { label: "Referral Coin", color: "bg-purple-100 text-purple-800" },
  ip_blocked:          { label: "IP Blocked", color: "bg-red-200 text-red-900" },
  ip_unblocked:        { label: "IP Unblocked", color: "bg-green-100 text-green-800" },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_BADGES[action] || { label: action, color: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

export default function ActivityLogs() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

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

  const uniqueActions = [...new Set(logs.map((l: any) => l.action))];

  const filtered = logs.filter((l: any) => {
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const matchesSearch = !search || (
      l.userName?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase()) ||
      l.ipAddress?.includes(search) ||
      l.deviceId?.includes(search)
    );
    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" /> Activity Logs & Online Users
        </h1>
        <p className="text-muted-foreground mt-1">Monitor customer activity, IPs, devices, and online presence in real-time.</p>
      </div>

      {/* Online users */}
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
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Activity Logs ({filtered.length})</CardTitle>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, action, IP, device..." className="pl-9" />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Filter action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((a: any) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(search || actionFilter !== "all") && (
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActionFilter("all"); }}>Clear</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {search || actionFilter !== "all" ? "No matching logs found." : "No activity logs yet."}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {filtered.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 text-sm">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.userName || (log.userId ? `User #${log.userId}` : "Unknown")}</span>
                      <ActionBadge action={log.action} />
                    </div>
                    {log.details && <p className="text-muted-foreground text-xs mt-0.5">{log.details}</p>}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "MMM d, h:mm:ss a")}</span>
                      {log.ipAddress && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 font-mono">
                          <Globe className="h-3 w-3" />{log.ipAddress}
                        </span>
                      )}
                      {log.deviceId && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                          <Smartphone className="h-3 w-3" />{log.deviceId.slice(0, 12)}…
                        </span>
                      )}
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
