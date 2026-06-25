import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Send, Loader2, MessageSquare, User } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("admin_token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...opts.headers } });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800",
};

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["admin-ticket", id],
    queryFn: () => apiFetch(`/api/tickets/${id}`),
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => apiFetch(`/api/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ message: msg }) }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => apiFetch(`/api/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast({ title: "Ticket status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!ticket) return <div className="text-center py-16 text-muted-foreground">Ticket not found.</div>;

  const messages = ticket.messages || [];
  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/tickets")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{ticket.subject}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[ticket.status]}`}>
              {ticket.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.userName || "Unknown"} ({ticket.userEmail})</span>
            <span>#{ticket.id} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
            <span className={`px-2 py-0.5 rounded-full capitalize ${ticket.priority === "urgent" ? "bg-red-100 text-red-700" : ticket.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"}`}>
              {ticket.priority}
            </span>
          </div>
        </div>
        <Select value={ticket.status} onValueChange={val => updateStatus.mutate(val)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Issue Description</CardTitle>
          <CardDescription className="text-foreground">{ticket.description}</CardDescription>
        </CardHeader>
      </Card>

      <Card className="flex flex-col" style={{ minHeight: "400px" }}>
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversation ({messages.length} messages)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pt-4">
          <div className="flex-1 space-y-4 overflow-y-auto max-h-80 pr-1">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Reply to start the conversation.</p>
            ) : (
              messages.map((msg: any) => {
                const isAdmin = msg.senderRole === "admin";
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-2.5 space-y-1 ${
                      isAdmin ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                    }`}>
                      <span className="text-xs font-medium opacity-70">{isAdmin ? "Support Agent (You)" : msg.senderName}</span>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      <p className="text-xs opacity-60 text-right">{format(new Date(msg.createdAt), "h:mm a")}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {!isClosed ? (
            <div className="mt-4 border-t pt-4 flex gap-2">
              <Textarea
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Reply to the customer..." rows={2} className="resize-none flex-1"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (message.trim()) sendMutation.mutate(message.trim()); } }}
              />
              <Button onClick={() => { if (message.trim()) sendMutation.mutate(message.trim()); }}
                disabled={!message.trim() || sendMutation.isPending} className="self-end">
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="mt-4 border-t pt-4 text-center text-sm text-muted-foreground">
              This ticket is closed. Update status to reopen it.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
