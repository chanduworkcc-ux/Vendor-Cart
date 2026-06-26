import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { hashPassword, comparePassword } from "../lib/auth";
import { getOnlineUserIds } from "../lib/websocket";

const router = Router();

function sanitize(input: string | undefined | null): string | null {
  if (input === undefined || input === null) return null;
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

function sanitizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "") return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

// Update profile (name, language, theme, phone, address, upiId, bio, avatarUrl, bannerUrl, whatsappNumber)
router.patch("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, language, theme, phone, address, upiId, bio, avatarUrl, bannerUrl, whatsappNumber } = req.body;
    const updates: any = { updatedAt: new Date() };

    if (name !== undefined) {
      const cleanName = sanitize(name);
      if (!cleanName || cleanName.length < 1) { res.status(400).json({ error: "Name cannot be empty" }); return; }
      if (cleanName.length > 100) { res.status(400).json({ error: "Name too long (max 100 characters)" }); return; }
      updates.name = cleanName;
    }
    if (language !== undefined) updates.language = language || "en";
    if (theme !== undefined) updates.theme = theme || "light";
    if (phone !== undefined) {
      const cleanPhone = sanitize(phone);
      if (cleanPhone && !/^[+\d\s\-().]{7,20}$/.test(cleanPhone)) { res.status(400).json({ error: "Invalid phone number format" }); return; }
      updates.phone = cleanPhone || null;
    }
    if (address !== undefined) {
      const cleanAddress = sanitize(address);
      if (cleanAddress && cleanAddress.length > 300) { res.status(400).json({ error: "Address too long (max 300 characters)" }); return; }
      updates.address = cleanAddress || null;
    }
    if (upiId !== undefined) {
      const cleanUpi = sanitize(upiId);
      updates.upiId = cleanUpi || null;
    }
    if (bio !== undefined) {
      const cleanBio = sanitize(bio);
      if (cleanBio && cleanBio.length > 500) { res.status(400).json({ error: "Bio too long (max 500 characters)" }); return; }
      updates.bio = cleanBio || null;
    }
    if (avatarUrl !== undefined) {
      updates.avatarUrl = sanitizeUrl(avatarUrl);
    }
    if (bannerUrl !== undefined) {
      updates.bannerUrl = sanitizeUrl(bannerUrl);
    }
    if (whatsappNumber !== undefined) {
      const cleanWa = sanitize(whatsappNumber);
      if (cleanWa && !/^[+\d\s\-().]{7,20}$/.test(cleanWa)) { res.status(400).json({ error: "Invalid WhatsApp number format" }); return; }
      updates.whatsappNumber = cleanWa || null;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to update profile" }); }
});

// Change password
router.patch("/profile/password", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
    if (typeof newPassword !== "string" || newPassword.length < 6) { res.status(400).json({ error: "New password must be at least 6 characters" }); return; }
    if (newPassword.length > 128) { res.status(400).json({ error: "Password too long" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
    const hash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(usersTable.id, req.userId!));
    res.json({ message: "Password changed successfully" });
  } catch { res.status(500).json({ error: "Failed to change password" }); }
});

// Get online users (admin only)
router.get("/admin/online-users", requireAdmin, async (_req, res) => {
  try {
    const onlineIds = getOnlineUserIds();
    const users = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, status: usersTable.status, lastSeen: usersTable.lastSeen,
      coinBalance: usersTable.coinBalance, referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
    }).from(usersTable);
    res.json({
      onlineCount: onlineIds.length,
      users: users.map(u => ({
        ...u,
        isOnline: onlineIds.includes(u.id),
        lastSeen: u.lastSeen?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch { res.status(500).json({ error: "Failed to get online users" }); }
});

// Activity logs (admin)
router.get("/admin/activity-logs", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    let logs = await db.select({ log: activityLogsTable, userName: usersTable.name })
      .from(activityLogsTable).leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
      .orderBy(desc(activityLogsTable.createdAt)).limit(200);
    if (userId) logs = logs.filter(l => l.log.userId === parseInt(userId));
    res.json({ data: logs.map(l => ({ id: l.log.id, userId: l.log.userId, userName: l.userName, action: l.log.action, details: l.log.details, ipAddress: l.log.ipAddress, createdAt: l.log.createdAt.toISOString() })) });
  } catch { res.status(500).json({ error: "Failed to get activity logs" }); }
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    status: user.status, emailVerified: user.emailVerified,
    language: user.language, theme: user.theme,
    isOnline: user.isOnline, lastSeen: user.lastSeen?.toISOString() ?? null,
    phone: user.phone, address: user.address, upiId: user.upiId,
    whatsappNumber: user.whatsappNumber,
    bio: user.bio, avatarUrl: user.avatarUrl, bannerUrl: user.bannerUrl,
    coinBalance: user.coinBalance, referralCode: user.referralCode,
    createdAt: user.createdAt.toISOString(),
  };
}

export default router;
