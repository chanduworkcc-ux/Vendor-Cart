import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ordersTable, notificationsTable, adminSettingsTable, ticketsTable, referralsTable, withdrawalRequestsTable, activityLogsTable, blockedIpsTable } from "@workspace/db/schema";
import { eq, desc, and, gt, lt, or, like, inArray } from "drizzle-orm";
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
      referralEnabled: settings.referralEnabled,
      maxLoginAttempts: settings.maxLoginAttempts,
      lockDurationMinutes: settings.lockDurationMinutes,
      loginEnabled: settings.loginEnabled,
      signupEnabled: settings.signupEnabled,
      autoApproveRegistrations: settings.autoApproveRegistrations,
      guestModeEnabled: settings.guestModeEnabled,
      minOrderAmount: settings.minOrderAmount,
      codEnabled: settings.codEnabled,
      paymentGateway: settings.paymentGateway,
      razorpayKeyId: settings.razorpayKeyId,
      stripePublishableKey: settings.stripePublishableKey,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch { res.status(500).json({ error: "Failed to get settings" }); }
});

router.patch("/admin/settings", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const settings = await getOrCreateSettings();
    const {
      acceptingOrders, maintenanceMode, orderCooldownMinutes,
      coinsPerReferral, minWithdrawalCoins, coinsPerRupee,
      referralEnabled, maxLoginAttempts, lockDurationMinutes,
      loginEnabled, signupEnabled, autoApproveRegistrations,
      guestModeEnabled, minOrderAmount, codEnabled, paymentGateway,
      razorpayKeyId, razorpayKeySecret, stripePublishableKey, stripeSecretKey,
    } = req.body;

    const [updated] = await db.update(adminSettingsTable).set({
      acceptingOrders: acceptingOrders !== undefined ? acceptingOrders : settings.acceptingOrders,
      maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : settings.maintenanceMode,
      orderCooldownMinutes: orderCooldownMinutes !== undefined ? parseInt(orderCooldownMinutes) : settings.orderCooldownMinutes,
      coinsPerReferral: coinsPerReferral !== undefined ? parseInt(coinsPerReferral) : settings.coinsPerReferral,
      minWithdrawalCoins: minWithdrawalCoins !== undefined ? parseInt(minWithdrawalCoins) : settings.minWithdrawalCoins,
      coinsPerRupee: coinsPerRupee !== undefined ? parseInt(coinsPerRupee) : settings.coinsPerRupee,
      referralEnabled: referralEnabled !== undefined ? referralEnabled : settings.referralEnabled,
      maxLoginAttempts: maxLoginAttempts !== undefined ? parseInt(maxLoginAttempts) : settings.maxLoginAttempts,
      lockDurationMinutes: lockDurationMinutes !== undefined ? parseInt(lockDurationMinutes) : settings.lockDurationMinutes,
      loginEnabled: loginEnabled !== undefined ? loginEnabled : settings.loginEnabled,
      signupEnabled: signupEnabled !== undefined ? signupEnabled : settings.signupEnabled,
      autoApproveRegistrations: autoApproveRegistrations !== undefined ? autoApproveRegistrations : settings.autoApproveRegistrations,
      guestModeEnabled: guestModeEnabled !== undefined ? guestModeEnabled : settings.guestModeEnabled,
      minOrderAmount: minOrderAmount !== undefined ? parseInt(minOrderAmount) : settings.minOrderAmount,
      codEnabled: codEnabled !== undefined ? codEnabled : settings.codEnabled,
      paymentGateway: paymentGateway !== undefined ? paymentGateway : settings.paymentGateway,
      razorpayKeyId: razorpayKeyId !== undefined ? (razorpayKeyId || null) : settings.razorpayKeyId,
      razorpayKeySecret: razorpayKeySecret !== undefined ? (razorpayKeySecret || null) : settings.razorpayKeySecret,
      stripePublishableKey: stripePublishableKey !== undefined ? (stripePublishableKey || null) : settings.stripePublishableKey,
      stripeSecretKey: stripeSecretKey !== undefined ? (stripeSecretKey || null) : settings.stripeSecretKey,
      updatedAt: new Date(),
    }).where(eq(adminSettingsTable.id, settings.id)).returning();

    broadcastToAll("settings_changed", {
      acceptingOrders: updated.acceptingOrders,
      maintenanceMode: updated.maintenanceMode,
      referralEnabled: updated.referralEnabled,
      loginEnabled: updated.loginEnabled,
      signupEnabled: updated.signupEnabled,
    });

    res.json({
      acceptingOrders: updated.acceptingOrders,
      maintenanceMode: updated.maintenanceMode,
      orderCooldownMinutes: updated.orderCooldownMinutes,
      coinsPerReferral: updated.coinsPerReferral,
      minWithdrawalCoins: updated.minWithdrawalCoins,
      coinsPerRupee: updated.coinsPerRupee,
      referralEnabled: updated.referralEnabled,
      maxLoginAttempts: updated.maxLoginAttempts,
      lockDurationMinutes: updated.lockDurationMinutes,
      loginEnabled: updated.loginEnabled,
      signupEnabled: updated.signupEnabled,
      autoApproveRegistrations: updated.autoApproveRegistrations,
      guestModeEnabled: updated.guestModeEnabled,
      minOrderAmount: updated.minOrderAmount,
      codEnabled: updated.codEnabled,
      paymentGateway: updated.paymentGateway,
      razorpayKeyId: updated.razorpayKeyId,
      stripePublishableKey: updated.stripePublishableKey,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch { res.status(500).json({ error: "Failed to update settings" }); }
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const orders = await db.select().from(ordersTable);
    const notifications = await db.select().from(notificationsTable);
    const tickets = await db.select().from(ticketsTable);
    const referrals = await db.select().from(referralsTable);
    const withdrawals = await db.select().from(withdrawalRequestsTable);
    const blocked = await db.select().from(blockedIpsTable);
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
      blockedIps: blocked.length,
    });
  } catch { res.status(500).json({ error: "Failed to get stats" }); }
});

