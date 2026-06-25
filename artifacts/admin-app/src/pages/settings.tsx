import { useState, useEffect } from "react";
import { getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Loader2, ShoppingCart, Wrench, Clock, Gift, Wallet, IndianRupee, Save } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings-full"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [cooldownMin, setCooldownMin] = useState("120");
  const [coinsPerReferral, setCoinsPerReferral] = useState("100");
  const [minWithdrawal, setMinWithdrawal] = useState("1000");
  const [coinsPerRupee, setCoinsPerRupee] = useState("100");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAcceptingOrders(settings.acceptingOrders ?? true);
      setMaintenanceMode(settings.maintenanceMode ?? false);
      setCooldownMin(String(settings.orderCooldownMinutes ?? 120));
      setCoinsPerReferral(String(settings.coinsPerReferral ?? 100));
      setMinWithdrawal(String(settings.minWithdrawalCoins ?? 1000));
      setCoinsPerRupee(String(settings.coinsPerRupee ?? 100));
    }
  }, [settings]);

  const saveSettings = async (patch: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      queryClient.invalidateQueries({ queryKey: ["admin-settings-full"] });
      queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
      toast({ title: "Settings saved", description: "All settings have been updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save settings.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage platform-wide configuration.</p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Store Status</CardTitle>
                <CardDescription>Turn the store on or off for accepting orders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  {acceptingOrders ? "🟢 Store Open — Accepting Orders" : "🔴 Store Closed — Not Accepting Orders"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {acceptingOrders ? "Users can place new orders." : "Order placement is disabled for all users."}
                </p>
              </div>
              <Switch
                checked={acceptingOrders}
                onCheckedChange={async (v) => { setAcceptingOrders(v); await saveSettings({ acceptingOrders: v }); }}
                disabled={saving}
                className="data-[state=checked]:bg-green-500 scale-125 ml-4"
              />
            </div>
            <div className={`p-3 rounded-lg text-sm font-medium border ${acceptingOrders ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
              Status: {acceptingOrders ? "OPEN — Orders are being accepted" : "CLOSED — Orders are paused"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>Maintenance Mode</CardTitle>
                <CardDescription>Put the platform into maintenance mode</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">{maintenanceMode ? "Maintenance Mode On" : "Platform Online"}</Label>
                <p className="text-sm text-muted-foreground">{maintenanceMode ? "Platform is in maintenance mode." : "Platform is operating normally."}</p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={async (v) => { setMaintenanceMode(v); await saveSettings({ maintenanceMode: v }); }}
                disabled={saving}
                className="data-[state=checked]:bg-orange-500 scale-125 ml-4"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-500" />
              <div>
                <CardTitle>Order Cooldown Period</CardTitle>
                <CardDescription>How long users must wait between orders (one item, one order at a time)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input type="number" min="0" max="10080" value={cooldownMin} onChange={e => setCooldownMin(e.target.value)} className="max-w-xs" />
              <Button onClick={() => saveSettings({ orderCooldownMinutes: parseInt(cooldownMin) || 120 })} disabled={saving} variant="outline">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{parseInt(cooldownMin) || 120} minutes = {Math.round((parseInt(cooldownMin) || 120) / 60 * 10) / 10} hours</p>
            <div className="flex gap-2 flex-wrap">
              {[30, 60, 120, 180, 240, 1440].map(min => (
                <Button key={min} variant="outline" size="sm" onClick={() => { setCooldownMin(String(min)); saveSettings({ orderCooldownMinutes: min }); }}>
                  {min >= 60 ? `${min / 60}h` : `${min}m`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-purple-500" />
              <div>
                <CardTitle>Referral Program</CardTitle>
                <CardDescription>Configure coins per referral and withdrawal settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>🪙 Coins per Referral</Label>
                <Input type="number" min="1" value={coinsPerReferral} onChange={e => setCoinsPerReferral(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Min Withdrawal (coins)</Label>
                <Input type="number" min="1" value={minWithdrawal} onChange={e => setMinWithdrawal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Coins per ₹1</Label>
                <Input type="number" min="1" value={coinsPerRupee} onChange={e => setCoinsPerRupee(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p>• Min withdrawal = {parseInt(minWithdrawal) || 1000} coins = ₹{Math.floor((parseInt(minWithdrawal) || 1000) / (parseInt(coinsPerRupee) || 100))}</p>
              <p>• Each referral earns {parseInt(coinsPerReferral) || 100} coins = ₹{Math.floor((parseInt(coinsPerReferral) || 100) / (parseInt(coinsPerRupee) || 100))}</p>
            </div>
            <Button onClick={() => saveSettings({ coinsPerReferral: parseInt(coinsPerReferral) || 100, minWithdrawalCoins: parseInt(minWithdrawal) || 1000, coinsPerRupee: parseInt(coinsPerRupee) || 100 })} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Referral Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
