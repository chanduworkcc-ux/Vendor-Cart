import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, RefreshCw, Search, AlertCircle, CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";
import { useState } from "react";

const BASE = "";

interface PaymentLog {
  id: string;
  amount: number;
  amountReceived: number;
  currency: string;
  status: string;
  description: string | null;
  customerEmail: string | null;
  customerId: string | null;
  paymentMethod: string;
  receiptEmail: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  canceledAt: string | null;
  cancellationReason: string | null;
  errorMessage: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType; color: string }> = {
  succeeded: { label: "Succeeded", variant: "default", icon: CheckCircle2, color: "text-green-600" },
  requires_payment_method: { label: "Requires Payment", variant: "secondary", icon: Clock, color: "text-yellow-600" },
  requires_confirmation: { label: "Requires Confirmation", variant: "secondary", icon: Clock, color: "text-yellow-600" },
  requires_action: { label: "Requires Action", variant: "secondary", icon: Clock, color: "text-orange-600" },
  processing: { label: "Processing", variant: "secondary", icon: Loader2, color: "text-blue-600" },
  canceled: { label: "Canceled", variant: "destructive", icon: XCircle, color: "text-red-600" },
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount / 100);
}

export default function PaymentLogs() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<{ data: PaymentLog[]; hasMore: boolean }>({
    queryKey: ["admin-payment-logs"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/payment-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load payment logs");
      }
      return res.json();
    },
    enabled: !!token,
    staleTime: 60_000,
  });

  const logs = data?.data ?? [];
  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.id.toLowerCase().includes(q) ||
      l.customerEmail?.toLowerCase().includes(q) ||
      l.receiptEmail?.toLowerCase().includes(q) ||
      l.status.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    );
  });

  const totalSucceeded = logs.filter(l => l.status === "succeeded").reduce((s, l) => s + l.amountReceived, 0);
  const succeededCount = logs.filter(l => l.status === "succeeded").length;
  const failedCount = logs.filter(l => l.status === "canceled" || l.status === "requires_payment_method").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Gateway Logs</h1>
          <p className="text-muted-foreground mt-1">Stripe transaction history and run details.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {!isError && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold text-green-600">
                    {isLoading ? "—" : logs.length > 0 ? formatAmount(totalSucceeded, logs[0]?.currency ?? "USD") : "$0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Successful Payments</p>
                  <p className="text-2xl font-bold">{isLoading ? "—" : succeededCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed / Canceled</p>
                  <p className="text-2xl font-bold">{isLoading ? "—" : failedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Most recent 100 payment intents from Stripe</CardDescription>
            </div>
          </div>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, email, or status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium text-destructive">Could not load payment logs</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {(error as Error)?.message || "Failed to connect to Stripe. Make sure the Stripe integration is connected in the Integrations tab."}
              </p>
              <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              {search ? "No transactions match your search." : "No payment transactions found."}
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map(log => {
                const cfg = STATUS_CONFIG[log.status] ?? { label: log.status, variant: "outline" as const, icon: Clock, color: "text-muted-foreground" };
                const Icon = cfg.icon;
                return (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-full bg-muted ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground truncate">{log.id}</p>
                        <p className="font-medium text-sm">
                          {formatAmount(log.amountReceived > 0 ? log.amountReceived : log.amount, log.currency)}
                          {" "}
                          <span className="text-muted-foreground font-normal">{log.currency}</span>
                        </p>
                        {(log.customerEmail || log.receiptEmail) && (
                          <p className="text-xs text-muted-foreground truncate">{log.customerEmail ?? log.receiptEmail}</p>
                        )}
                        {log.description && (
                          <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                        )}
                        {log.errorMessage && (
                          <p className="text-xs text-destructive truncate">⚠ {log.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
                      <Badge variant={cfg.variant} className="text-xs whitespace-nowrap">{cfg.label}</Badge>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {data?.hasMore && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Showing most recent 100 transactions. Use the Stripe dashboard to view older records.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
