import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";

export default function Pending() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-yellow-500">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto bg-yellow-100 p-4 rounded-full w-20 h-20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Approval Pending</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Your account is currently under review by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-sm text-muted-foreground">
            We will notify you once your account has been approved. This usually takes 1-2 business days.
          </p>
          <Button variant="outline" className="w-full" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
