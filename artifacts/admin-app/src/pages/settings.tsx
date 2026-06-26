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
import { Loader2, ShoppingCart, Wrench, Clock, Gift, Save, Shield, Lock, LogIn, UserPlus, UserCheck } from "lucide-react";

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
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
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
      setLoginEnabled(settings.loginEnabled ?? true);
      setSignupEnabled(settings.signupEnabled ?? true);
      setAutoApprove(settings.autoApproveRegistrations ?? false);
      setCooldownMin(String(settings.orderCooldownMinutes ?? 120));
      setCoinsPerReferral(String(settings.coinsPerReferral ?? 100));
      setMinWithdrawal(String(settings.minWithdrawalCoins ?? 1000));
      setCoinsPerRupee(String(settings.coinsPerRupee ?? 100));
      setMaxLoginAttempts(String(settings.maxLoginAttempts ?? 5));
      setLockDurationMinutes(String(settings.lockDurationMinutes ?? 30));
    }
  }, [settings]);

  const save = async (patch: Record<string, any>) => {
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
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const Toggle = ({ checked, onToggle, disabled }: { checked: boolean; onToggle: (v: boolean) => void; disabled?: boolean }) => (
    <Switch checked={checked} onCheckedChange={onToggle} disabled={saving || disabled} className="data-[state=checked]:bg-green-500 scale-125 ml-4" />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage all platform-wide configuration.</p>
      </div>

      <div className="grid gap-4 max-w-2xl">

        {/* ─── Login & Signup ─────────────────────────────────────────── */}
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <LogIn className="h-6 w-6 text-blue-500" />
              <div><CardTitle>Login & Sign-up System</CardTitle><CardDescription>Control who can enter the platform</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium flex items-center gap-1.5"><LogIn className="h-4 w-4" /> {loginEnabled ? "🟢 Login Enabled" : "🔴 Login Disabled"}</Label>
                <p className="text-sm text-muted-foreground mt-0.5">{loginEnabled ? "Existing users can sign in." : "No one can log in (except if already in session)."}</p>
              </div>
              <Toggle checked={loginEnabled} onToggle={async v => { setLoginEnabled(v); await save({ loginEnabled: v }); }} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium flex items-center gap-1.5"><UserPlus className="h-4 w-4" /> {signupEnabled ? "🟢 Sign-up Enabled" : "🔴 Sign-up Disabled"}</Label>
                <p className="text-sm text-muted-foreground mt-0.5">{signupEnabled ? "New users can register." : "New registrations are blocked."}</p>
              </div>
              <Toggle checked={signupEnabled} onToggle={async v => { setSignupEnabled(v); await save({ signupEnabled: v }); }} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium flex items-center gap-1.5"><UserCheck className="h-4 w-4" /> {autoApprove ? "🟢 Auto-Approve ON" : "🔵 Manual Approval"}</Label>
                <p className="text-sm text-muted-foreground mt-0.5">{autoApprove ? "New accounts are approved instantly after email verification." : "Admin must manually approve each new account."}</p>
              </div>
              <Toggle checked={autoApprove} onToggle={async v => { setAutoApprove(v); await save({ autoApproveRegistrations: v }); }} />
            </div>

            <div className={`p-3 rounded-lg text-xs font-medium border ${loginEnabled && signupEnabled ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
              {loginEnabled && signupEnabled ? "✅ Platform is fully open — Login & Sign-up active" :
               !loginEnabled && !signupEnabled ? "⛔ Platform is fully closed — Login & Sign-up both disabled" :
               !loginEnabled ? "⚠️ Login disabled — existing users cannot sign in" :
               "ℹ️ Sign-up disabled — no new registrations allowed"}
            </div>
          </CardContent>
        </Card>

        {/* ─── Store Status ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <div><CardTitle>Store Status</CardTitle><CardDescription>Turn order acceptance on or off</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{acceptingOrders ? "🟢 Store Open" : "🔴 Store Closed"}</Label>
                <p className="text-sm text-muted-foreground">{acceptingOrders ? "Users can place orders." : "Order placement is disabled."}</p>
              </div>
              <Toggle checked={acceptingOrders} onToggle={async v => { setAcceptingOrders(v); await save({ acceptingOrders: v }); }} />
            </div>
          </CardContent>
        </Card>

        {/* ─── Maintenance Mode ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-orange-500" />
              <div><CardTitle>Maintenance Mode</CardTitle><CardDescription>Put the platform into maintenance</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{maintenanceMode ? "Maintenance ON" : "Platform Online"}</Label>
                <p className="text-sm text-muted-foreground">{maintenanceMode ? "Maintenance mode active." : "Operating normally."}</p>
              </div>
              <Toggle checked={maintenanceMode} onToggle={async v => { setMaintenanceMode(v); await save({ maintenanceMode: v }); }} />
            </div>
          </CardContent>
        </Card>

        {/* ─── Referral Program ─────────────────────────────────────────── */}
        <Card className={referralEnabled ? "border-purple-200" : ""}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Gift className={`h-6 w-6 ${referralEnabled ? "text-purple-500" : "text-gray-400"}`} />
              <div><CardTitle>Referral Program</CardTitle><CardDescription>Enable or disable referral coin rewards</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{referralEnabled ? "🟢 Referral Program Active" : "🔴 Referral Program Stopped"}</Label>
                <p className="text-sm text-muted-foreground">{referralEnabled ? "Coins awarded on valid referrals." : "No coins awarded for referrals."}</p>
              </div>
              <Toggle checked={referralEnabled} onToggle={async v => { setReferralEnabled(v); await save({ referralEnabled: v }); }} />
            </div>
            {referralEnabled && (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5"><Label>🪙 Coins per Referral</Label><Input type="number" min="1" value={coinsPerReferral} onChange={e => setCoinsPerReferral(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Min Withdrawal (coins)</Label><Input type="number" min="1" value={minWithdrawal} onChange={e => setMinWithdrawal(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Coins per ₹1</Label><Input type="number" min="1" value={coinsPerRupee} onChange={e => setCoinsPerRupee(e.target.value)} /></div>
                </div>
                <Button onClick={() => save({ coinsPerReferral: parseInt(coinsPerReferral) || 100, minWithdrawalCoins: parseInt(minWithdrawal) || 1000, coinsPerRupee: parseInt(coinsPerRupee) || 100 })} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Referral Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Order Cooldown ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-500" />
              <div><CardTitle>Order Cooldown</CardTitle><CardDescription>Wait time between user orders</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input type="number" min="0" max="10080" value={cooldownMin} onChange={e => setCooldownMin(e.target.value)} className="max-w-xs" />
              <Button onClick={() => save({ orderCooldownMinutes: parseInt(cooldownMin) || 120 })} disabled={saving} variant="outline">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{parseInt(cooldownMin) || 120} min = {Math.round((parseInt(cooldownMin) || 120) / 60 * 10) / 10} hours</p>
            <div className="flex gap-2 flex-wrap">
              {[30, 60, 120, 180, 240, 1440].map(m => (
                <Button key={m} variant="outline" size="sm" onClick={() => { setCooldownMin(String(m)); save({ orderCooldownMinutes: m }); }}>
                  {m >= 60 ? `${m / 60}h` : `${m}m`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Security ─────────────────────────────────────────────────── */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-red-500" />
              <div><CardTitle>Login Protection</CardTitle><CardDescription>Brute-force lockout settings</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Max Login Attempts</Label>
                <Input type="number" min="1" max="20" value={maxLoginAttempts} onChange={e => setMaxLoginAttempts(e.target.value)} />
                <p className="text-xs text-muted-foreground">Locks account after this many failures</p>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Lock Duration (minutes)</Label>
                <Input type="number" min="1" value={lockDurationMinutes} onChange={e => setLockDurationMinutes(e.target.value)} />
                <p className="text-xs text-muted-foreground">How long the lockout lasts</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[{ label: "5 att / 15 min", a: 5, d: 15 }, { label: "3 att / 30 min", a: 3, d: 30 }, { label: "10 att / 60 min", a: 10, d: 60 }].map(p => (
                <Button key={p.label} variant="outline" size="sm" onClick={() => { setMaxLoginAttempts(String(p.a)); setLockDurationMinutes(String(p.d)); save({ maxLoginAttempts: p.a, lockDurationMinutes: p.d }); }}>{p.label}</Button>
              ))}
            </div>
            <Button onClick={() => save({ maxLoginAttempts: parseInt(maxLoginAttempts) || 5, lockDurationMinutes: parseInt(lockDurationMinutes) || 30 })} disabled={saving} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Security Settings
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
