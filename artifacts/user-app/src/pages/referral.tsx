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
import { Gift, Copy, Loader2, Wallet, IndianRupee, CheckCircle, Share2, Users } from "lucide-react";
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

  const STATUS_COLORS: Record<string, string> = {
    created: "bg-blue-100 text-blue-800 border-blue-200",
    accepted: "bg-yellow-100 text-yellow-800 border-yellow-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
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

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Withdrawal History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">🪙 {w.coins}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-bold text-green-600 flex items-center"><IndianRupee className="h-3 w-3" />{w.amountRupees}</span>
                    </div>
                    <Badge className={STATUS_COLORS[w.status] || "bg-gray-100 text-gray-800"}>{w.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{w.upiId}</span>
                    <span>{format(new Date(w.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  {w.adminNote && <p className="text-xs text-muted-foreground italic border-t pt-1">{w.adminNote}</p>}
                </div>
              ))}
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
