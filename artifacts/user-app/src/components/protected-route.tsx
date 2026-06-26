import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loading3D } from "@/components/loading-3d";

export function ProtectedRoute({ children, requireApproved = true }: { children: React.ReactNode, requireApproved?: boolean }) {
  const { user, isLoading, token } = useAuth();
  const [, setLocation] = useLocation();

  const isSuspended =
    user &&
    (user as any).suspendedUntil &&
    new Date((user as any).suspendedUntil).getTime() > Date.now();

  useEffect(() => {
    if (!isLoading && !token) {
      setLocation("/login");
    } else if (!isLoading && user) {
      if (isSuspended) {
        setLocation("/suspended");
      } else if (requireApproved && user.status === "pending") {
        setLocation("/pending");
      }
    }
  }, [isLoading, token, user, setLocation, requireApproved, isSuspended]);

  if (isLoading || !token) {
    return <Loading3D message="Authenticating..." />;
  }

  if (isSuspended) {
    return null;
  }

  if (requireApproved && user?.status !== "approved") {
    return null;
  }

  return <>{children}</>;
}
