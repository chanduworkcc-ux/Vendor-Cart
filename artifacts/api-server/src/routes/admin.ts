import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ordersTable, notificationsTable, adminSettingsTable, ticketsTable, referralsTable, withdrawalRequestsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToAll, getOnlineUserIds } from "../lib/websocket";

const router = Router();

async function getOrCreateSettings() {
  const existing = await db.select().from(adminSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(adminSettingsTable).values({}).returning();
  return created;
}

router.get("/admin/settings", requireAdmin, async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      acceptingOrders: settings.acceptingOrders,
      maintenanceMode: settings.maintenanceMode,
      orderCooldownMinutes: settings.orderCooldownMinutes,
      coinsPerReferral: settings.coinsPerReferral,
      minWithdrawalCoins: settings.minWithdrawalCoins,
      coinsPerRupee: settings.coinsPerRupee,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.patch("/admin/settings", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { acceptingOrders, maintenanceMode, orderCooldownMinutes, coinsPerReferral, minWithdrawalCoins, coinsPerRupee } = req.body;

    const [updated] = await db.update(adminSettingsTable)
      .set({
        acceptingOrders: acceptingOrders !== undefined ? acceptingOrders : settings.acceptingOrders,
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : settings.maintenanceMode,
        orderCooldownMinutes: orderCooldownMinutes !== undefined ? parseInt(orderCooldownMinutes) : settings.orderCooldownMinutes,
        coinsPerReferral: coinsPerReferral !== undefined ? parseInt(coinsPerReferral) : settings.coinsPerReferral,
        minWithdrawalCoins: minWithdrawalCoins !== undefined ? parseInt(minWithdrawalCoins) : settings.minWithdrawalCoins,
        coinsPerRupee: coinsPerRupee !== undefined ? parseInt(coinsPerRupee) : settings.coinsPerRupee,
        updatedAt: new Date(),
      })
      .where(eq(adminSettingsTable.id, settings.id))
      .returning();

    broadcastToAll("settings_changed", {
      acceptingOrders: updated.acceptingOrders,
      maintenanceMode: updated.maintenanceMode,
      orderCooldownMinutes: updated.orderCooldownMinutes,
      coinsPerReferral: updated.coinsPerReferral,
      minWithdrawalCoins: updated.minWithdrawalCoins,
      coinsPerRupee: updated.coinsPerRupee,
    });

    res.json({
      acceptingOrders: updated.acceptingOrders,
      maintenanceMode: updated.maintenanceMode,
      orderCooldownMinutes: updated.orderCooldownMinutes,
      coinsPerReferral: updated.coinsPerReferral,
      minWithdrawalCoins: updated.minWithdrawalCoins,
      coinsPerRupee: updated.coinsPerRupee,
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
    const referrals = await db.select().from(referralsTable);
    const withdrawals = await db.select().from(withdrawalRequestsTable);
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
      cancelledOrders: orders.filter(o => o.status === "cancelled").length,
      unreadNotifications: notifications.filter(n => !n.isRead && n.userId === null).length,
      onlineUsers: onlineIds.length,
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => t.status === "open" || t.status === "in_progress").length,
      resolvedTickets: tickets.filter(t => t.status === "resolved").length,
      totalReferrals: referrals.length,
      pendingWithdrawals: withdrawals.filter(w => w.status === "created").length,
      totalWithdrawals: withdrawals.length,
    });
  } catch {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// Real-time analytics: orders per day (last 7 days)
router.get("/admin/analytics", requireAdmin, async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    const referrals = await db.select().from(referralsTable).orderBy(desc(referralsTable.createdAt));
    const withdrawals = await db.select().from(withdrawalRequestsTable).orderBy(desc(withdrawalRequestsTable.createdAt));

    // Last 7 days
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const ordersPerDay = days.map(day => ({
      date: day,
      orders: orders.filter(o => o.createdAt.toISOString().startsWith(day)).length,
      users: users.filter(u => u.createdAt.toISOString().startsWith(day)).length,
    }));

    const statusBreakdown = {
      pending: orders.filter(o => o.status === "pending").length,
      processing: orders.filter(o => o.status === "processing").length,
      shipped: orders.filter(o => o.status === "shipped").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
    };

    res.json({
      ordersPerDay,
      statusBreakdown,
      totalCoinsAwarded: referrals.reduce((s, r) => s + r.coinsAwarded, 0),
      totalWithdrawalAmount: withdrawals.filter(w => w.status === "delivered").reduce((s, w) => s + w.amountRupees, 0),
      recentOrders: orders.slice(0, 10).map(o => ({ id: o.id, orderRef: o.orderRef, status: o.status, createdAt: o.createdAt.toISOString() })),
      recentUsers: users.slice(0, 10).map(u => ({ id: u.id, name: u.name, status: u.status, createdAt: u.createdAt.toISOString() })),
    });
  } catch {
    res.status(500).json({ error: "Failed to get analytics" });
  }
});

export default router;
