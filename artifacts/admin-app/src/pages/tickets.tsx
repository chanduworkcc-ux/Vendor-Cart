import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MessageSquare, Loader2, Search, AlertCircle, Clock, CheckCircle, ExternalLink } from "lucide-react";

const BASE = "";
const token = () => localStorage.getItem("admin_token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...opts.headers } });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800 border-blue-200", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 border-gray-200", icon: CheckCircle },
};
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700", medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
};

export default function Tickets() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: () => apiFetch("/api/tickets?admin=true"),
    refetchInterval: 10000,
  });
  const tickets = data?.data || [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast({ title: "Ticket updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = tickets.filter((t: any) => {
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.userName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t: any) => t.status === "open").length,
    in_progress: tickets.filter((t: any) => t.status === "in_progress").length,
    resolved: tickets.filter((t: any) => t.status === "resolved").length,
    closed: tickets.filter((t: any) => t.status === "closed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">Manage and respond to customer support requests.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "all", label: "Total" },
          { key: "open", label: "Open" },
          { key: "in_progress", label: "In Progress" },
          { key: "resolved", label: "Resolved" },
        ].map(({ key, label }) => (
          <Card key={key} className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(key)}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{counts[key as keyof typeof counts]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by subject or user..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 space-y-3">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">No tickets found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket: any) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = status.icon;
            return (
              <Card key={ticket.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{ticket.subject}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 border ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />{status.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityColors[ticket.priority]}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>#{ticket.id}</span>
                        <span>by {ticket.userName || "Unknown"}</span>
                        <span>{format(new Date(ticket.createdAt), "MMM d, h:mm a")}</span>
                        {ticket.messageCount > 0 && <span>{ticket.messageCount} messages</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={ticket.status}
                        onValueChange={val => updateStatus.mutate({ id: ticket.id, status: val })}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button size="sm" variant="outline" className="h-8"><ExternalLink className="h-3 w-3" /></Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
