import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (response) => {
        setToken(response.token);
        if (response.user.status === "rejected") {
          toast({ title: "Account Rejected", description: "Your account application has been rejected.", variant: "destructive" });
          setToken(null);
        } else if (response.user.status === "pending") {
          setLocation("/pending");
        } else if (!response.user.emailVerified) {
          setLocation("/verify-email");
        } else {
          setLocation("/");
        }
      },
      onError: (error) => {
        toast({ title: "Login Failed", description: error.data?.error || "Invalid email or password", variant: "destructive" });
      }
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #fff7ed 100%)" }}>
      {/* Animated 3D background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div style={{
          position: "absolute", top: "8%", left: "10%", width: 340, height: 340,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
          animation: "orb-drift 12s ease-in-out infinite", filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "8%", width: 280, height: 280,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 70%)",
          animation: "orb-drift-2 14s ease-in-out infinite", filter: "blur(35px)",
        }} />
        <div style={{
          position: "absolute", top: "50%", right: "20%", width: 200, height: 200,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          animation: "orb-drift 18s ease-in-out infinite reverse", filter: "blur(30px)",
        }} />
        {/* Floating geometric shapes */}
        {[
          { top: "15%", left: "5%", size: 48, delay: 0, color: "rgba(59,130,246,0.12)" },
          { top: "70%", left: "8%", size: 32, delay: 1.5, color: "rgba(249,115,22,0.12)" },
          { top: "25%", right: "6%", size: 40, delay: 0.8, color: "rgba(59,130,246,0.10)" },
          { top: "75%", right: "12%", size: 24, delay: 2, color: "rgba(99,102,241,0.14)" },
        ].map((s, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute", top: s.top, left: (s as any).left, right: (s as any).right,
              width: s.size, height: s.size, borderRadius: 8, background: s.color,
              rotate: 45,
            }}
            animate={{ y: [0, -20, 0], rotate: [45, 90, 45] }}
            transition={{ duration: 4 + i, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        style={{ perspective: 1200, width: "100%", maxWidth: 420 }}
      >
        <motion.div
          whileHover={{ rotateX: 2, rotateY: -2, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <Card className="w-full shadow-2xl border-0 bg-white/90 backdrop-blur-xl" style={{ boxShadow: "0 32px 80px rgba(59,130,246,0.14), 0 8px 32px rgba(0,0,0,0.08)" }}>
            <CardHeader className="space-y-3 text-center pb-4">
              {/* Floating logo */}
              <motion.div
                className="flex justify-center"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div style={{ filter: "drop-shadow(0 8px 24px rgba(59,130,246,0.4))" }}>
                  <img src="/xylocart-logo.png" alt="XyloCart" className="h-20 w-20 object-contain" />
                </div>
              </motion.div>
              <div>
                <div className="xylo-shimmer text-3xl font-extrabold tracking-tight">XyloCart</div>
                <CardDescription className="mt-1">Sign in to your account</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} className="transition-all focus:shadow-md focus:shadow-blue-100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} className="transition-all focus:shadow-md focus:shadow-blue-100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full font-semibold"
                      style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.35)" }}
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center border-t p-4">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary hover:underline font-semibold">Register</Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
