import { Router } from "express";
import { db } from "@workspace/db";
import { ticketsTable, ticketMessagesTable, usersTable, notificationsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToUser, broadcastToAdmins } from "../lib/websocket";

const router = Router();

// List tickets (admin sees all, user sees own)
router.get("/tickets", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query as { status?: string };
    let rows = await db
      .select({ ticket: ticketsTable, userName: usersTable.name, userEmail: usersTable.email })
      .from(ticketsTable)
      .leftJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
      .orderBy(desc(ticketsTable.updatedAt));

    if (req.userRole !== "admin") rows = rows.filter(r => r.ticket.userId === req.userId);
    if (status) rows = rows.filter(r => r.ticket.status === status);

    res.json({ data: rows.map(r => formatTicket(r.ticket, r.userName, r.userEmail)), total: rows.length });
  } catch { res.status(500).json({ error: "Failed to list tickets" }); }
});

// Create ticket
router.post("/tickets", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, description, priority, orderId } = req.body;
    if (!subject || !description) { res.status(400).json({ error: "Subject and description required" }); return; }

    const [ticket] = await db.insert(ticketsTable).values({
      userId: req.userId!,
      subject,
      description,
      priority: priority || "medium",
      orderId: orderId ? parseInt(orderId) : null,
      status: "open",
    }).returning();

    // Notify admins
    broadcastToAdmins("new_ticket", { ticketId: ticket.id, userId: req.userId, subject });

    const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    res.status(201).json(formatTicket(ticket, user?.name, user?.email));
  } catch { res.status(500).json({ error: "Failed to create ticket" }); }
});

// Get ticket
router.get("/tickets/:ticketId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const ticketId = parseInt(String(req.params.ticketId));
    const [row] = await db.select({ ticket: ticketsTable, userName: usersTable.name, userEmail: usersTable.email })
      .from(ticketsTable).leftJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
      .where(eq(ticketsTable.id, ticketId)).limit(1);

    if (!row) { res.status(404).json({ error: "Ticket not found" }); return; }
    if (req.userRole !== "admin" && row.ticket.userId !== req.userId) { res.status(403).json({ error: "Access denied" }); return; }

    // Get messages
    const messages = await db.select({
      msg: ticketMessagesTable, senderName: usersTable.name
    }).from(ticketMessagesTable)
      .leftJoin(usersTable, eq(ticketMessagesTable.senderId, usersTable.id))
      .where(eq(ticketMessagesTable.ticketId, ticketId))
      .orderBy(ticketMessagesTable.createdAt);

    // Mark messages as read
    if (req.userRole === "admin") {
      await db.update(ticketMessagesTable).set({ isRead: true })
        .where(and(eq(ticketMessagesTable.ticketId, ticketId), eq(ticketMessagesTable.senderRole, "user")));
    } else {
      await db.update(ticketMessagesTable).set({ isRead: true })
        .where(and(eq(ticketMessagesTable.ticketId, ticketId), eq(ticketMessagesTable.senderRole, "admin")));
    }

    res.json({
      ...formatTicket(row.ticket, row.userName, row.userEmail),
      messages: messages.map(m => ({
        id: m.msg.id, ticketId: m.msg.ticketId, senderId: m.msg.senderId,
        senderName: m.senderName, senderRole: m.msg.senderRole,
        message: m.msg.message, isRead: m.msg.isRead, createdAt: m.msg.createdAt.toISOString(),
      })),
    });
  } catch { res.status(500).json({ error: "Failed to get ticket" }); }
});

// Update ticket status (admin only)
router.patch("/tickets/:ticketId/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const ticketId = parseInt(String(req.params.ticketId));
    const { status } = req.body;
    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      res.status(400).json({ error: "Invalid status" }); return;
    }
    const [updated] = await db.update(ticketsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ticketsTable.id, ticketId)).returning();
    if (!updated) { res.status(404).json({ error: "Ticket not found" }); return; }

    if (status === "resolved" || status === "closed") {
      await db.insert(notificationsTable).values({
        userId: updated.userId, title: `Support Ticket #${ticketId} ${status === "resolved" ? "Resolved" : "Closed"}`,
        message: `Your support ticket "${updated.subject}" has been ${status}.`, type: "info", isRead: false,
      });
      broadcastToUser(updated.userId, "ticket_status_changed", { ticketId, status, subject: updated.subject });
    }

    res.json(formatTicket(updated, null, null));
  } catch { res.status(500).json({ error: "Failed to update ticket" }); }
});

// Send message in ticket
router.post("/tickets/:ticketId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const ticketId = parseInt(String(req.params.ticketId));
    const { message } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: "Message is required" }); return; }

    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
    if (req.userRole !== "admin" && ticket.userId !== req.userId) { res.status(403).json({ error: "Access denied" }); return; }

    const [msg] = await db.insert(ticketMessagesTable).values({
      ticketId, senderId: req.userId!, senderRole: req.userRole!, message: message.trim(), isRead: false,
    }).returning();

    // Update ticket updated_at and move to in_progress if open
    await db.update(ticketsTable).set({
      updatedAt: new Date(),
      ...(ticket.status === "open" && req.userRole === "admin" ? { status: "in_progress" as const } : {}),
    }).where(eq(ticketsTable.id, ticketId));

    const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    const msgData = {
      id: msg.id, ticketId: msg.ticketId, senderId: msg.senderId, senderName: sender?.name,
      senderRole: msg.senderRole, message: msg.message, isRead: msg.isRead, createdAt: msg.createdAt.toISOString(),
    };

    // Real-time delivery
    if (req.userRole === "admin") {
      broadcastToUser(ticket.userId, "ticket_message", { ticketId, message: msgData });
      await db.insert(notificationsTable).values({
        userId: ticket.userId, title: `Reply on Ticket #${ticketId}`,
        message: `Admin replied to your ticket "${ticket.subject}".`, type: "info", isRead: false,
      });
    } else {
      broadcastToAdmins("ticket_message", { ticketId, userId: req.userId, message: msgData });
    }

    res.status(201).json(msgData);
  } catch { res.status(500).json({ error: "Failed to send message" }); }
});

function formatTicket(ticket: any, userName?: string | null, userEmail?: string | null) {
  return {
    id: ticket.id, userId: ticket.userId, userName: userName ?? null, userEmail: userEmail ?? null,
    subject: ticket.subject, description: ticket.description,
    status: ticket.status, priority: ticket.priority, orderId: ticket.orderId,
    createdAt: ticket.createdAt?.toISOString(), updatedAt: ticket.updatedAt?.toISOString(),
  };
}

export default router;
