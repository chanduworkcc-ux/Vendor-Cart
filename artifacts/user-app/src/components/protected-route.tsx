import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, requireApproved = true }: { children: React.ReactNode, requireApproved?: boolean }) {
  const { user, isLoading, token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !token) {
      setLocation("/login");
    } else if (!isLoading && user) {
      if (user.status === "rejected") {
        // Handle rejected case? 
      } else if (requireApproved && user.status === "pending") {
        setLocation("/pending");
      }
    }
  }, [isLoading, token, user, setLocation, requireApproved]);

  if (isLoading || !token) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireApproved && user?.status !== "approved") {
    return null;
  }

  return <>{children}</>;
}
