import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ordersTable, notificationsTable, adminSettingsTable, ticketsTable } from "@workspace/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToAll, getOnlineUserIds } from "../lib/websocket";

const router = Router();

async function getOrCreateSettings() {
  const existing = await db.select().from(adminSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(adminSettingsTable).values({
    acceptingOrders: true,
    maintenanceMode: false,
    updatedAt: new Date(),
  }).returning();
  return created;
}

router.get("/admin/settings", requireAdmin, async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      acceptingOrders: settings.acceptingOrders,
      maintenanceMode: settings.maintenanceMode,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.patch("/admin/settings", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { acceptingOrders, maintenanceMode } = req.body;

    const [updated] = await db.update(adminSettingsTable)
      .set({
        acceptingOrders: acceptingOrders !== undefined ? acceptingOrders : settings.acceptingOrders,
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : settings.maintenanceMode,
        updatedAt: new Date(),
      })
      .where(eq(adminSettingsTable.id, settings.id))
      .returning();

    broadcastToAll("settings_changed", {
      acceptingOrders: updated.acceptingOrders,
      maintenanceMode: updated.maintenanceMode,
    });

    res.json({
      acceptingOrders: updated.acceptingOrders,
      maintenanceMode: updated.maintenanceMode,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const orders = await db.select().from(ordersTable);
    const notifications = await db.select().from(notificationsTable);
    const tickets = await db.select().from(ticketsTable);
    const onlineIds = getOnlineUserIds();

    res.json({
      totalUsers: users.length,
      pendingUsers: users.filter(u => u.status === "pending").length,
      approvedUsers: users.filter(u => u.status === "approved").length,
      rejectedUsers: users.filter(u => u.status === "rejected").length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === "pending").length,
      shippedOrders: orders.filter(o => o.status === "shipped").length,
      deliveredOrders: orders.filter(o => o.status === "delivered").length,
      unreadNotifications: notifications.filter(n => !n.isRead && n.userId === null).length,
      onlineUsers: onlineIds.length,
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => t.status === "open" || t.status === "in_progress").length,
      resolvedTickets: tickets.filter(t => t.status === "resolved").length,
    });
  } catch {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
