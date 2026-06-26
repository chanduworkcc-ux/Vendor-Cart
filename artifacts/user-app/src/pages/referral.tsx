import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Gift, Copy, Loader2, Wallet, IndianRupee, CheckCircle, Share2, Users, Clock, CircleCheck, RefreshCw, Banknote, CircleDot } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Referral() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawCoins, setWithdrawCoins] = useState("");
  const [withdrawUpi, setWithdrawUpi] = useState((user as any)?.upiId || "");
  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["referral-info"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/referral/info`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load referral info");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: withdrawalData, refetch: refetchWithdrawals } = useQuery({
    queryKey: ["my-withdrawals"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/withdrawals`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const copyCode = async () => {
    const code = data?.referralCode || (user as any)?.referralCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied! 🎉", description: `Referral code ${code} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    const code = data?.referralCode || (user as any)?.referralCode;
    if (!code) return;
    const text = `Join me on this platform and use my referral code ${code} to get started! 🎁`;
    if (navigator.share) {
      try { await navigator.share({ title: "Join me!", text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!", description: "Share this with your friends." });
    }
  };

  const requestWithdrawal = async () => {
    const coins = parseInt(withdrawCoins);
    if (!coins || coins <= 0) { toast({ title: "Enter valid coin amount", variant: "destructive" }); return; }
    if (!withdrawUpi.trim()) { toast({ title: "Enter UPI ID", variant: "destructive" }); return; }
    setWithdrawing(true);
    try {
      const res = await fetch(`${BASE}/api/withdrawals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ coins, upiId: withdrawUpi.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: "Withdrawal requested! 💸", description: `₹${result.amountRupees} will be sent to ${withdrawUpi}` });
      setWithdrawCoins("");
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      refetch();
      refetchWithdrawals();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to request withdrawal", variant: "destructive" });
    } finally { setWithdrawing(false); }
  };

  const coinBalance = data?.coinBalance ?? (user as any)?.coinBalance ?? 0;
  const coinsPerRupee = data?.coinsPerRupee ?? 100;
  const minWithdrawalCoins = data?.minWithdrawalCoins ?? 1000;
  const coinsPerReferral = data?.coinsPerReferral ?? 100;
  const rupeeBalance = Math.floor(coinBalance / coinsPerRupee);
  const enteredCoins = parseInt(withdrawCoins) || 0;
  const estimatedRupees = Math.floor(enteredCoins / coinsPerRupee);
  const withdrawals = withdrawalData?.data || [];

  const MILESTONE_STEPS = [
    {
      key: "created",
      label: "Withdrawal Created",
      desc: (w: any) => `Requested ₹${w.amountRupees} to ${w.upiId}`,
      icon: Clock,
      activeColor: "bg-blue-500",
      textColor: "text-blue-600",
      ringColor: "ring-blue-200",
    },
    {
      key: "accepted",
      label: "Admin Accepted",
      desc: () => "Request reviewed and approved",
      icon: CircleCheck,
      activeColor: "bg-yellow-500",
      textColor: "text-yellow-600",
      ringColor: "ring-yellow-200",
    },
    {
      key: "processing",
      label: "Processing",
      desc: () => "Payment is being processed",
      icon: RefreshCw,
      activeColor: "bg-orange-500",
      textColor: "text-orange-600",
      ringColor: "ring-orange-200",
    },
    {
      key: "delivered",
      label: "Delivered",
      desc: () => "Funds successfully transferred",
      icon: Banknote,
      activeColor: "bg-green-500",
      textColor: "text-green-600",
      ringColor: "ring-green-200",
    },
  ];

  const STATUS_ORDER: Record<string, number> = {
    created: 0,
    accepted: 1,
    processing: 2,
    reverting: 2,
    delivered: 3,
    rejected: -1,
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Gift className="h-8 w-8 text-primary" /> Referral & Coins
        </h1>
        <p className="text-muted-foreground mt-1">Earn coins by referring friends. Redeem via UPI withdrawal.</p>
      </div>

      {/* Coin Balance */}
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
        <CardContent className="pt-6 text-center space-y-2">
          <div className="text-5xl mb-2">🪙</div>
          <div className="text-4xl font-bold text-yellow-700">{coinBalance.toLocaleString()}</div>
          <p className="text-sm text-yellow-600 font-medium">Coins ≈ <span className="font-bold">₹{rupeeBalance}</span></p>
          <div className="flex justify-center gap-4 pt-2 text-xs text-muted-foreground flex-wrap">
            <span>{coinsPerReferral} coins / referral</span>
            <span>·</span>
            <span>{coinsPerRupee} coins = ₹1</span>
            <span>·</span>
            <span>Min withdrawal: {minWithdrawalCoins} coins</span>
          </div>
        </CardContent>
      </Card>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Your Referral Code</CardTitle>
          <CardDescription>Share this code with friends. Earn {coinsPerReferral} coins when they verify their email!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="font-mono text-2xl font-bold tracking-widest text-center py-4 px-6 rounded-xl bg-muted border-2 border-dashed border-primary/30 text-primary">
                {data?.referralCode || (user as any)?.referralCode || "—"}
              </div>
              <div className="flex gap-2">
                <Button onClick={copyCode} variant="outline" className="flex-1">
                  {copied ? <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Code"}
                </Button>
                <Button onClick={share} className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold text-primary">{data?.totalReferrals ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold text-yellow-600">🪙 {(data?.totalReferrals ?? 0) * coinsPerReferral}</div>
                  <p className="text-xs text-muted-foreground">Coins Earned</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Referral History */}
      {(data?.referrals?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>Referral History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data.referrals.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{r.referredUserName || "Friend"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">+🪙 {r.coinsAwarded}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdraw */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Withdraw to UPI</CardTitle>
          <CardDescription>
            Minimum {minWithdrawalCoins} coins (₹{Math.floor(minWithdrawalCoins / coinsPerRupee)}) to withdraw.
            {coinBalance < minWithdrawalCoins && (
              <span className="text-orange-600 font-medium"> Need {minWithdrawalCoins - coinBalance} more coins.</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Coins to Withdraw</Label>
            <div className="flex gap-2 mt-1">
              <Input type="number" placeholder={`Min ${minWithdrawalCoins}`} value={withdrawCoins}
                onChange={e => setWithdrawCoins(e.target.value)} max={coinBalance} min={minWithdrawalCoins} />
              <Button variant="outline" size="sm" onClick={() => setWithdrawCoins(String(coinBalance))} disabled={coinBalance === 0}>All</Button>
            </div>
            {enteredCoins > 0 && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />You will receive ₹{estimatedRupees}
              </p>
            )}
          </div>
          <div>
            <Label>UPI ID</Label>
            <Input placeholder="yourname@upi or 9876543210@paytm" value={withdrawUpi}
              onChange={e => setWithdrawUpi(e.target.value)} className="mt-1" />
          </div>
          <Button
            onClick={requestWithdrawal}
            disabled={withdrawing || coinBalance < minWithdrawalCoins || enteredCoins < minWithdrawalCoins || enteredCoins > coinBalance || !withdrawUpi.trim()}
            className="w-full"
          >
            {withdrawing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IndianRupee className="mr-2 h-4 w-4" />}
            {withdrawing ? "Submitting..." : `Withdraw ₹${estimatedRupees || "?"}`}
          </Button>
        </CardContent>
      </Card>

      {/* Withdrawal history — vertical milestone timeline */}
      {withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {withdrawals.map((w: any) => {
                const currentStep = STATUS_ORDER[w.status] ?? 0;
                const isRejected = w.status === "rejected";
                return (
                  <div key={w.id} className="border rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold">🪙 {w.coins}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-bold text-green-700 flex items-center gap-0.5">
                          <IndianRupee className="h-3 w-3" />{w.amountRupees}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">· {w.upiId}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(w.createdAt), "MMM d, yyyy")}</span>
                    </div>

                    {/* Rejected state */}
                    {isRejected ? (
                      <div className="px-4 py-5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center shrink-0">
                          <CircleDot className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-600">Withdrawal Rejected</p>
                          {w.adminNote && <p className="text-xs text-muted-foreground mt-0.5 italic">{w.adminNote}</p>}
                        </div>
                      </div>
                    ) : (
                      /* Vertical milestone timeline */
                      <div className="px-4 py-5">
                        <div className="relative">
                          {/* Vertical track line */}
                          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

                          <div className="space-y-0">
                            {MILESTONE_STEPS.map((step, idx) => {
                              const isDone = idx <= currentStep;
                              const isCurrent = idx === currentStep;
                              const Icon = step.icon;
                              return (
                                <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                                  {/* Node */}
                                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300
                                    ${isDone
                                      ? `${step.activeColor} border-transparent ring-2 ring-offset-1 ${step.ringColor}`
                                      : "bg-background border-border"
                                    }`}>
                                    <Icon className={`h-3.5 w-3.5 ${isDone ? "text-white" : "text-muted-foreground"} ${isCurrent && step.key !== "delivered" ? "animate-pulse" : ""}`} />
                                  </div>

                                  {/* Label */}
                                  <div className="pt-0.5 min-w-0">
                                    <p className={`text-sm font-semibold ${isDone ? step.textColor : "text-muted-foreground"}`}>
                                      {step.label}
                                      {isCurrent && !isDone && (
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">(in progress)</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc(w)}</p>
                                    {isCurrent && idx === 0 && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {format(new Date(w.createdAt), "MMM d, yyyy · h:mm a")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {w.adminNote && (
                          <p className="text-xs text-muted-foreground italic border-t pt-3 mt-3">
                            Admin note: {w.adminNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { step: "1", icon: "📤", title: "Share your code", desc: "Send your referral code to friends" },
              { step: "2", icon: "📝", title: "Friend registers", desc: "They register using your referral code" },
              { step: "3", icon: "✅", title: "They verify email", desc: "Coins credited when they verify their email" },
              { step: "4", icon: "🪙", title: `+${coinsPerReferral} coins for you`, desc: "Credited instantly to your balance" },
              { step: "5", icon: "💸", title: "Withdraw via UPI", desc: `Min ${minWithdrawalCoins} coins = ₹${Math.floor(minWithdrawalCoins / coinsPerRupee)}` },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3 text-sm">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{s.step}</div>
                <div>
                  <span className="mr-2">{s.icon}</span>
                  <span className="font-medium">{s.title}</span>
                  <span className="text-muted-foreground"> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
