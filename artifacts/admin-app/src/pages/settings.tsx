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
import {
  Loader2, ShoppingCart, Wrench, Clock, Gift, Save, Shield, Lock,
  LogIn, UserPlus, UserCheck, CreditCard, Truck, Globe, Bell, Megaphone, Trash2, Plus,
  Smartphone, RefreshCw, Image as ImageIcon, Download, Palette, Languages,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const BASE = "";

interface Announcement { id: number; text: string; isActive: boolean; createdAt: string; }

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

  const { data: annData, refetch: refetchAnn } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  // Store settings state
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [guestModeEnabled, setGuestModeEnabled] = useState(false);
  const [cooldownMin, setCooldownMin] = useState("120");
  const [coinsPerReferral, setCoinsPerReferral] = useState("100");
  const [minWithdrawal, setMinWithdrawal] = useState("1000");
  const [coinsPerRupee, setCoinsPerRupee] = useState("100");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [lockDurationMinutes, setLockDurationMinutes] = useState("30");
  // Payment settings
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [codEnabled, setCodEnabled] = useState(true);
  const [paymentGateway, setPaymentGateway] = useState("cod_only");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  // App Configuration (Remote Config + Force Update)
  const [logoUrl, setLogoUrl] = useState("");
  const [currentAppVersion, setCurrentAppVersion] = useState("1.0.0");
  const [minRequiredVersion, setMinRequiredVersion] = useState("1.0.0");
  const [updateDownloadLink, setUpdateDownloadLink] = useState("");
  const [forceUpdateEnabled, setForceUpdateEnabled] = useState(false);
  // Appearance & branding
  const [storeName, setStoreName] = useState("XyloCart");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [defaultTheme, setDefaultTheme] = useState("light");
  // Language
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  // Announcements
  const [newAnnText, setNewAnnText] = useState("");
  const [addingAnn, setAddingAnn] = useState(false);

  const [saving, setSaving] = useState(false);

  const announcements: Announcement[] = annData?.data || [];

  useEffect(() => {
    if (settings) {
      setAcceptingOrders(settings.acceptingOrders ?? true);
      setMaintenanceMode(settings.maintenanceMode ?? false);
      setReferralEnabled(settings.referralEnabled ?? true);
      setLoginEnabled(settings.loginEnabled ?? true);
      setSignupEnabled(settings.signupEnabled ?? true);
      setAutoApprove(settings.autoApproveRegistrations ?? false);
      setGuestModeEnabled(settings.guestModeEnabled ?? false);
      setCooldownMin(String(settings.orderCooldownMinutes ?? 120));
      setCoinsPerReferral(String(settings.coinsPerReferral ?? 100));
      setMinWithdrawal(String(settings.minWithdrawalCoins ?? 1000));
      setCoinsPerRupee(String(settings.coinsPerRupee ?? 100));
      setMaxLoginAttempts(String(settings.maxLoginAttempts ?? 5));
      setLockDurationMinutes(String(settings.lockDurationMinutes ?? 30));
      setMinOrderAmount(String(settings.minOrderAmount ?? 0));
      setCodEnabled(settings.codEnabled ?? true);
      setPaymentGateway(settings.paymentGateway ?? "cod_only");
      setRazorpayKeyId(settings.razorpayKeyId ?? "");
      setStripePublishableKey(settings.stripePublishableKey ?? "");
      setLogoUrl(settings.logoUrl ?? "");
      setCurrentAppVersion(settings.currentAppVersion ?? "1.0.0");
      setMinRequiredVersion(settings.minRequiredVersion ?? "1.0.0");
      setUpdateDownloadLink(settings.updateDownloadLink ?? "");
      setForceUpdateEnabled(settings.forceUpdateEnabled ?? false);
      setStoreName(settings.storeName ?? "XyloCart");
      setPrimaryColor(settings.primaryColor ?? "#3b82f6");
      setDefaultTheme(settings.defaultTheme ?? "light");
      setDefaultLanguage(settings.defaultLanguage ?? "en");
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

  const addAnnouncement = async () => {
    if (!newAnnText.trim()) return;
    setAddingAnn(true);
    try {
      const res = await fetch(`${BASE}/api/announcements`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: newAnnText.trim() }) });
      if (!res.ok) throw new Error();
      refetchAnn();
      setNewAnnText("");
      toast({ title: "Announcement added" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setAddingAnn(false); }
  };

  const toggleAnnouncement = async (a: Announcement) => {
    try {
      await fetch(`${BASE}/api/announcements/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive: !a.isActive }) });
      refetchAnn();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const deleteAnnouncement = async (id: number) => {
    try {
      await fetch(`${BASE}/api/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      refetchAnn();
      toast({ title: "Removed" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const Toggle = ({ checked, onToggle, disabled }: { checked: boolean; onToggle: (v: boolean) => void; disabled?: boolean }) => (
    <Switch checked={checked} onCheckedChange={onToggle} disabled={saving || disabled} className="data-[state=checked]:bg-green-500 scale-125 ml-4" />
  );

  const needsRazorpay = paymentGateway === "razorpay" || paymentGateway === "all";
  const needsStripe = paymentGateway === "stripe" || paymentGateway === "all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage all platform-wide configuration.</p>
      </div>

      <div className="grid gap-4 max-w-2xl">

        {/* ─── Announcements ────────────────────────────────────────────── */}
        <Card className="border-yellow-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-yellow-500" />
              <div><CardTitle>Announcements</CardTitle><CardDescription>Banners shown to customers in the app</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
              {announcements.map(a => (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border ${a.isActive ? "border-green-200 bg-green-50/50" : "opacity-60"}`}>
                  <Bell className="h-4 w-4 text-yellow-500 shrink-0" />
                  <span className="flex-1 text-sm">{a.text}</span>
                  <Badge variant={a.isActive ? "default" : "secondary"} className="text-xs">{a.isActive ? "Active" : "Off"}</Badge>
                  <Switch checked={a.isActive} onCheckedChange={() => toggleAnnouncement(a)} className="scale-90" />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => deleteAnnouncement(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Input placeholder="e.g. Free shipping on orders above ₹499!" value={newAnnText} onChange={e => setNewAnnText(e.target.value)} onKeyDown={e => e.key === "Enter" && addAnnouncement()} className="text-sm" />
              <Button variant="outline" size="sm" onClick={addAnnouncement} disabled={addingAnn}>
                {addingAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground mt-0.5">{autoApprove ? "New accounts approved instantly." : "Admin must manually approve each new account."}</p>
              </div>
              <Toggle checked={autoApprove} onToggle={async v => { setAutoApprove(v); await save({ autoApproveRegistrations: v }); }} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium flex items-center gap-1.5"><Globe className="h-4 w-4" /> {guestModeEnabled ? "🟢 Guest Mode ON" : "🔵 Guest Mode OFF"}</Label>
                <p className="text-sm text-muted-foreground mt-0.5">{guestModeEnabled ? "Users can browse and shop without signing in." : "Login required to use the app."}</p>
              </div>
              <Toggle checked={guestModeEnabled} onToggle={async v => { setGuestModeEnabled(v); await save({ guestModeEnabled: v }); }} />
            </div>

            <div className={`p-3 rounded-lg text-xs font-medium border ${loginEnabled && signupEnabled ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
              {loginEnabled && signupEnabled ? "✅ Platform is fully open — Login & Sign-up active" :
               !loginEnabled && !signupEnabled ? "⛔ Platform is fully closed — Login & Sign-up both disabled" :
               !loginEnabled ? "⚠️ Login disabled — existing users cannot sign in" :
               "ℹ️ Sign-up disabled — no new registrations allowed"}
            </div>
          </CardContent>
        </Card>

        {/* ─── Payment & Checkout ──────────────────────────────────────── */}
        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-green-600" />
              <div><CardTitle>Payment & Checkout</CardTitle><CardDescription>Configure payment gateways, COD, and minimum order</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Min order amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ShoppingCart className="h-4 w-4" /> Minimum Order Amount (₹)</Label>
              <div className="flex gap-2 max-w-xs">
                <Input type="number" min="0" value={minOrderAmount} onChange={e => setMinOrderAmount(e.target.value)} />
                <Button variant="outline" onClick={() => save({ minOrderAmount: parseInt(minOrderAmount) || 0 })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{parseInt(minOrderAmount) === 0 ? "No minimum order amount" : `Orders below ₹${minOrderAmount} will be rejected`}</p>
            </div>

            {/* COD toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium flex items-center gap-1.5"><Truck className="h-4 w-4" /> {codEnabled ? "🟢 Cash on Delivery ON" : "🔴 Cash on Delivery OFF"}</Label>
                <p className="text-sm text-muted-foreground mt-0.5">{codEnabled ? "Customers can pay on delivery." : "COD not available — online payment only."}</p>
              </div>
              <Toggle checked={codEnabled} onToggle={async v => { setCodEnabled(v); await save({ codEnabled: v }); }} />
            </div>

            {/* Payment gateway selector */}
            <div className="space-y-2">
              <Label>Active Payment Gateway</Label>
              <Select value={paymentGateway} onValueChange={v => { setPaymentGateway(v); save({ paymentGateway: v }); }}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod_only">COD Only (no online payment)</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="all">All (Razorpay + Stripe + COD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Razorpay credentials */}
            {needsRazorpay && (
              <div className="space-y-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-800">Razorpay Configuration</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Key ID</Label>
                    <Input placeholder="rzp_live_..." value={razorpayKeyId} onChange={e => setRazorpayKeyId(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Key Secret</Label>
                    <Input type="password" placeholder="Secret key" value={razorpayKeySecret} onChange={e => setRazorpayKeySecret(e.target.value)} />
                  </div>
                </div>
                <Button size="sm" onClick={() => save({ razorpayKeyId, razorpayKeySecret })} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />} Save Razorpay Keys
                </Button>
              </div>
            )}

            {/* Stripe credentials */}
            {needsStripe && (
              <div className="space-y-3 p-4 rounded-lg bg-violet-50 border border-violet-200">
                <p className="text-sm font-semibold text-violet-800">Stripe Configuration</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Publishable Key</Label>
                    <Input placeholder="pk_live_..." value={stripePublishableKey} onChange={e => setStripePublishableKey(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Secret Key</Label>
                    <Input type="password" placeholder="sk_live_..." value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} />
                  </div>
                </div>
                <Button size="sm" onClick={() => save({ stripePublishableKey, stripeSecretKey })} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />} Save Stripe Keys
                </Button>
              </div>
            )}
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

        {/* ─── App Configuration ─────────────────────────────────────── */}
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6 text-blue-500" />
              <div><CardTitle>App Configuration</CardTitle><CardDescription>Remote config, logo, and forced update engine</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Displayed on loading screens and update pages</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Current App Version</Label>
                <Input
                  placeholder="1.0.0"
                  value={currentAppVersion}
                  onChange={e => setCurrentAppVersion(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Latest published version of the app</p>
              </div>
              <div className="space-y-1.5">
                <Label>Minimum Required Version</Label>
                <Input
                  placeholder="1.0.0"
                  value={minRequiredVersion}
                  onChange={e => setMinRequiredVersion(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Versions below this trigger forced update</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Download Link</Label>
              <Input
                placeholder="https://play.google.com/store/apps/..."
                value={updateDownloadLink}
                onChange={e => setUpdateDownloadLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">URL shown on the forced update screen</p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-blue-500" /> Force Update Active</p>
                <p className="text-sm text-muted-foreground">When on, users below the min version cannot proceed</p>
              </div>
              <Switch
                checked={forceUpdateEnabled}
                onCheckedChange={v => { setForceUpdateEnabled(v); save({ forceUpdateEnabled: v }); }}
              />
            </div>

            <Button
              onClick={() => save({ logoUrl: logoUrl || null, currentAppVersion, minRequiredVersion, updateDownloadLink: updateDownloadLink || null, forceUpdateEnabled })}
              disabled={saving}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save App Configuration
            </Button>
          </CardContent>
        </Card>

        {/* ─── Appearance & Branding ────────────────────────────────────── */}
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="h-6 w-6 text-purple-500" />
              <div><CardTitle>Appearance & Branding</CardTitle><CardDescription>Customize the platform's name, colors, and default theme</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>Store / Platform Name</Label>
              <Input
                placeholder="XyloCart"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">Shown in app headers and email templates</p>
            </div>

            <div className="space-y-1.5">
              <Label>Primary Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded-md border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="max-w-[140px] font-mono"
                  maxLength={7}
                />
                <span className="text-sm text-muted-foreground">Used for buttons and highlights</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Default Platform Theme</Label>
              <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">☀️ Light</SelectItem>
                  <SelectItem value="dark">🌙 Dark</SelectItem>
                  <SelectItem value="system">🖥️ System Default</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Applied to new users before they set their own preference</p>
            </div>

            <Button
              onClick={() => save({ storeName: storeName || "XyloCart", primaryColor: primaryColor || "#3b82f6", defaultTheme })}
              disabled={saving}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Appearance
            </Button>
          </CardContent>
        </Card>

        {/* ─── Language & Localization ──────────────────────────────────── */}
        <Card className="border-teal-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Languages className="h-6 w-6 text-teal-500" />
              <div><CardTitle>Language & Localization</CardTitle><CardDescription>Set the platform's default language for new users</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Default Platform Language</Label>
              <Select value={defaultLanguage} onValueChange={v => { setDefaultLanguage(v); save({ defaultLanguage: v }); }}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { code: "en", label: "English" },
                    { code: "ar", label: "Arabic / عربي" },
                    { code: "fr", label: "French / Français" },
                    { code: "es", label: "Spanish / Español" },
                    { code: "de", label: "German / Deutsch" },
                    { code: "zh", label: "Chinese / 中文" },
                    { code: "hi", label: "Hindi / हिन्दी" },
                    { code: "pt", label: "Portuguese / Português" },
                    { code: "bn", label: "Bengali / বাংলা" },
                    { code: "ta", label: "Tamil / தமிழ்" },
                    { code: "te", label: "Telugu / తెలుగు" },
                    { code: "mr", label: "Marathi / मराठी" },
                    { code: "gu", label: "Gujarati / ગુજરાતી" },
                    { code: "kn", label: "Kannada / ಕನ್ನಡ" },
                    { code: "ml", label: "Malayalam / മലയാളം" },
                    { code: "pa", label: "Punjabi / ਪੰਜਾਬੀ" },
                    { code: "ur", label: "Urdu / اردو" },
                  ].map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Saved automatically on selection. Users can override their own language in Profile Settings.</p>
            </div>
            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-sm text-teal-800">
              <Globe className="h-4 w-4 inline mr-1.5" />
              Currently set to: <strong>{[
                { code: "en", label: "English" }, { code: "ar", label: "Arabic" }, { code: "fr", label: "French" },
                { code: "es", label: "Spanish" }, { code: "de", label: "German" }, { code: "zh", label: "Chinese" },
                { code: "hi", label: "Hindi" }, { code: "pt", label: "Portuguese" }, { code: "bn", label: "Bengali" },
                { code: "ta", label: "Tamil" }, { code: "te", label: "Telugu" }, { code: "mr", label: "Marathi" },
                { code: "gu", label: "Gujarati" }, { code: "kn", label: "Kannada" }, { code: "ml", label: "Malayalam" },
                { code: "pa", label: "Punjabi" }, { code: "ur", label: "Urdu" },
              ].find(l => l.code === defaultLanguage)?.label ?? defaultLanguage}</strong>
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
