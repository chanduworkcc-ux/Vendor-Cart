import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Globe, Palette, HelpCircle, Loader2, CheckCircle, Phone, MapPin, Wallet } from "lucide-react";
import { Link } from "wouter";

const BASE = "";

const LANGUAGES = [
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
];

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System Default" },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("light");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [upiId, setUpiId] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setLanguage((user as any).language || "en");
      setTheme((user as any).theme || "light");
      setPhone((user as any).phone || "");
      setAddress((user as any).address || "");
      setUpiId((user as any).upiId || "");
    }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ name, language, theme, phone, address, upiId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated ✅", description: "Your changes have been saved." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update profile", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveTheme = async (newTheme: string) => {
    setTheme(newTheme);
    try {
      const res = await fetch(`${BASE}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ theme: newTheme }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Theme updated ✅", description: `Theme set to ${newTheme}.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update theme", variant: "destructive" });
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Password too short", description: "At least 6 characters required", variant: "destructive" }); return; }
    setChangingPassword(true);
    try {
      const res = await fetch(`${BASE}/api/profile/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Password changed ✅", description: "Your password has been updated." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to change password", variant: "destructive" });
    } finally { setChangingPassword(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and security.</p>
      </div>

      <Tabs defaultValue="account">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="account"><User className="mr-1 h-4 w-4 hidden sm:inline" />Account</TabsTrigger>
          <TabsTrigger value="security"><Lock className="mr-1 h-4 w-4 hidden sm:inline" />Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-1 h-4 w-4 hidden sm:inline" />Appearance</TabsTrigger>
          <TabsTrigger value="support"><HelpCircle className="mr-1 h-4 w-4 hidden sm:inline" />Support</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your name, contact info, and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-lg">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={(user as any)?.role === "admin" ? "default" : "secondary"} className="capitalize">{(user as any)?.role}</Badge>
                    <Badge variant={(user as any)?.status === "approved" ? "default" : "destructive"} className="capitalize">{(user as any)?.status}</Badge>
                  </div>
                  {(user as any)?.referralCode && (
                    <p className="text-xs text-muted-foreground mt-1">Referral Code: <span className="font-mono font-bold text-primary">{(user as any).referralCode}</span></p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={user?.email} disabled className="mt-1 bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number</Label>
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="address" className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</Label>
                  <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Your delivery address" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="upiId" className="flex items-center gap-1"><Wallet className="h-3 w-3" /> UPI ID</Label>
                  <Input id="upiId" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi or 9876543210@paytm" className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Used for coin withdrawals from your referral earnings.</p>
                </div>
                <div>
                  <Label>Language / भाषा</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle>Security</CardTitle><CardDescription>Change your password to keep your account secure.</CardDescription></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={changePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full sm:w-auto">
                {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Change Password
              </Button>
              <Separator />
              <div>
                <p className="font-medium text-sm mb-2">Account Actions</p>
                <Button variant="destructive" onClick={logout} className="w-full sm:w-auto">Sign Out</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose how the application looks.</CardDescription></CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div>
                <Label className="text-base font-medium">Theme</Label>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {THEMES.map(t => (
                    <button key={t.value} onClick={() => saveTheme(t.value)}
                      className={`relative p-4 rounded-xl border-2 text-center transition-all cursor-pointer
                        ${theme === t.value ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"}`}>
                      {theme === t.value && <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                      <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${
                        t.value === "light" ? "bg-white border shadow-sm" :
                        t.value === "dark" ? "bg-gray-900" :
                        "bg-gradient-to-br from-white to-gray-900"
                      }`} />
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Theme is saved automatically when you click.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support">
          <Card>
            <CardHeader><CardTitle>Customer Support</CardTitle><CardDescription>Get help or raise a support ticket.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-primary/20">
                  <CardContent className="pt-6 text-center space-y-3">
                    <HelpCircle className="h-10 w-10 text-primary mx-auto" />
                    <h3 className="font-semibold">Support Tickets</h3>
                    <p className="text-sm text-muted-foreground">Raise a ticket and chat with our support team</p>
                    <Link href="/tickets">
                      <Button className="w-full">View My Tickets</Button>
                    </Link>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="pt-6 text-center space-y-3">
                    <Globe className="h-10 w-10 text-blue-500 mx-auto" />
                    <h3 className="font-semibold">Referral & Coins</h3>
                    <p className="text-sm text-muted-foreground">Earn coins by referring friends, withdraw to UPI</p>
                    <Link href="/referral">
                      <Button variant="outline" className="w-full">View Referrals</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium">Contact Information</p>
                <p className="text-sm text-muted-foreground">Email: support@platform.com</p>
                <p className="text-sm text-muted-foreground">Hours: Monday - Friday, 9 AM - 6 PM</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
