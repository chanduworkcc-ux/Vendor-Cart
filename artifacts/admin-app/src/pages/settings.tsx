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
import { Loader2, ShoppingCart, Wrench, Clock, Gift, Wallet, IndianRupee, Save, Shield, Lock } from "lucide-react";

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
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [cooldownMin, setCooldownMin] = useState("120");
  const [coinsPerReferral, setCoinsPerReferral] = useState("100");
  const [minWithdrawal, setMinWithdrawal] = useState("1000");
  const [coinsPerRupee, setCoinsPerRupee] = useState("100");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [lockDurationMinutes, setLockDurationMinutes] = useState("30");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAcceptingOrders(settings.acceptingOrders ?? true);
      setMaintenanceMode(settings.maintenanceMode ?? false);
      setReferralEnabled(settings.referralEnabled ?? true);
      setCooldownMin(String(settings.orderCooldownMinutes ?? 120));
      setCoinsPerReferral(String(settings.coinsPerReferral ?? 100));
      setMinWithdrawal(String(settings.minWithdrawalCoins ?? 1000));
      setCoinsPerRupee(String(settings.coinsPerRupee ?? 100));
      setMaxLoginAttempts(String(settings.maxLoginAttempts ?? 5));
      setLockDurationMinutes(String(settings.lockDurationMinutes ?? 30));
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
      toast({ title: "Settings saved", description: "Settings updated successfully." });
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

        {/* Store Status */}
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

        {/* Maintenance Mode */}
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

        {/* Referral Program Toggle */}
        <Card className={referralEnabled ? "border-purple-200" : "border-gray-300"}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Gift className={`h-6 w-6 ${referralEnabled ? "text-purple-500" : "text-gray-400"}`} />
              <div>
                <CardTitle>Referral Program</CardTitle>
                <CardDescription>Enable or disable the entire referral program for all users</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  {referralEnabled ? "🟢 Referral Program Active" : "🔴 Referral Program Stopped"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {referralEnabled
                    ? "Users earn coins when friends join using their referral code."
                    : "No coins will be awarded for referrals. Existing balances are unaffected."}
                </p>
              </div>
              <Switch
                checked={referralEnabled}
                onCheckedChange={async (v) => { setReferralEnabled(v); await saveSettings({ referralEnabled: v }); }}
                disabled={saving}
                className="data-[state=checked]:bg-purple-500 scale-125 ml-4"
              />
            </div>
            <div className={`p-3 rounded-lg text-sm font-medium border ${referralEnabled ? "bg-purple-50 text-purple-800 border-purple-200" : "bg-gray-100 text-gray-600 border-gray-300"}`}>
              {referralEnabled ? "✅ Referral program is RUNNING — coins awarded on valid referrals" : "⛔ Referral program is STOPPED — no coins will be awarded"}
            </div>

            {/* Referral Settings (only when enabled) */}
            {referralEnabled && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">Referral Program Settings</p>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Cooldown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-500" />
              <div>
                <CardTitle>Order Cooldown Period</CardTitle>
                <CardDescription>How long users must wait between orders</CardDescription>
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

        {/* Security Settings */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-red-500" />
              <div>
                <CardTitle>Security & Login Protection</CardTitle>
                <CardDescription>Brute-force protection — lock accounts after too many failed logins</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Max Login Attempts
                </Label>
                <Input type="number" min="1" max="20" value={maxLoginAttempts} onChange={e => setMaxLoginAttempts(e.target.value)} />
                <p className="text-xs text-muted-foreground">Account locks after this many failed logins</p>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Lock Duration (minutes)
                </Label>
                <Input type="number" min="1" max="10080" value={lockDurationMinutes} onChange={e => setLockDurationMinutes(e.target.value)} />
                <p className="text-xs text-muted-foreground">How long the account stays locked</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "5 attempts / 15 min", attempts: 5, duration: 15 },
                { label: "3 attempts / 30 min", attempts: 3, duration: 30 },
                { label: "10 attempts / 60 min", attempts: 10, duration: 60 },
              ].map(preset => (
                <Button key={preset.label} variant="outline" size="sm"
                  onClick={() => { setMaxLoginAttempts(String(preset.attempts)); setLockDurationMinutes(String(preset.duration)); saveSettings({ maxLoginAttempts: preset.attempts, lockDurationMinutes: preset.duration }); }}>
                  {preset.label}
                </Button>
              ))}
            </div>
            <Button onClick={() => saveSettings({ maxLoginAttempts: parseInt(maxLoginAttempts) || 5, lockDurationMinutes: parseInt(lockDurationMinutes) || 30 })} disabled={saving} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Security Settings
            </Button>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1">
              <p>• After {parseInt(maxLoginAttempts) || 5} failed attempts → account locked for {parseInt(lockDurationMinutes) || 30} minutes</p>
              <p>• Go to <strong>Security Center</strong> to view locked accounts, block IPs, and see suspicious activity</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
