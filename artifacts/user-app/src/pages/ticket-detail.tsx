import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Send, Loader2, MessageSquare } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...opts.headers } });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800",
};
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700", medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["tickets", id],
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
      queryClient.invalidateQueries({ queryKey: ["tickets", id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!ticket) return <div className="text-center py-16 text-muted-foreground">Ticket not found.</div>;

  const messages = ticket.messages || [];
  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/tickets")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{ticket.subject}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[ticket.status]}`}>{ticket.status.replace("_", " ")}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
          </div>
          <p className="text-sm text-muted-foreground">Ticket #{ticket.id} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Original Issue</CardTitle>
          <CardDescription className="text-foreground mt-1">{ticket.description}</CardDescription>
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
              <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Send a message to start the conversation.</p>
            ) : (
              messages.map((msg: any) => {
                const isMe = msg.senderId === (user as any)?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-2.5 space-y-1 ${
                      isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium opacity-75">
                          {isMe ? "You" : msg.senderRole === "admin" ? "Support Agent" : msg.senderName}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      <p className={`text-xs opacity-60 text-right`}>{format(new Date(msg.createdAt), "h:mm a")}</p>
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
                placeholder="Type your message..." rows={2} className="resize-none flex-1"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending} className="self-end">
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="mt-4 border-t pt-4 text-center text-sm text-muted-foreground">
              This ticket is {ticket.status}. <Link href="/tickets" className="text-primary hover:underline">Raise a new ticket</Link> if needed.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
