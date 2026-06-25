import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useVerifyEmail } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const verifySchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  code: z.string().length(6, { message: "Code must be 6 digits" }),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const verifyMutation = useVerifyEmail();

  const savedEmail = typeof window !== "undefined" ? sessionStorage.getItem("verifyEmail") : null;

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: savedEmail || "",
      code: "",
    },
  });

  const onSubmit = (data: VerifyFormValues) => {
    verifyMutation.mutate({ data }, {
      onSuccess: (response) => {
        setToken(response.token);
        toast({
          title: "Email Verified",
          description: "Your email has been successfully verified.",
        });
        if (response.user.status === "pending") {
          setLocation("/pending");
        } else {
          setLocation("/");
        }
      },
      onError: (error) => {
        toast({
          title: "Verification Failed",
          description: error.data?.error || "Invalid verification code",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Verify Email</CardTitle>
          <CardDescription>
            Enter the 6-digit code provided to verify your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center justify-center">
                    <FormLabel className="w-full text-left">Verification Code</FormLabel>
                    <FormControl>
                      <InputOTP maxLength={6} {...field}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
                {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Account
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
