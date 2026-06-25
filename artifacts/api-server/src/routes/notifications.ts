import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { eq, or, isNull, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToUser, broadcastToAll, broadcastToRole } from "../lib/websocket";

const router = Router();

router.get("/notifications", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { unreadOnly } = req.query as { unreadOnly?: string };
    const userId = req.userId!;

    const [user] = await db.select({ role: usersTable.role })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    let all = await db.select().from(notificationsTable)
      .where(
        or(
          eq(notificationsTable.userId, userId),
          and(isNull(notificationsTable.userId), isNull(notificationsTable.targetRole)),
          and(isNull(notificationsTable.userId), eq(notificationsTable.targetRole, user?.role ?? "user")),
        )
      )
      .orderBy(desc(notificationsTable.createdAt));

    if (unreadOnly === "true") {
      all = all.filter(n => !n.isRead);
    }

    const unreadCount = all.filter(n => !n.isRead).length;
    res.json({ data: all.map(formatNotification), unreadCount });
  } catch {
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

router.post("/notifications", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, message, type, targetType, targetUserId } = req.body;
    if (!title || !message || !type || !targetType) {
      res.status(400).json({ error: "title, message, type, and targetType are required" }); return;
    }

    if (targetType === "all") {
      const [notif] = await db.insert(notificationsTable).values({
        userId: null,
        targetRole: null,
        title,
        message,
        type,
        isRead: false,
      }).returning();
      broadcastToAll("new_notification", formatNotification(notif));
      res.status(201).json(formatNotification(notif));
    } else if (targetType === "special") {
      const [notif] = await db.insert(notificationsTable).values({
        userId: null,
        targetRole: "special",
        title,
        message,
        type,
        isRead: false,
      }).returning();
      broadcastToRole("special", "new_notification", formatNotification(notif));
      res.status(201).json(formatNotification(notif));
    } else if (targetType === "specific" && targetUserId) {
      const [notif] = await db.insert(notificationsTable).values({
        userId: targetUserId,
        targetRole: null,
        title,
        message,
        type,
        isRead: false,
      }).returning();
      broadcastToUser(targetUserId, "new_notification", formatNotification(notif));
      res.status(201).json(formatNotification(notif));
    } else {
      res.status(400).json({ error: "Invalid target configuration" });
    }
  } catch {
    res.status(500).json({ error: "Failed to send notification" });
  }
});

router.patch("/notifications/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.userId!));
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.patch("/notifications/:notificationId/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.notificationId);
    const [updated] = await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }
    res.json(formatNotification(updated));
  } catch {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    userId: n.userId,
    targetRole: n.targetRole,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

export default router;
