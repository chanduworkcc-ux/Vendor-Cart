import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function TokenCard({ token, index }: { token: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="h-1.5" style={{ backgroundColor: token.color }} />
        <CardContent className="pt-4 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: `${token.color}20`, border: `1px solid ${token.color}40` }}
              >
                {token.emoji}
              </div>
              <div>
                <p className="font-bold text-base">{token.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{token.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">{token.balance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">tokens</p>
            </div>
          </div>
          {token.description && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{token.description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const { data: balancesData, isLoading: isBalancesLoading } = useQuery({
    queryKey: ["my-token-balances"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tokens/my-balances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: txnsData, isLoading: isTxnsLoading } = useQuery({
    queryKey: ["my-token-transactions"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tokens/my-transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const balances: any[] = balancesData?.data || [];
  const transactions: any[] = txnsData?.data || [];
  const nonZeroBalances = balances.filter((b) => b.balance > 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8 text-primary" /> Token Wallet
        </h1>
        <p className="text-muted-foreground mt-1">
          Your special token balances assigned by the admin.
        </p>
      </div>

      {/* Coin Balance from main system */}
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
        <CardContent className="pt-4 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-100 border border-yellow-200 flex items-center justify-center text-2xl">🪙</div>
              <div>
                <p className="font-bold">Coins</p>
                <p className="text-xs text-muted-foreground font-mono">COIN</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-yellow-700">
                {((user as any)?.coinBalance ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">main balance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Special Token Balances */}
      {isBalancesLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : balances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="text-4xl mb-3">🏦</div>
            <p className="font-medium">No special tokens yet</p>
            <p className="text-sm mt-1">Special tokens will appear here when assigned by an admin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Special Tokens</h2>
          {nonZeroBalances.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No token balance yet. Check back soon.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {nonZeroBalances.map((t, i) => (
                <TokenCard key={t.id} token={t} index={i} />
              ))}
            </div>
          )}
          {/* Show zero-balance tokens collapsed */}
          {balances.filter((b) => b.balance === 0).length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Other tokens (0 balance)</p>
              <div className="flex flex-wrap gap-2">
                {balances
                  .filter((b) => b.balance === 0)
                  .map((t) => (
                    <Badge key={t.id} variant="outline" className="font-mono">
                      {t.emoji} {t.symbol}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent token activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isTxnsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          txn.amount > 0 ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        {txn.amount > 0 ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {txn.tokenEmoji} {txn.tokenName}
                          {txn.note && <span className="text-muted-foreground font-normal"> — {txn.note}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold tabular-nums ${
                        txn.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {txn.amount > 0 ? "+" : ""}
                      {txn.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
