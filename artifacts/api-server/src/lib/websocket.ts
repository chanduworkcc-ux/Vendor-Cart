import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "./auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

interface WsClient {
  ws: WebSocket;
  userId: number;
  role: string;
}

let wss: WebSocketServer | null = null;
const clientsByUser: Map<number, Set<WsClient>> = new Map();

function addClient(client: WsClient) {
  if (!clientsByUser.has(client.userId)) clientsByUser.set(client.userId, new Set());
  clientsByUser.get(client.userId)!.add(client);
}

function removeClient(client: WsClient) {
  const set = clientsByUser.get(client.userId);
  if (set) { set.delete(client); if (set.size === 0) clientsByUser.delete(client.userId); }
}

function allClients(): WsClient[] {
  const all: WsClient[] = [];
  for (const set of clientsByUser.values()) for (const c of set) all.push(c);
  return all;
}

export function getOnlineUserIds(): number[] { return Array.from(clientsByUser.keys()); }
export function isUserOnline(userId: number): boolean {
  const s = clientsByUser.get(userId); return !!(s && s.size > 0);
}

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) { ws.close(1008, "Missing token"); return; }
    const payload = verifyToken(token);
    if (!payload) { ws.close(1008, "Invalid token"); return; }

    const client: WsClient = { ws, userId: payload.userId, role: payload.role };
    addClient(client);

    try {
      await db.update(usersTable).set({ isOnline: true, lastSeen: new Date() }).where(eq(usersTable.id, payload.userId));
    } catch {}
    broadcastToAdmins("user_presence", { userId: payload.userId, isOnline: true });

    const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 30000);

    ws.on("close", async () => {
      removeClient(client);
      clearInterval(ping);
      if (!isUserOnline(payload.userId)) {
        try { await db.update(usersTable).set({ isOnline: false, lastSeen: new Date() }).where(eq(usersTable.id, payload.userId)); } catch {}
        broadcastToAdmins("user_presence", { userId: payload.userId, isOnline: false });
      }
    });
    ws.on("error", () => { removeClient(client); clearInterval(ping); });
    ws.on("message", (data) => {
      try { const m = JSON.parse(data.toString()); if (m.type === "ping") ws.send(JSON.stringify({ type: "pong" })); } catch {}
    });
  });
  return wss;
}

export function broadcastToUser(userId: number, type: string, data: unknown) {
  const msg = JSON.stringify({ type, ...(typeof data === "object" && data ? data : { data }) });
  const s = clientsByUser.get(userId);
  if (s) for (const c of s) if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
}

export function broadcastToAll(type: string, data: unknown) {
  const msg = JSON.stringify({ type, ...(typeof data === "object" && data ? data : { data }) });
  for (const c of allClients()) if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
}

export function broadcastToRole(role: string, type: string, data: unknown) {
  const msg = JSON.stringify({ type, ...(typeof data === "object" && data ? data : { data }) });
  for (const c of allClients()) if (c.role === role && c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
}

export function broadcastToAdmins(type: string, data: unknown) { broadcastToRole("admin", type, data); }
