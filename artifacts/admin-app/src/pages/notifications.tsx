import { useState } from "react";
import {
  useListNotifications,
  useSendNotification,
  useListUsers,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Bell, Loader2, Send } from "lucide-react";

const schema = z.object({
  target: z.enum(["all", "special", "user"]),
  userId: z.string().optional(),
  type: z.enum(["info", "success", "warning", "broadcast"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
});
type FormValues = z.infer<typeof schema>;

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<"all" | "special" | "user">("all");

  const { data: notificationsData, isLoading } = useListNotifications({});
  const { data: usersData } = useListUsers({ status: "approved" });
  const sendMutation = useSendNotification();

  const notifications = notificationsData?.data || [];
  const users = usersData?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { target: "all", type: "info", title: "", message: "" },
  });

  const onSubmit = (data: FormValues) => {
    const payload: any = { type: data.type, title: data.title, message: data.message };
    if (data.target === "all") payload.targetRole = "all";
    else if (data.target === "special") payload.targetRole = "special";
    else if (data.target === "user" && data.userId) payload.userId = data.userId;

    sendMutation.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Notification sent" });
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
      onError: () => toast({ title: "Error", description: "Failed to send notification.", variant: "destructive" }),
    });
  };

  const typeColor: Record<string, string> = {
    info: "text-blue-500",
    success: "text-green-500",
    warning: "text-orange-500",
    broadcast: "text-gray-500",
    order_update: "text-primary",
    account_update: "text-purple-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">Send notifications and view notification history.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
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

                <Button type="submit" className="w-full" disabled={sendMutation.isPending}>
                  {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Notification
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>{notifications.length} sent</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-muted/50" />
                No notifications sent yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div key={n.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <span className={`text-xs capitalize shrink-0 ${typeColor[n.type] || "text-gray-500"}`}>
                        {n.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(n.createdAt), "MMM d, h:mm a")}
                      {n.targetRole && ` · To: ${n.targetRole}`}
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
