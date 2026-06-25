import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useListUsers, useListOrders } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Users, Package, Bell, Settings, LogOut, Menu, MessageSquare, Wifi, Activity, Gift, Wallet, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user, token } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: usersData } = useListUsers({ status: "pending" }, { query: { enabled: !!user } });
  const { data: ordersData } = useListOrders({ status: "pending" }, { query: { enabled: !!user } });
  const { data: ticketsData } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tickets?admin=true`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
  const { data: withdrawalsData } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/withdrawals`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const pendingUsers = usersData?.data?.length || 0;
  const pendingOrders = ordersData?.data?.length || 0;
  const openTickets = (ticketsData?.data || []).filter((t: any) => t.status === "open" || t.status === "in_progress").length;
  const pendingWithdrawals = (withdrawalsData?.data || []).filter((w: any) => w.status === "created").length;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/users", label: "Users", icon: Users, badge: pendingUsers },
    { href: "/orders", label: "Orders", icon: Package, badge: pendingOrders },
    { href: "/tickets", label: "Support Tickets", icon: MessageSquare, badge: openTickets },
    { href: "/referrals", label: "Referrals", icon: Gift },
    { href: "/withdrawals", label: "Withdrawals", icon: Wallet, badge: pendingWithdrawals },
    { href: "/activity-logs", label: "Activity Logs", icon: Activity },
    { href: "/security", label: "Security", icon: Shield },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavLinks = () => (
    <>
      <div className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground text-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <item.icon className="mr-3 h-4 w-4 shrink-0" />
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto border-t pt-4 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Wifi className="h-3 w-3 text-green-500" />
            <p className="text-xs text-green-600 font-medium">Admin</p>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
          <LogOut className="mr-3 h-4 w-4" />Log out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col border-r bg-card p-3 md:flex">
        <div className="mb-6 px-2 text-2xl font-bold tracking-tight text-primary">Admin Panel</div>
        <NavLinks />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b bg-card px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-4">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-3 pt-12 flex flex-col">
              <div className="mb-6 px-2 text-2xl font-bold tracking-tight text-primary">Admin Panel</div>
              <NavLinks />
            </SheetContent>
          </Sheet>
          <div className="text-xl font-bold tracking-tight text-primary">Admin Panel</div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
