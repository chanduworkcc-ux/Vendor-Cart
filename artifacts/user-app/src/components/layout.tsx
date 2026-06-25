import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useListNotifications } from "@workspace/api-client-react";
import { Package, LayoutDashboard, Bell, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: notificationsData } = useListNotifications(
    { unreadOnly: true },
    { query: { enabled: !!user && user.status === "approved" } }
  );

  const unreadCount = notificationsData?.unreadCount || 0;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: Package },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
  ];

  const NavLinks = () => (
    <>
      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center w-full justify-start rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" 
                  : "hover:bg-accent hover:text-accent-foreground text-foreground"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
              {item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto border-t pt-4">
        <div className="mb-4 px-4 text-sm text-muted-foreground">
          Logged in as<br />
          <span className="font-medium text-foreground">{user?.email}</span>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => logout()}>
          <LogOut className="mr-3 h-5 w-5" />
          Log out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-8 px-4 text-2xl font-bold tracking-tight text-primary">
          Portal
        </div>
        <NavLinks />
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center border-b bg-card px-4 md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-4">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4 pt-12 flex flex-col">
              <div className="mb-8 px-4 text-2xl font-bold tracking-tight text-primary">
                Portal
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
          <div className="text-xl font-bold tracking-tight text-primary">Portal</div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
