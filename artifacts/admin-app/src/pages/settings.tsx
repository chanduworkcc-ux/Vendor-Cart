import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, Wrench } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const toggle = (key: "acceptingOrders" | "maintenanceMode", value: boolean) => {
    updateSettings.mutate(
      { data: { [key]: value } },
      {
        onSuccess: () => {
          toast({
            title: "Settings updated",
            description: key === "acceptingOrders"
              ? `Order acceptance is now ${value ? "enabled" : "disabled"}.`
              : `Maintenance mode is now ${value ? "on" : "off"}.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" }),
      }
    );
  };

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage platform-wide configuration.</p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Order Acceptance</CardTitle>
                <CardDescription>Control whether users can place new orders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="accepting-orders" className="text-base font-medium">
                  {settings?.acceptingOrders ? "Accepting Orders" : "Not Accepting Orders"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {settings?.acceptingOrders
                    ? "Users can currently place new orders."
                    : "Order placement is currently disabled for all users."}
                </p>
              </div>
              <Switch
                id="accepting-orders"
                checked={settings?.acceptingOrders ?? false}
                onCheckedChange={(v) => toggle("acceptingOrders", v)}
                disabled={updateSettings.isPending}
                className="data-[state=checked]:bg-green-500 scale-125 ml-4"
              />
            </div>
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
              settings?.acceptingOrders
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              Status: {settings?.acceptingOrders ? "OPEN - Orders are being accepted" : "CLOSED - Orders are paused"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>Maintenance Mode</CardTitle>
                <CardDescription>Put the platform into maintenance mode</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="maintenance-mode" className="text-base font-medium">
                  {settings?.maintenanceMode ? "Maintenance Mode On" : "Platform Online"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {settings?.maintenanceMode
                    ? "Platform is currently in maintenance mode."
                    : "Platform is operating normally."}
                </p>
              </div>
              <Switch
                id="maintenance-mode"
                checked={settings?.maintenanceMode ?? false}
                onCheckedChange={(v) => toggle("maintenanceMode", v)}
                disabled={updateSettings.isPending}
                className="data-[state=checked]:bg-orange-500 scale-125 ml-4"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
