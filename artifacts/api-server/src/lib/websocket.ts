import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "./auth";

interface WsClient {
  ws: WebSocket;
  userId: number;
  role: string;
}

let wss: WebSocketServer | null = null;
const clients: Set<WsClient> = new Set();

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(1008, "Missing token");
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      ws.close(1008, "Invalid token");
      return;
    }
    const client: WsClient = { ws, userId: payload.userId, role: payload.role };
    clients.add(client);

    ws.on("close", () => clients.delete(client));
    ws.on("error", () => clients.delete(client));
    ws.on("message", () => {});
  });

  return wss;
}

export function broadcastToUser(userId: number, event: string, data: unknown) {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function broadcastToAll(event: string, data: unknown) {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function broadcastToRole(role: string, event: string, data: unknown) {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.role === role && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function broadcastToAdmins(event: string, data: unknown) {
  broadcastToRole("admin", event, data);
}
