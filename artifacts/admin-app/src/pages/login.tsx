import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: FormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        if (res.user.role !== "admin") {
          toast({ title: "Access Denied", description: "This portal is for admins only.", variant: "destructive" });
          return;
        }
        setToken(res.token);
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ title: "Login Failed", description: err.data?.error || "Invalid credentials", variant: "destructive" });
      },
    });
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)" }}
    >
      {/* Deep 3D animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div style={{
          position: "absolute", top: "5%", left: "15%", width: 400, height: 400,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)",
          animation: "orb-drift 14s ease-in-out infinite", filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: "8%", right: "10%", width: 320, height: 320,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)",
          animation: "orb-drift-2 16s ease-in-out infinite", filter: "blur(50px)",
        }} />
        <div style={{
          position: "absolute", top: "40%", left: "60%", width: 240, height: 240,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          animation: "orb-drift 20s ease-in-out infinite reverse", filter: "blur(40px)",
        }} />
        {/* 3D grid lines */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }} />
        {/* Floating elements */}
        {[
          { top: "12%", left: "4%", size: 44, delay: 0, color: "rgba(59,130,246,0.2)" },
          { top: "78%", left: "6%", size: 28, delay: 1.2, color: "rgba(249,115,22,0.18)" },
          { top: "20%", right: "5%", size: 36, delay: 0.6, color: "rgba(139,92,246,0.18)" },
          { top: "72%", right: "8%", size: 22, delay: 2.1, color: "rgba(59,130,246,0.15)" },
          { top: "45%", left: "3%", size: 18, delay: 1.8, color: "rgba(249,115,22,0.15)" },
        ].map((s, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute", top: s.top, left: (s as any).left, right: (s as any).right,
              width: s.size, height: s.size, borderRadius: 6, background: s.color,
              rotate: 45, border: `1px solid ${s.color.replace("0.", "0.4")}`,
            }}
            animate={{ y: [0, -24, 0], rotate: [45, 105, 45], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5 + i * 0.8, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        style={{ perspective: 1400, width: "100%", maxWidth: 420 }}
      >
        <motion.div
          whileHover={{ rotateX: 2, rotateY: -2, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <Card className="w-full border-0 bg-white/10 backdrop-blur-2xl text-white" style={{
            boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset, 0 1px 0 rgba(255,255,255,0.2) inset",
          }}>
            <CardHeader className="space-y-4 text-center pb-4">
              <motion.div
                className="flex justify-center"
                animate={{ y: [0, -10, 0], rotateY: [0, 6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div style={{
                  filter: "drop-shadow(0 0 30px rgba(59,130,246,0.6)) drop-shadow(0 8px 20px rgba(0,0,0,0.4))",
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: "50%",
                  padding: 16,
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}>
                  <img src={`${import.meta.env.BASE_URL}xylocart-logo.png`} alt="XyloCart" className="h-16 w-16 object-contain" />
                </div>
              </motion.div>
              <div>
                <div className="text-3xl font-extrabold tracking-tight text-white">XyloCart</div>
                <CardDescription className="text-blue-200/70 mt-0.5">Admin Console</CardDescription>
              </div>
              <div className="inline-flex items-center gap-1.5 mx-auto bg-blue-500/20 border border-blue-400/30 rounded-full px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />
                <span className="text-xs text-blue-200 font-medium">Secure Admin Access</span>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@xylocart.com"
                          {...field}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:bg-white/15 transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:bg-white/15 transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )} />
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      className="w-full font-semibold text-white border-0"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                        boxShadow: "0 4px 20px rgba(37,99,235,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset",
                      }}
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
