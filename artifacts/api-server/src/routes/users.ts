import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToUser } from "../lib/websocket";

const router = Router();

router.get("/users", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, role } = req.query as { status?: string; role?: string };
    let users = await db.select().from(usersTable);
    if (status) users = users.filter(u => u.status === status);
    if (role) users = users.filter(u => u.role === role);
    res.json({ data: users.map(formatUser) });
  } catch { res.status(500).json({ error: "Failed to list users" }); }
});

router.get("/users/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    if (req.userRole !== "admin" && req.userId !== userId) { res.status(403).json({ error: "Access denied" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(formatUser(user));
  } catch { res.status(500).json({ error: "Failed to get user" }); }
});

router.patch("/users/:userId/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const { status, reason } = req.body;
    if (!["approved", "rejected"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
    const [updated] = await db.update(usersTable).set({ status, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    const title = status === "approved" ? "Account Approved!" : "Account Update";
    const message = status === "approved" ? "Your account has been approved." : `Your account has been rejected.${reason ? ` Reason: ${reason}` : ""}`;
    await db.insert(notificationsTable).values({ userId, title, message, type: "account_update", isRead: false });
    broadcastToUser(userId, "account_status_changed", { status, message });
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to update user status" }); }
});

router.patch("/users/:userId/role", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const { role } = req.body;
    if (!["user", "admin", "special"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
    const [updated] = await db.update(usersTable).set({ role, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(notificationsTable).values({ userId, title: "Account Role Updated", message: `Your role has been changed to: ${role}.`, type: "account_update", isRead: false });
    broadcastToUser(userId, "role_changed", { role });
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to update user role" }); }
});

// Ban permanently
router.post("/users/:userId/ban", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const { reason, banDevice } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [updated] = await db.update(usersTable).set({
      bannedPermanently: true, bannedReason: reason || "Violated terms of service",
      status: "rejected" as any, isOnline: false,
      ...(banDevice ? { deviceId: `BANNED_${user.deviceId}` } : {}),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId)).returning();
    await db.insert(notificationsTable).values({ userId, title: "Account Banned", message: `Your account has been permanently banned.${reason ? ` Reason: ${reason}` : ""}`, type: "account_update", isRead: false });
    broadcastToUser(userId, "account_banned", { reason });
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to ban user" }); }
});

// Unban
router.post("/users/:userId/unban", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const [updated] = await db.update(usersTable).set({ bannedPermanently: false, bannedReason: null, status: "approved" as any, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(notificationsTable).values({ userId, title: "Account Reinstated", message: "Your account ban has been lifted. Welcome back!", type: "account_update", isRead: false });
    broadcastToUser(userId, "account_unbanned", {});
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to unban user" }); }
});

// Suspend for N days
router.post("/users/:userId/suspend", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const { days, reason } = req.body;
    if (!days || days < 1) { res.status(400).json({ error: "Days must be >= 1" }); return; }
    const suspendedUntil = new Date(Date.now() + days * 24 * 3600 * 1000);
    const [updated] = await db.update(usersTable).set({ suspendedUntil, suspensionReason: reason || null, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(notificationsTable).values({ userId, title: `Account Suspended for ${days} Day(s)`, message: `Your account has been suspended until ${suspendedUntil.toLocaleDateString()}.${reason ? ` Reason: ${reason}` : ""}`, type: "account_update", isRead: false });
    broadcastToUser(userId, "account_suspended", { suspendedUntil: suspendedUntil.toISOString(), reason });
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to suspend user" }); }
});

// Unsuspend
router.post("/users/:userId/unsuspend", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const [updated] = await db.update(usersTable).set({ suspendedUntil: null, suspensionReason: null, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(notificationsTable).values({ userId, title: "Suspension Lifted", message: "Your account suspension has been removed.", type: "account_update", isRead: false });
    broadcastToUser(userId, "account_unsuspended", {});
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to unsuspend user" }); }
});

// Add coins to user
router.post("/users/:userId/add-coins", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const { coins, reason } = req.body;
    if (!coins || isNaN(parseInt(coins))) { res.status(400).json({ error: "Coin amount required" }); return; }
    const amount = parseInt(coins);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const newBalance = Math.max(0, user.coinBalance + amount);
    const [updated] = await db.update(usersTable).set({ coinBalance: newBalance, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    const sign = amount >= 0 ? "+" : "";
    await db.insert(notificationsTable).values({ userId, title: `${sign}${amount} Coins ${amount >= 0 ? "Added" : "Deducted"}`, message: `Admin ${amount >= 0 ? "added" : "deducted"} ${Math.abs(amount)} coins to your account.${reason ? ` Reason: ${reason}` : ""} New balance: ${newBalance} coins.`, type: "info", isRead: false });
    broadcastToUser(userId, "coin_balance_updated", { coinBalance: newBalance, change: amount });
    res.json({ coinBalance: updated.coinBalance, change: amount });
  } catch { res.status(500).json({ error: "Failed to update coins" }); }
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, email: user.email, name: user.name, role: user.role, status: user.status,
    emailVerified: user.emailVerified, language: user.language, theme: user.theme,
    isOnline: user.isOnline, lastSeen: user.lastSeen?.toISOString() ?? null,
    phone: user.phone, whatsappNumber: user.whatsappNumber, address: user.address, upiId: user.upiId,
    coinBalance: user.coinBalance, referralCode: user.referralCode,
    deviceId: user.deviceId, lastLoginIp: user.lastLoginIp, registrationIp: user.registrationIp,
    loginAttempts: user.loginAttempts, lockedUntil: user.lockedUntil?.toISOString() ?? null,
    bannedPermanently: user.bannedPermanently, bannedReason: user.bannedReason,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null, suspensionReason: user.suspensionReason,
    createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString(),
  };
}

export default router;