router.get("/admin/analytics", requireAdmin, async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    const referrals = await db.select().from(referralsTable).orderBy(desc(referralsTable.createdAt));
    const withdrawals = await db.select().from(withdrawalRequestsTable).orderBy(desc(withdrawalRequestsTable.createdAt));

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
  } catch { res.status(500).json({ error: "Failed to get analytics" }); }
});

// ─── SECURITY ENDPOINTS ────────────────────────────────────────────────────

// List all blocked IPs
router.get("/admin/security/blocked-ips", requireAdmin, async (_req, res) => {
  try {
    const blocked = await db.select().from(blockedIpsTable).orderBy(desc(blockedIpsTable.createdAt));
    res.json({ data: blocked.map(b => ({ ...b, createdAt: b.createdAt.toISOString(), expiresAt: b.expiresAt?.toISOString() ?? null })) });
  } catch { res.status(500).json({ error: "Failed to get blocked IPs" }); }
});

// Block an IP
router.post("/admin/security/block-ip", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ipAddress, reason, permanent, durationHours } = req.body;
    if (!ipAddress) { res.status(400).json({ error: "IP address required" }); return; }

    const expiresAt = permanent ? null : new Date(Date.now() + (durationHours || 24) * 3600 * 1000);

    // Upsert
    const existing = await db.select().from(blockedIpsTable).where(eq(blockedIpsTable.ipAddress, ipAddress)).limit(1);
    if (existing.length > 0) {
      await db.update(blockedIpsTable).set({ reason: reason || "Manual block", permanent: !!permanent, expiresAt, blockedBy: req.userId }).where(eq(blockedIpsTable.ipAddress, ipAddress));
    } else {
      await db.insert(blockedIpsTable).values({ ipAddress, reason: reason || "Manual block", permanent: !!permanent, expiresAt, blockedBy: req.userId });
    }

    await db.insert(activityLogsTable).values({ userId: req.userId, action: "ip_blocked", details: `Blocked IP ${ipAddress}: ${reason}`, ipAddress: req.socket?.remoteAddress || "admin" });
    res.json({ success: true, message: `IP ${ipAddress} blocked ${permanent ? "permanently" : `for ${durationHours || 24}h`}` });
  } catch { res.status(500).json({ error: "Failed to block IP" }); }
});

