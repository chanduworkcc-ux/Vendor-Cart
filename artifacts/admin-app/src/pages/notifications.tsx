import { useState } from "react";
import {
  useListUsers,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Bell, Loader2, Send, Eye, MousePointer, TrendingUp, Image, Link } from "lucide-react";

const BASE = "";

const schema = z.object({
  target: z.enum(["all", "special", "user"]),
  userId: z.string().optional(),
  type: z.enum(["info", "success", "warning", "broadcast"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  imageUrl: z.string().optional(),
  deepLink: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const typeColor: Record<string, string> = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-orange-500",
  broadcast: "text-gray-500",
  order_update: "text-primary",
  account_update: "text-purple-500",
};

export default function Notifications() {
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<"all" | "special" | "user">("all");

  const { data: notificationsData, isLoading: notifsLoading } = useQuery({
    queryKey: ["admin-notifications-analytics"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: usersData } = useListUsers({ status: "approved" });

  const notifications: any[] = notificationsData?.data || [];
  const users = usersData?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { target: "all", type: "info", title: "", message: "", imageUrl: "", deepLink: "" },
  });

  const [sending, setSending] = useState(false);

  const onSubmit = async (data: FormValues) => {
    setSending(true);
    try {
      const payload: any = {
        type: data.type,
        title: data.title,
        message: data.message,
        imageUrl: data.imageUrl || undefined,
        deepLink: data.deepLink || undefined,
        targetType: data.target,
      };
      if (data.target === "user" && data.userId) payload.targetUserId = parseInt(data.userId);

      const res = await fetch(`${BASE}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast({ title: "Notification sent" });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-analytics"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send notification.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Aggregate analytics
  const totalSent = notifications.length;
  const totalImpressions = notifications.reduce((s: number, n: any) => s + (n.impressions || 0), 0);
  const totalClicks = notifications.reduce((s: number, n: any) => s + (n.clicks || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">Send notifications and track engagement analytics.</p>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary p-1.5 bg-primary/10 rounded-lg" />
              <div>
                <p className="text-2xl font-bold">{totalSent}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-blue-500 p-1.5 bg-blue-50 rounded-lg" />
              <div>
                <p className="text-2xl font-bold">{totalImpressions}</p>
                <p className="text-xs text-muted-foreground">Impressions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <MousePointer className="h-8 w-8 text-green-500 p-1.5 bg-green-50 rounded-lg" />
              <div>
                <p className="text-2xl font-bold">{totalClicks}</p>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500 p-1.5 bg-orange-50 rounded-lg" />
              <div>
                <p className="text-2xl font-bold">{overallCtr}%</p>
                <p className="text-xs text-muted-foreground">Avg CTR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Send Notification form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Notification</CardTitle>
            <CardDescription>Broadcast to all users, special users, or a specific user</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="target" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select value={field.value} onValueChange={(v) => { field.onChange(v); setTarget(v as any); }}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="special">Special Users</SelectItem>
                        <SelectItem value="user">Specific User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {target === "user" && (
                  <FormField control={form.control} name="userId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select User</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choose a user..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {users.map((u: any) => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="broadcast">Broadcast</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Notification title..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl><Textarea placeholder="Write your message here..." className="resize-none" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Marketing enrichment fields */}
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" /> Image URL <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="deepLink" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Link className="h-3.5 w-3.5" /> Deep Link <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input placeholder="e.g. /product/123 or https://..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Notification
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Analytics table */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Analytics</CardTitle>
            <CardDescription>{notifications.length} notifications · click-through tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {notifsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-muted/50" />
                No notifications sent yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {notifications.map((n: any) => (
                  <div key={n.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <span className={`text-xs capitalize shrink-0 ${typeColor[n.type] || "text-gray-500"}`}>
                        {n.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    {/* Analytics row */}
                    <div className="flex items-center gap-3 pt-1">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Eye className="h-2.5 w-2.5" />
                        {n.impressions ?? 0}
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <MousePointer className="h-2.5 w-2.5" />
                        {n.clicks ?? 0}
                      </Badge>
                      <Badge
                        variant={parseFloat(n.ctr) > 5 ? "default" : "outline"}
                        className="text-xs gap-1"
                      >
                        <TrendingUp className="h-2.5 w-2.5" />
                        {n.ctr}% CTR
                      </Badge>
                      {n.deepLink && (
                        <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-200">
                          <Link className="h-2.5 w-2.5" />
                          Link
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(n.createdAt), "MMM d, h:mm a")}
                      {n.targetRole && ` · To: ${n.targetRole}`}
                      {n.userId && ` · User #${n.userId}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
