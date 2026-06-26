import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, AlertTriangle, Ban, Unlock, Loader2, Globe, Smartphone, Lock, Eye } from "lucide-react";
import { format } from "date-fns";

const BASE = "";

export default function Security() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [blockIp, setBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState("24");
  const [blockPermanent, setBlockPermanent] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [unlocking, setUnlocking] = useState<number | null>(null);
  const [unblocking, setUnblocking] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["security-overview"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/security/overview`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const doBlock = async () => {
    if (!blockIp.trim()) { toast({ title: "Enter an IP address", variant: "destructive" }); return; }
    setBlocking(true);
    try {
      const res = await fetch(`${BASE}/api/admin/security/block-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ipAddress: blockIp.trim(), reason: blockReason || "Manual block", permanent: blockPermanent, durationHours: parseInt(blockDuration) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `IP ${blockIp} blocked!` });
      setBlockIp(""); setBlockReason("");
      queryClient.invalidateQueries({ queryKey: ["security-overview"] });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBlocking(false); }
  };

  const doUnblock = async (id: number, ip: string) => {
    setUnblocking(id);
    try {
      await fetch(`${BASE}/api/admin/security/block-ip/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `IP ${ip} unblocked` });
      refetch();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setUnblocking(null); }
  };

  const doUnlock = async (id: number, name: string) => {
    setUnlocking(id);
    try {
      await fetch(`${BASE}/api/admin/security/unlock-user/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `${name}'s account unlocked` });
      refetch();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setUnlocking(null); }
  };

  const suspicious = data?.suspiciousIps || [];
  const blockedIps = data?.blockedIps || [];
  const topIps = data?.topIps || [];
  const lockedUsers = data?.lockedUsers || [];
  const userDevices = data?.userDevices || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" /> Security Center
        </h1>
        <p className="text-muted-foreground mt-1">Monitor threats, block IPs, manage account security.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Suspicious IPs", value: suspicious.length, color: "text-red-600", bg: "bg-red-50", icon: "🚨" },
          { label: "Blocked IPs", value: blockedIps.length, color: "text-orange-600", bg: "bg-orange-50", icon: "🚫" },
          { label: "Locked Accounts", value: lockedUsers.filter((u: any) => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length, color: "text-yellow-600", bg: "bg-yellow-50", icon: "🔒" },
          { label: "Unique IPs", value: data?.totalUniqueIps || 0, color: "text-blue-600", bg: "bg-blue-50", icon: "🌐" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="ips">
        <TabsList className="grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="ips">IP Management</TabsTrigger>
          <TabsTrigger value="suspicious">Threats</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        {/* IP Management */}
        <TabsContent value="ips" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-500" /> Block an IP Address</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>IP Address</Label>
                  <Input value={blockIp} onChange={e => setBlockIp(e.target.value)} placeholder="192.168.1.100" className="mt-1" />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Suspicious activity, spam, etc." className="mt-1" />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label>Block Duration</Label>
                  <Select value={blockPermanent ? "permanent" : blockDuration} onValueChange={v => { if (v === "permanent") { setBlockPermanent(true); } else { setBlockPermanent(false); setBlockDuration(v); } }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Hour</SelectItem>
                      <SelectItem value="6">6 Hours</SelectItem>
                      <SelectItem value="24">24 Hours</SelectItem>
                      <SelectItem value="72">3 Days</SelectItem>
                      <SelectItem value="168">1 Week</SelectItem>
                      <SelectItem value="permanent">Permanent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={doBlock} disabled={blocking} variant="destructive" className="mb-0.5">
                  {blocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                  Block IP
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Blocked IP Addresses ({blockedIps.length})</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                blockedIps.length === 0 ? <p className="text-center py-8 text-muted-foreground">No IPs blocked.</p> :
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {blockedIps.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-red-700">{b.ipAddress}</span>
                            <Badge variant={b.permanent ? "destructive" : "secondary"}>{b.permanent ? "Permanent" : `Until ${format(new Date(b.expiresAt), "MMM d HH:mm")}`}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{b.reason} · Blocked {format(new Date(b.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => doUnblock(b.id, b.ipAddress)} disabled={unblocking === b.id}>
                          {unblocking === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4 mr-1" />}
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>All Active IPs (Top 20 by Activity)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {topIps.map((t: any) => (
                  <div key={t.ip} className={`flex items-center justify-between p-3 rounded-lg border ${t.isSuspicious ? "border-red-200 bg-red-50" : t.isBlocked ? "border-orange-200 bg-orange-50" : ""}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{t.ip}</span>
                        {t.isSuspicious && <Badge variant="destructive" className="text-xs">Suspicious</Badge>}
                        {t.isBlocked && <Badge className="text-xs bg-orange-100 text-orange-800">Blocked</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.requests} requests · {t.recentActions.join(", ")}</p>
                    </div>
                    {!t.isBlocked && (
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setBlockIp(t.ip); }}>
                        <Ban className="h-3 w-3 mr-1" /> Block
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threats */}
        <TabsContent value="suspicious">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Suspicious Activity
              </CardTitle>
              <CardDescription>IPs with 3+ failed login attempts in recent logs</CardDescription>
            </CardHeader>
            <CardContent>
              {suspicious.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No suspicious IPs detected. Platform is secure.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspicious.map((s: any) => (
                    <div key={s.ip} className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="font-mono font-bold text-red-700">{s.ip}</span>
                          {s.isBlocked && <Badge variant="destructive">Already Blocked</Badge>}
                        </div>
                        <p className="text-sm text-red-600 mt-1">⚠️ {s.failedAttempts} failed login attempts</p>
                      </div>
                      {!s.isBlocked && (
                        <Button size="sm" variant="destructive" onClick={() => { setBlockIp(s.ip); setBlockReason("Suspicious: multiple failed logins"); }}>
                          <Ban className="h-4 w-4 mr-1" /> Block Now
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-yellow-600" /> Locked Accounts</CardTitle>
              <CardDescription>Accounts locked due to failed login attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {lockedUsers.filter((u: any) => u.loginAttempts > 0).length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No locked accounts.</p>
              ) : (
                <div className="space-y-2">
                  {lockedUsers.filter((u: any) => u.loginAttempts > 0).map((u: any) => {
                    const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
                    return (
                      <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border ${isLocked ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}>
                        <div>
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={isLocked ? "destructive" : "secondary"} className="text-xs">
                              {isLocked ? `Locked until ${format(new Date(u.lockedUntil), "HH:mm")}` : `${u.loginAttempts} failed attempts`}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => doUnlock(u.id, u.name)} disabled={unlocking === u.id}>
                          {unlocking === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4 mr-1" />}
                          Unlock
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices */}
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> User Devices & IPs</CardTitle>
              <CardDescription>One device per account enforced. Each user's device fingerprint and login IP.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {userDevices.map((u: any) => (
                  <div key={u.id} className="p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-sm">{u.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                        </div>
                      </div>
                      <Badge className={`capitalize text-xs ${u.status === "approved" ? "bg-green-100 text-green-800" : u.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {u.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground pl-9">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>Login IP: <span className="font-mono text-foreground">{u.lastLoginIp || "—"}</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>Reg. IP: <span className="font-mono text-foreground">{u.registrationIp || "—"}</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Smartphone className="h-3 w-3" />
                        <span className="font-mono truncate max-w-36">{u.deviceId || "No device ID"}</span>
                      </div>
                      <div>Last login: {u.lastLoginAt ? format(new Date(u.lastLoginAt), "MMM d, h:mm a") : "Never"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
