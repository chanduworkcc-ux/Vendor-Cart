import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Coins, Send, Trash2, Minus } from "lucide-react";
import { format } from "date-fns";
import { useListUsers } from "@workspace/api-client-react";

const BASE = "";

export default function Tokens() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);

  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newEmoji, setNewEmoji] = useState("🪙");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newDesc, setNewDesc] = useState("");

  const [mintUserId, setMintUserId] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [mintNote, setMintNote] = useState("");
  const [mintType, setMintType] = useState<"mint" | "deduct">("mint");

  const authHeader = { Authorization: `Bearer ${token}` };

  const { data: tokensData, isLoading: isTokensLoading } = useQuery({
    queryKey: ["admin-tokens"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tokens`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ["token-ledger"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/token-ledger`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: txnsData } = useQuery({
    queryKey: ["token-transactions"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/token-transactions`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: usersData } = useListUsers({});
  const users = usersData?.data || [];

  const tokens: any[] = tokensData?.data || [];
  const ledger: any[] = ledgerData?.data || [];
  const txns: any[] = txnsData?.data || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/tokens`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, symbol: newSymbol, emoji: newEmoji, color: newColor, description: newDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Token created!" });
      qc.invalidateQueries({ queryKey: ["admin-tokens"] });
      setCreateOpen(false);
      setNewName(""); setNewSymbol(""); setNewEmoji("🪙"); setNewColor("#6366f1"); setNewDesc("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/tokens/${id}`, { method: "DELETE", headers: authHeader });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Token deleted" });
      qc.invalidateQueries({ queryKey: ["admin-tokens"] });
      qc.invalidateQueries({ queryKey: ["token-ledger"] });
    },
    onError: () => toast({ title: "Error deleting token", variant: "destructive" }),
  });

  const mintMutation = useMutation({
    mutationFn: async () => {
      const endpoint = mintType === "mint" ? "mint" : "deduct";
      const res = await fetch(`${BASE}/api/tokens/${selectedToken.id}/${endpoint}`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mintUserId, amount: mintAmount, note: mintNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: mintType === "mint" ? "Tokens minted! ✅" : "Tokens deducted", description: data.message });
      qc.invalidateQueries({ queryKey: ["token-ledger"] });
      qc.invalidateQueries({ queryKey: ["token-transactions"] });
      setMintOpen(false);
      setMintUserId(""); setMintAmount(""); setMintNote("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-8 w-8 text-primary" /> Token Ledger
          </h1>
          <p className="text-muted-foreground mt-1">Create custom tokens and mint them to users.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Token</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Token</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Token Name</Label>
                  <Input placeholder="e.g. Gold Star" value={newName} onChange={e => setNewName(e.target.value)} className="mt-1" />
                </div>
                <div className="w-28">
                  <Label>Symbol</Label>
                  <Input placeholder="GOLD" value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())} className="mt-1 font-mono" maxLength={10} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Emoji / Icon</Label>
                  <Input placeholder="⭐" value={newEmoji} onChange={e => setNewEmoji(e.target.value)} className="mt-1 text-2xl" />
                </div>
                <div className="w-28">
                  <Label>Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
                    <Input value={newColor} onChange={e => setNewColor(e.target.value)} className="font-mono text-xs" />
                  </div>
                </div>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input placeholder="Brief description..." value={newDesc} onChange={e => setNewDesc(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!newName || !newSymbol || createMutation.isPending} className="w-full">
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Token
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Token Types */}
      <Card>
        <CardHeader>
          <CardTitle>Token Types</CardTitle>
          <CardDescription>Tokens available in the system. Click "Mint" to allocate to a user.</CardDescription>
        </CardHeader>
        <CardContent>
          {isTokensLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="text-4xl mb-3">🏦</div>
              <p>No tokens created yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tokens.map((t) => (
                <div key={t.id} className="border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="h-1.5" style={{ backgroundColor: t.color }} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{t.emoji}</span>
                        <div>
                          <p className="font-semibold text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{t.symbol}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => deleteMutation.mutate(t.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    <Dialog open={mintOpen && selectedToken?.id === t.id} onOpenChange={(open) => { setMintOpen(open); if (open) setSelectedToken(t); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full" onClick={() => { setSelectedToken(t); setMintType("mint"); }}>
                          <Send className="mr-2 h-3.5 w-3.5" />Mint / Deduct
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t.emoji} {t.name} — Allocate Tokens</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="flex gap-2">
                            <Button
                              variant={mintType === "mint" ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => setMintType("mint")}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />Mint
                            </Button>
                            <Button
                              variant={mintType === "deduct" ? "destructive" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => setMintType("deduct")}
                            >
                              <Minus className="mr-1 h-3.5 w-3.5" />Deduct
                            </Button>
                          </div>
                          <div>
                            <Label>Select User</Label>
                            <Select value={mintUserId} onValueChange={setMintUserId}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose a user..." />
                              </SelectTrigger>
                              <SelectContent>
                                {users.filter((u: any) => u.role !== "admin").map((u: any) => (
                                  <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name} — {u.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Amount</Label>
                            <Input type="number" min="1" placeholder="e.g. 500" value={mintAmount} onChange={e => setMintAmount(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label>Note (optional)</Label>
                            <Input placeholder="Reason or memo..." value={mintNote} onChange={e => setMintNote(e.target.value)} className="mt-1" />
                          </div>
                          <Button
                            onClick={() => mintMutation.mutate()}
                            disabled={!mintUserId || !mintAmount || mintMutation.isPending}
                            className="w-full"
                            variant={mintType === "deduct" ? "destructive" : "default"}
                          >
                            {mintMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                              mintType === "mint" ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
                            {mintType === "mint" ? "Mint Tokens" : "Deduct Tokens"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Balances</CardTitle>
            <CardDescription>All non-zero token holdings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLedgerLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : ledger.filter(l => l.balance > 0).length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No allocations yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {ledger.filter(l => l.balance > 0).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{l.tokenEmoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{l.userName}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{l.tokenSymbol}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-bold tabular-nums shrink-0">
                      {l.balance.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest mints and deductions</CardDescription>
          </CardHeader>
          <CardContent>
            {txns.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No transactions yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {txns.slice(0, 30).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${t.amount > 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <span className="text-xs font-bold">{t.amount > 0 ? "+" : "−"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.tokenEmoji} {t.tokenSymbol} · {format(new Date(t.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold tabular-nums text-sm shrink-0 ${t.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()}
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