// Unblock an IP
router.delete("/admin/security/block-ip/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [b] = await db.select().from(blockedIpsTable).where(eq(blockedIpsTable.id, id)).limit(1);
    if (!b) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.id, id));
    await db.insert(activityLogsTable).values({ userId: req.userId, action: "ip_unblocked", details: `Unblocked IP ${b.ipAddress}`, ipAddress: "admin" });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to unblock IP" }); }
});

// Security overview: unique IPs, suspicious activity, locked accounts
router.get("/admin/security/overview", requireAdmin, async (_req, res) => {
  try {
    const recentLogs = await db.select({ log: activityLogsTable, userName: usersTable.name })
      .from(activityLogsTable)
      .leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(500);

    const blocked = await db.select().from(blockedIpsTable);
    const lockedUsers = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, loginAttempts: usersTable.loginAttempts, lockedUntil: usersTable.lockedUntil })
      .from(usersTable)
      .where(gt(usersTable.loginAttempts, 0));

    // Unique IPs from logs
    const ipCounts = new Map<string, number>();
    const ipActions = new Map<string, string[]>();
    for (const { log } of recentLogs) {
      if (log.ipAddress) {
        ipCounts.set(log.ipAddress, (ipCounts.get(log.ipAddress) || 0) + 1);
        const acts = ipActions.get(log.ipAddress) || [];
        acts.push(log.action);
        ipActions.set(log.ipAddress, acts);
      }
    }

    // Failed login attempts by IP
    const failedLogins = recentLogs.filter(({ log }) => log.action === "login_failed" || log.action === "login_account_locked");
    const failedByIp = new Map<string, number>();
    for (const { log } of failedLogins) {
      if (log.ipAddress) failedByIp.set(log.ipAddress, (failedByIp.get(log.ipAddress) || 0) + 1);
    }

    const suspiciousIps = Array.from(failedByIp.entries())
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([ip, count]) => ({ ip, failedAttempts: count, isBlocked: blocked.some(b => b.ipAddress === ip) }));

    const topIps = Array.from(ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([ip, count]) => ({
        ip,
        requests: count,
        isBlocked: blocked.some(b => b.ipAddress === ip),
        isSuspicious: (failedByIp.get(ip) || 0) >= 3,
        recentActions: [...new Set(ipActions.get(ip) || [])].slice(0, 5),
      }));

    // Users by device / IP
    const userDevices = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      deviceId: usersTable.deviceId, lastLoginIp: usersTable.lastLoginIp,
      registrationIp: usersTable.registrationIp, lastLoginAt: usersTable.lastLoginAt,
      status: usersTable.status, loginAttempts: usersTable.loginAttempts,
      lockedUntil: usersTable.lockedUntil,
    }).from(usersTable);

    res.json({
      suspiciousIps,
      topIps,
      blockedIps: blocked.map(b => ({ ...b, createdAt: b.createdAt.toISOString(), expiresAt: b.expiresAt?.toISOString() ?? null })),
      lockedUsers: lockedUsers.map(u => ({ ...u, lockedUntil: u.lockedUntil?.toISOString() ?? null })),
      userDevices: userDevices.map(u => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null })),
      totalUniqueIps: ipCounts.size,
      totalFailedLogins: failedLogins.length,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to get security overview" }); }
});

// Unlock a user account
router.post("/admin/security/unlock-user/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(usersTable).set({ loginAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to unlock user" }); }
});

export default router;
