import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useListNotifications } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Package, LayoutDashboard, Bell, LogOut, Menu, User, MessageSquare, Gift, Wallet, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const BASE = "";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: notificationsData } = useListNotifications(
    { unreadOnly: true },
    { query: { enabled: !!user && (user as any).status === "approved" } }
  );
  const { data: ticketsData } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tickets`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      return res.json();
    },
    enabled: !!user && (user as any).status === "approved",
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.unreadCount || 0;
  const openTickets = (ticketsData?.data || []).filter((t: any) => t.status === "open" || t.status === "in_progress").length;
  const coinBalance = (user as any)?.coinBalance ?? 0;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/shop", label: "Shop", icon: ShoppingBag },
    { href: "/orders", label: "My Orders", icon: Package },
    { href: "/referral", label: "Referral & Coins", icon: Gift },
    { href: "/wallet", label: "Token Wallet", icon: Wallet },
    { href: "/tickets", label: "Support", icon: MessageSquare, badge: openTickets },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex-1 space-y-1">
        {navItems.map((item, i) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link
                href={item.href}
                className={`flex items-center w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent hover:text-accent-foreground text-foreground"
                }`}
                onClick={onClose}
              >
                <item.icon className="mr-3 h-4 w-4 shrink-0" />
                {item.label}
                {(item as any).badge > 0 && (
                  <Badge variant="destructive" className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full p-0 text-xs">
                    {(item as any).badge}
                  </Badge>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-auto border-t pt-4 space-y-2">
        {coinBalance > 0 && (
          <div className="px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-600 text-sm font-bold">🪙 {coinBalance} Coins</span>
            </div>
          </div>
        )}
        <div className="px-4 py-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Welcome back,</p>
          <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
          <LogOut className="mr-3 h-4 w-4" />Log out
        </Button>
      </div>
    </>
  );

  const LogoMark = () => (
    <div className="flex items-center gap-2.5 select-none">
      <div className="xylo-logo-bounce" style={{ display: 'inline-block' }}>
        <img
          src="/xylocart-logo.png"
          alt="XyloCart"
          className="h-9 w-9 object-contain drop-shadow-md"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(59,130,246,0.35))' }}
        />
      </div>
      <div>
        <div className="xylo-shimmer text-xl font-extrabold leading-tight tracking-tight">XyloCart</div>
        <div className="text-[10px] text-muted-foreground leading-none mt-0.5">Customer Portal</div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 px-2">
          <LogoMark />
        </div>
        <NavLinks />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center border-b bg-card px-4 justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 pt-10 flex flex-col">
                <div className="mb-6 px-2">
                  <LogoMark />
                </div>
                <NavLinks onClose={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="md:hidden">
              <span className="xylo-shimmer text-lg font-extrabold">XyloCart</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Welcome back,</span>
            <span className="font-semibold text-foreground">{user?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {coinBalance > 0 && (
              <Link href="/referral">
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50 text-xs font-bold">
                  🪙 {coinBalance}
                </Button>
              </Link>
            )}
            {unreadCount > 0 && (
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </Button>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <motion.div
            className="mx-auto max-w-5xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
