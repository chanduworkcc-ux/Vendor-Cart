import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetUser, useUpdateUserStatus, useUpdateUserRole, useListOrders, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { ArrowLeft, Loader2, UserCheck, UserX, Ban, Clock, Coins, Shield, Globe, Smartphone, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useGetUser(id!);
  const { data: ordersData } = useListOrders({ userId: id });
  const orders = ordersData?.data || [];

  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();

  const [banReason, setBanReason] = useState("");
  const [banDevice, setBanDevice] = useState(false);
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendReason, setSuspendReason] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [coinReason, setCoinReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const doAction = async (endpoint: string, body: any, successMsg: string) => {
    setActionLoading(endpoint);
    try {
      const res = await fetch(`${BASE}/api/users/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: successMsg });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const handleStatus = (status: "approved" | "rejected") => {
    updateStatus.mutate({ userId: id!, data: { status } }, {
      onSuccess: () => { toast({ title: `User ${status}` }); queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); refetch(); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="text-center py-16 text-muted-foreground">User not found.</div>;

  const isBanned = (user as any).bannedPermanently;
  const suspendedUntil = (user as any).suspendedUntil;
  const isSuspended = suspendedUntil && new Date(suspendedUntil) > new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/users")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            {isBanned && <Badge variant="destructive">Permanently Banned</Badge>}
            {isSuspended && <Badge className="bg-orange-100 text-orange-800">Suspended</Badge>}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Details */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={user.status === "approved" ? "default" : user.status === "rejected" ? "destructive" : "secondary"}>{user.status}</Badge>
              <Badge variant="outline" className="capitalize">{user.role}</Badge>
              {user.emailVerified && <Badge variant="outline" className="text-green-600 border-green-300">Verified</Badge>}
              {(user as any).isOnline && <Badge className="bg-green-100 text-green-800">Online</Badge>}
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>Joined: {format(new Date(user.createdAt), "MMM d, yyyy")}</p>
              {(user as any).phone && <p>📱 {(user as any).phone}</p>}
              {(user as any).whatsappNumber && <p>💬 WhatsApp: {(user as any).whatsappNumber}</p>}
              {(user as any).address && <p>📍 {(user as any).address}</p>}
              {(user as any).upiId && <p>💳 UPI: {(user as any).upiId}</p>}
            </div>
            <div className="text-sm space-y-1">
              {(user as any).lastLoginIp && (
                <p className="flex items-center gap-1 text-muted-foreground"><Globe className="h-3 w-3" /> IP: <span className="font-mono text-foreground">{(user as any).lastLoginIp}</span></p>
              )}
              {(user as any).deviceId && (
                <p className="flex items-center gap-1 text-muted-foreground"><Smartphone className="h-3 w-3" /> Device: <span className="font-mono text-foreground text-xs">{(user as any).deviceId?.slice(0, 16)}…</span></p>
              )}
              <p className="flex items-center gap-1 text-purple-600 font-medium"><span>🪙</span> {(user as any).coinBalance ?? 0} coins</p>
            </div>

            <div className="pt-3 border-t space-y-2">
              {user.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => handleStatus("approved")} disabled={updateStatus.isPending}><UserCheck className="mr-1 h-4 w-4" /> Approve</Button>
                  <Button className="flex-1" variant="destructive" onClick={() => handleStatus("rejected")} disabled={updateStatus.isPending}><UserX className="mr-1 h-4 w-4" /> Reject</Button>
                </div>
              )}
              {user.status === "approved" && !isBanned && (
                <Button className="w-full" variant="outline" onClick={() => handleStatus("rejected")} disabled={updateStatus.isPending}>Reject Account</Button>
              )}
              {user.status === "rejected" && !isBanned && (
                <Button className="w-full" onClick={() => handleStatus("approved")} disabled={updateStatus.isPending}>Approve Account</Button>
              )}
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Role</p>
                <Select value={user.role} onValueChange={(r) => updateRole.mutate({ userId: id!, data: { role: r as any } }, { onSuccess: () => { toast({ title: "Role updated" }); refetch(); } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add / Remove Coins */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><span>🪙</span> Manage Coins</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Current balance: <strong className="text-purple-600">{(user as any).coinBalance ?? 0} coins</strong></p>
            <div>
              <Label className="text-xs">Amount (use negative to deduct)</Label>
              <Input type="number" value={coinAmount} onChange={e => setCoinAmount(e.target.value)} placeholder="e.g. 500 or -100" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input value={coinReason} onChange={e => setCoinReason(e.target.value)} placeholder="Bonus, correction, etc." className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => { if (!coinAmount) return; doAction("add-coins", { coins: parseInt(coinAmount), reason: coinReason }, `${parseInt(coinAmount) >= 0 ? "Added" : "Deducted"} coins`); setCoinAmount(""); setCoinReason(""); }} disabled={actionLoading === "add-coins" || !coinAmount}>
                {actionLoading === "add-coins" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>🪙</span>} Apply
              </Button>
              {[100, 500, 1000].map(n => <Button key={n} variant="outline" size="sm" onClick={() => setCoinAmount(String(n))}>+{n}</Button>)}
            </div>
          </CardContent>
        </Card>

        {/* Suspend */}
        <Card className={isSuspended ? "border-orange-300" : ""}>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-orange-500" /> Suspend Account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isSuspended && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-orange-800">Suspended until {format(new Date(suspendedUntil), "MMM d, yyyy")}</p>
                {(user as any).suspensionReason && <p className="text-orange-700 text-xs mt-1">Reason: {(user as any).suspensionReason}</p>}
                <Button variant="outline" size="sm" className="mt-2 text-orange-700 border-orange-300" onClick={() => doAction("unsuspend", {}, "Suspension lifted")} disabled={actionLoading === "unsuspend"}>
                  {actionLoading === "unsuspend" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Lift Suspension
                </Button>
              </div>
            )}
            {!isSuspended && (
              <>
                <div>
                  <Label className="text-xs">Suspend for (days)</Label>
                  <Input type="number" min="1" value={suspendDays} onChange={e => setSuspendDays(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension" className="mt-1" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[1, 3, 7, 14, 30].map(d => <Button key={d} variant="outline" size="sm" onClick={() => setSuspendDays(String(d))}>{d}d</Button>)}
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => doAction("suspend", { days: parseInt(suspendDays), reason: suspendReason }, `Account suspended for ${suspendDays} day(s)`)} disabled={actionLoading === "suspend"}>
                  {actionLoading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Clock className="h-4 w-4 mr-1" />} Suspend {suspendDays} Day(s)
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Permanent Ban */}
        <Card className={isBanned ? "border-red-400 bg-red-50/30" : ""}>
          <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-600" /> Permanent Ban</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isBanned ? (
              <div className="space-y-3">
                <div className="bg-red-100 border border-red-200 rounded-lg p-3 text-sm">
                  <p className="font-bold text-red-800 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Account Permanently Banned</p>
                  {(user as any).bannedReason && <p className="text-red-700 text-xs mt-1">Reason: {(user as any).bannedReason}</p>}
                </div>
                <Button className="w-full" variant="outline" onClick={() => doAction("unban", {}, "Account unbanned")} disabled={actionLoading === "unban"}>
                  {actionLoading === "unban" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />} Remove Ban
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for permanent ban..." className="mt-1 h-20 resize-none" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={banDevice} onChange={e => setBanDevice(e.target.checked)} />
                  Also ban this device
                </label>
                <Button className="w-full" variant="destructive" onClick={() => doAction("ban", { reason: banReason, banDevice }, "User permanently banned")} disabled={actionLoading === "ban"}>
                  {actionLoading === "ban" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />} Permanently Ban
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader><CardTitle>Orders ({orders.length})</CardTitle></CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No orders placed.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <Link href={`/orders/${o.id}`} className="text-sm font-medium hover:underline text-primary">{o.title}</Link>
                      <p className="text-xs text-muted-foreground">{format(new Date(o.createdAt), "MMM d, yyyy")}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${o.status === "pending" ? "bg-gray-100 text-gray-800" : o.status === "processing" ? "bg-blue-100 text-blue-800" : o.status === "shipped" ? "bg-orange-100 text-orange-800" : o.status === "delivered" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
