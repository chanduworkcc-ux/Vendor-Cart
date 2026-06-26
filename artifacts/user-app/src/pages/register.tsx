import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, User, Phone, MessageSquare, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const BASE = "";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [signupEnabled, setSignupEnabled] = useState(true);
  const [checking, setChecking] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    fetch(`${BASE}/api/auth/public-settings`)
      .then(r => r.json())
      .then(d => { setSignupEnabled(d.signupEnabled !== false); })
      .catch(() => setSignupEnabled(true))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  // Prefill referral from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      toast({ title: "All fields are required", variant: "destructive" }); return;
    }
    if (password.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    if (!/^\d{10,15}$/.test(phone.replace(/\s/g, ""))) { toast({ title: "Enter a valid mobile number", variant: "destructive" }); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), whatsappNumber: (whatsapp.trim() || phone.trim()), password, referralCode: referralCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRegisteredEmail(email.trim().toLowerCase());
      setOtpSent(true);
      setCountdown(60);
      if (data.verificationCode) setDevOtp(data.verificationCode); // dev only
      toast({ title: data.otpSent ? "OTP sent to your email!" : "Registration successful!", description: data.message });
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 4) { toast({ title: "Enter the OTP from your email", variant: "destructive" }); return; }
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, code: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.token) { localStorage.setItem("token", data.token); }
      toast({ title: "Email verified!", description: "Your account is active." });
      if (data.user?.status === "approved") setLocation("/");
      else setLocation("/pending");
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch(`${BASE}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCountdown(60);
      if (data.verificationCode) setDevOtp(data.verificationCode);
      toast({ title: "New OTP sent!", description: data.message });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setResending(false); }
  };

  if (checking) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!signupEnabled) return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
          <h2 className="text-xl font-bold">Registrations Closed</h2>
          <p className="text-muted-foreground">New registrations are currently disabled by the administrator. Please check back later.</p>
          <Link href="/login"><Button variant="outline" className="w-full">Sign In Instead</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  // OTP Verification Step
  if (otpSent) return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>We've sent a 6-digit OTP to <strong>{registeredEmail}</strong></CardDescription>
        </CardHeader>
        <CardContent>
          {devOtp && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <p className="text-xs text-yellow-700 font-medium">Dev Mode — No SMTP configured</p>
              <p className="text-2xl font-mono font-bold text-yellow-800 tracking-widest mt-1">{devOtp}</p>
            </div>
          )}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Enter 6-digit OTP</Label>
              <Input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest h-14"
                maxLength={6}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifying || otp.length < 4}>
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify Email
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Didn't receive it?</p>
            <Button variant="outline" size="sm" onClick={handleResend} disabled={resending || countdown > 0}>
              {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Registration Form
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Create Account</CardTitle>
          <CardDescription>Fill in your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="pl-9" required />
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <Label>Mobile Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" type="tel" className="pl-9" required />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label>WhatsApp Number <span className="text-muted-foreground text-xs">(leave blank if same as mobile)</span></Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Same as mobile (optional)" type="tel" className="pl-9" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" className="pl-9" required />
              </div>
              <p className="text-xs text-muted-foreground">A 6-digit OTP will be sent to verify this email.</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? "text" : "password"} placeholder="Min 6 characters" className="pl-9 pr-10" required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Referral */}
            <div className="space-y-1.5">
              <Label>Referral Code <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} placeholder="ABCD1234" />
            </div>

            <Button type="submit" className="w-full text-base h-11" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account & Send OTP
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
