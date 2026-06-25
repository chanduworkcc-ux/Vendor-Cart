import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { hashPassword, comparePassword } from "../lib/auth";
import { getOnlineUserIds } from "../lib/websocket";

const router = Router();

// Update profile (name, language, theme)
router.patch("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, language, theme } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (language) updates.language = language;
    if (theme) updates.theme = theme;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();
    res.json(formatUser(updated));
  } catch { res.status(500).json({ error: "Failed to update profile" }); }
});

// Change password
router.patch("/profile/password", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
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
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, lastSeen: usersTable.lastSeen })
      .from(usersTable);
    res.json({
      onlineCount: onlineIds.length,
      users: users.map(u => ({ ...u, isOnline: onlineIds.includes(u.id), lastSeen: u.lastSeen?.toISOString() ?? null })),
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
    res.json({ data: logs.map(l => ({ id: l.log.id, userId: l.log.userId, userName: l.userName, action: l.log.action, details: l.log.details, createdAt: l.log.createdAt.toISOString() })) });
  } catch { res.status(500).json({ error: "Failed to get activity logs" }); }
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    status: user.status, emailVerified: user.emailVerified,
    language: user.language, theme: user.theme,
    isOnline: user.isOnline, lastSeen: user.lastSeen?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export default router;
