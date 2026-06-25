import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, Loader2, Coins } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Referrals() {
  const { token } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/referrals`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const referrals = data?.data || [];
  const users = data?.users || [];
  const totalCoins = referrals.reduce((s: number, r: any) => s + r.coinsAwarded, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Gift className="h-8 w-8 text-primary" /> Referral Management
        </h1>
        <p className="text-muted-foreground mt-1">View all referrals, coin balances, and referral codes.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-primary">{referrals.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">🪙 {totalCoins.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Coins Awarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{users.filter((u: any) => u.coinBalance > 0).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Users With Coins</p>
          </CardContent>
        </Card>
      </div>

      {/* Users coin balance */}
      <Card>
        <CardHeader>
          <CardTitle>User Coin Balances & Referral Codes</CardTitle>
          <CardDescription>All users and their current coin balances</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {users.sort((a: any, b: any) => b.coinBalance - a.coinBalance).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{u.referralCode || "No code"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.coinBalance > 0 ? (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">🪙 {u.coinBalance}</Badge>
                    ) : (
                      <Badge variant="secondary">0 coins</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral history */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>All referral transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No referrals yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {referrals.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-primary">{r.referrerName || `User #${r.referrerId}`}</span>
                      <span className="text-muted-foreground mx-2">referred</span>
                      <span className="text-foreground">{r.referredUserName || `User #${r.referredUserId}`}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">+🪙 {r.coinsAwarded}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
