import { useState } from "react";
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
import { User, Lock, Globe, Palette, HelpCircle, Loader2, CheckCircle } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic / عربي" },
  { code: "fr", label: "French / Français" },
  { code: "es", label: "Spanish / Español" },
  { code: "de", label: "German / Deutsch" },
  { code: "zh", label: "Chinese / 中文" },
  { code: "hi", label: "Hindi / हिन्दी" },
  { code: "pt", label: "Portuguese / Português" },
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

  const [name, setName] = useState(user?.name || "");
  const [language, setLanguage] = useState((user as any)?.language || "en");
  const [theme, setTheme] = useState((user as any)?.theme || "light");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ name, language, theme }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update profile", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters required", variant: "destructive" }); return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${BASE}/api/profile/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Password changed", description: "Your password has been updated." });
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

        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle>Account Information</CardTitle><CardDescription>Update your name and email preferences.</CardDescription></CardHeader>
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
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
              <Button onClick={changePassword} disabled={changingPassword || !currentPassword || !newPassword} className="w-full sm:w-auto">
                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose how the application looks.</CardDescription></CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div>
                <Label className="text-base font-medium">Theme</Label>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {THEMES.map(t => (
                    <button key={t.value} onClick={() => setTheme(t.value)}
                      className={`relative p-4 rounded-xl border-2 text-center transition-all cursor-pointer
                        ${theme === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                      {theme === t.value && <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                      <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${t.value === "light" ? "bg-white border" : t.value === "dark" ? "bg-gray-900" : "bg-gradient-to-br from-white to-gray-900"}`} />
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Appearance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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
                    <h3 className="font-semibold">Documentation</h3>
                    <p className="text-sm text-muted-foreground">Browse our help center and FAQs</p>
                    <Button variant="outline" className="w-full">Visit Help Center</Button>
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
