import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Loader2, IndianRupee, Lock } from "lucide-react";
import { format } from "date-fns";

const BASE = "";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  created:    { label: "Pending",    color: "bg-blue-100 text-blue-800 border-blue-200",     icon: "🕐" },
  accepted:   { label: "Accepted",   color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "✅" },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800 border-purple-200", icon: "⚙️" },
  delivered:  { label: "Delivered",  color: "bg-green-100 text-green-800 border-green-200",   icon: "💰" },
  rejected:   { label: "Rejected",   color: "bg-red-100 text-red-800 border-red-200",         icon: "❌" },
};

const FLOW_STEPS = ["created", "accepted", "processing", "delivered"];

export default function Withdrawals() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notesByWithdrawal, setNotesByWithdrawal] = useState<Record<number, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals-list"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/withdrawals`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15000,
  });

  const withdrawals = data?.data || [];
  const filtered = filterStatus === "all" ? withdrawals : withdrawals.filter((w: any) => w.status === filterStatus);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${BASE}/api/withdrawals/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, adminNote: notesByWithdrawal[id] || "" }),
      });
      const json = await res.json();
      if (!res.ok) {
        // 423 = Locked
        if (res.status === 423) {
          toast({ title: "🔒 Record Locked", description: json.error, variant: "destructive" });
        } else {
          throw new Error(json.error);
        }
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: `Withdrawal ${status}`, description: `Status updated to ${status}.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPending = withdrawals.filter((w: any) => w.status === "created").reduce((s: number, w: any) => s + w.amountRupees, 0);
  const totalDelivered = withdrawals.filter((w: any) => w.status === "delivered").reduce((s: number, w: any) => s + w.amountRupees, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8 text-primary" /> Withdrawal Requests
        </h1>
        <p className="text-muted-foreground mt-1">Manage user UPI withdrawal requests. Delivered and rejected withdrawals are permanently locked.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{withdrawals.filter((w: any) => w.status === "created").length}</div>
            <p className="text-sm text-muted-foreground mt-1">Pending Requests</p>
            <p className="text-xs text-blue-600 font-medium mt-1">₹{totalPending} to process</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{withdrawals.filter((w: any) => w.status === "delivered").length}</div>
            <p className="text-sm text-muted-foreground mt-1">Delivered</p>
            <p className="text-xs text-green-600 font-medium mt-1">₹{totalDelivered} paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-primary">{withdrawals.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "created", "accepted", "processing", "delivered", "rejected"].map(s => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)} className="capitalize">
            {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
            {s !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">({withdrawals.filter((w: any) => w.status === s).length})</span>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No withdrawal requests {filterStatus !== "all" ? `with status "${filterStatus}"` : "yet"}.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((w: any) => {
            const conf = STATUS_CONFIG[w.status] || { label: w.status, color: "bg-gray-100 text-gray-800 border-gray-200", icon: "•" };
            const isUpdating = updatingId === w.id;
            const isLocked = w.isLocked === true;
            const canAct = !isLocked && (w.status === "created" || w.status === "accepted" || w.status === "processing");

            return (
              <Card key={w.id} className={`${w.status === "created" ? "border-blue-200" : ""} ${isLocked ? "bg-amber-50/30 border-amber-200" : ""}`}>
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">🪙 {w.coins} coins</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-600 font-bold text-lg flex items-center gap-0.5">
                          <IndianRupee className="h-4 w-4" />{w.amountRupees}
                        </span>
                        <Badge className={conf.color}>{conf.icon} {conf.label}</Badge>
                        {isLocked && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                            <Lock className="h-3 w-3" /> Immutable Record
                          </span>
                        )}
                      </div>

                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">User:</span> <span className="font-medium">{w.userName || `#${w.userId}`}</span></p>
                        <p><span className="text-muted-foreground">UPI ID:</span> <span className="font-mono font-medium">{w.upiId}</span></p>
                        {w.adminNote && <p><span className="text-muted-foreground">Note:</span> {w.adminNote}</p>}
                        <p className="text-muted-foreground text-xs">Requested: {format(new Date(w.createdAt), "MMM d, yyyy h:mm a")}</p>
                        {isLocked && w.lockedAt && (
                          <p className="text-amber-700 text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Locked: {format(new Date(w.lockedAt), "MMM d, yyyy h:mm a")}
                          </p>
                        )}
                      </div>

                      {/* Status flow timeline */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {FLOW_STEPS.map((step, i) => {
                          const currentIdx = FLOW_STEPS.indexOf(w.status);
                          const stepIdx = i;
                          const done = w.status === "rejected"
                            ? step === "created"
                            : stepIdx <= currentIdx;
                          return (
                            <div key={step} className="flex items-center gap-1">
                              <div className={`h-2.5 w-2.5 rounded-full ${done ? "bg-primary" : "bg-gray-200"}`} />
                              <span className={`text-xs capitalize ${done ? "text-primary font-medium" : "text-muted-foreground"}`}>{step}</span>
                              {i < FLOW_STEPS.length - 1 && (
                                <div className={`h-px w-6 ${done && stepIdx < currentIdx ? "bg-primary" : "bg-gray-200"}`} />
                              )}
                            </div>
                          );
                        })}
                        {w.status === "rejected" && <span className="text-xs text-red-600 font-medium ml-2">❌ Rejected</span>}
                      </div>
                    </div>

                    {/* Admin actions — hidden when locked */}
                    {canAct ? (
                      <div className="space-y-2 md:w-56 shrink-0">
                        <Textarea
                          placeholder="Admin note (optional)..."
                          value={notesByWithdrawal[w.id] || ""}
                          onChange={e => setNotesByWithdrawal(prev => ({ ...prev, [w.id]: e.target.value }))}
                          className="text-sm h-16"
                        />
                        {w.status === "created" && (
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateStatus(w.id, "accepted")} disabled={isUpdating}>
                              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "✅ Accept"}
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateStatus(w.id, "rejected")} disabled={isUpdating}>
                              ❌ Reject
                            </Button>
                          </div>
                        )}
                        {w.status === "accepted" && (
                          <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => updateStatus(w.id, "processing")} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "⚙️ Mark Processing"}
                          </Button>
                        )}
                        {w.status === "processing" && (
                          <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(w.id, "delivered")} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "💰 Mark Delivered"}
                          </Button>
                        )}
                      </div>
                    ) : isLocked ? (
                      <div className="md:w-56 shrink-0 flex items-center justify-center py-4">
                        <div className="text-center text-xs text-amber-700">
                          <Lock className="h-6 w-6 mx-auto mb-1 opacity-60" />
                          <p className="font-medium">Permanently locked</p>
                          <p className="text-amber-600 mt-0.5">No further changes allowed</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
