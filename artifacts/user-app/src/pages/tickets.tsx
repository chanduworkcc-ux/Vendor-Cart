import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, MessageSquare, Loader2, AlertCircle, Clock, CheckCircle } from "lucide-react";

const BASE = "";
const token = () => localStorage.getItem("token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...opts.headers } });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

const ticketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});
type TicketFormValues = z.infer<typeof ticketSchema>;

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800", icon: CheckCircle },
};
const priorityConfig: Record<string, string> = {
  low: "bg-gray-100 text-gray-700", medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
};

export default function Tickets() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["tickets"], queryFn: () => apiFetch("/api/tickets"), });
  const tickets = data?.data || [];

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", description: "", priority: "medium" },
  });

  const createMutation = useMutation({
    mutationFn: (vals: TicketFormValues) => apiFetch("/api/tickets", { method: "POST", body: JSON.stringify(vals) }),
    onSuccess: () => {
      toast({ title: "Ticket created", description: "Our team will respond soon." });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Raise issues and chat with our support team.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Raise a Support Ticket</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="Brief summary of the issue..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} placeholder="Describe the issue in detail..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Ticket
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 space-y-3">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">No tickets yet</p>
            <p className="text-sm text-muted-foreground">Click "New Ticket" to contact support.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = status.icon;
            return (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{ticket.subject}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />{status.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityConfig[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">#{ticket.id}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(ticket.createdAt), "MMM d")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
