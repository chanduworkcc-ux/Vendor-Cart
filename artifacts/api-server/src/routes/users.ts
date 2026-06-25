import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToUser, broadcastToAdmins } from "../lib/websocket";

const router = Router();

router.get("/users", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, role } = req.query as { status?: string; role?: string };
    let users = await db.select().from(usersTable);
    if (status) users = users.filter(u => u.status === status);
    if (role) users = users.filter(u => u.role === role);
    res.json({ data: users.map(formatUser) });
  } catch {
    res.status(500).json({ error: "Failed to list users" });
  }
});

router.get("/users/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (req.userRole !== "admin" && req.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(formatUser(user));
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.patch("/users/:userId/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { status, reason } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Status must be approved or rejected" }); return;
    }
    const [updated] = await db.update(usersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }

    const title = status === "approved" ? "Account Approved!" : "Account Update";
    const message = status === "approved"
      ? "Your account has been approved. You can now log in and place orders."
      : `Your account has been rejected.${reason ? ` Reason: ${reason}` : ""}`;

    await db.insert(notificationsTable).values({
      userId,
      title,
      message,
      type: "account_update",
      isRead: false,
    });

    broadcastToUser(userId, "account_status_changed", { status, message });

    res.json(formatUser(updated));
  } catch {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

router.patch("/users/:userId/role", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { role } = req.body;
    if (!["user", "admin", "special"].includes(role)) {
      res.status(400).json({ error: "Invalid role" }); return;
    }
    const [updated] = await db.update(usersTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }

    await db.insert(notificationsTable).values({
      userId,
      title: "Account Role Updated",
      message: `Your account role has been updated to: ${role}.`,
      type: "account_update",
      isRead: false,
    });

    broadcastToUser(userId, "role_changed", { role });
    res.json(formatUser(updated));
  } catch {
    res.status(500).json({ error: "Failed to update user role" });
  }
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    verificationCode: null,
  };
}

export default router;
