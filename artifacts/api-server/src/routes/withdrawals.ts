import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, withdrawalRequestsTable, notificationsTable, adminSettingsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToUser, broadcastToAdmins } from "../lib/websocket";

const router = Router();

async function getSettings() {
  const existing = await db.select().from(adminSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(adminSettingsTable).values({}).returning();
  return created;
}

// Create withdrawal request
router.post("/withdrawals", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { coins, upiId } = req.body;
    if (!coins || !upiId) { res.status(400).json({ error: "Coins and UPI ID are required" }); return; }

    const settings = await getSettings();
    if (coins < settings.minWithdrawalCoins) {
      res.status(400).json({ error: `Minimum withdrawal is ${settings.minWithdrawalCoins} coins` }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.coinBalance < coins) {
      res.status(400).json({ error: "Insufficient coin balance" }); return;
    }

    const amountRupees = Math.floor(coins / settings.coinsPerRupee);

    // Deduct coins
    await db.update(usersTable)
      .set({ coinBalance: user.coinBalance - coins, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!));

    const [withdrawal] = await db.insert(withdrawalRequestsTable).values({
      userId: req.userId!,
      coins,
      amountRupees,
      upiId,
      status: "created",
    }).returning();

    broadcastToAdmins("new_withdrawal", { withdrawalId: withdrawal.id, userId: req.userId, coins, amountRupees });

    res.status(201).json(formatWithdrawal(withdrawal, user.name));
  } catch { res.status(500).json({ error: "Failed to create withdrawal request" }); }
});

// Get user withdrawals
router.get("/withdrawals", requireAuth, async (req: AuthRequest, res) => {
  try {
    let withdrawals;
    if (req.userRole === "admin") {
      withdrawals = await db.select({
        w: withdrawalRequestsTable,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
        .from(withdrawalRequestsTable)
        .leftJoin(usersTable, eq(withdrawalRequestsTable.userId, usersTable.id))
        .orderBy(desc(withdrawalRequestsTable.createdAt));
    } else {
      const rows = await db.select({
        w: withdrawalRequestsTable,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
        .from(withdrawalRequestsTable)
        .leftJoin(usersTable, eq(withdrawalRequestsTable.userId, usersTable.id))
        .where(eq(withdrawalRequestsTable.userId, req.userId!))
        .orderBy(desc(withdrawalRequestsTable.createdAt));
      withdrawals = rows;
    }

    res.json({
      data: withdrawals.map(row => ({
        ...formatWithdrawal(row.w, row.userName ?? undefined),
        userEmail: row.userEmail,
      })),
    });
  } catch { res.status(500).json({ error: "Failed to get withdrawals" }); }
});

// Admin: update withdrawal status
router.patch("/withdrawals/:id/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, adminNote } = req.body;
    const valid = ["accepted", "delivered", "rejected"];
    if (!valid.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }

    const [existing] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Withdrawal not found" }); return; }

    // If rejected, refund coins
    if (status === "rejected" && existing.status === "created") {
      const [currentUser] = await db.select({ coinBalance: usersTable.coinBalance }).from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
      await db.update(usersTable)
        .set({ coinBalance: (currentUser?.coinBalance ?? 0) + existing.coins, updatedAt: new Date() })
        .where(eq(usersTable.id, existing.userId));
    }

    const [updated] = await db.update(withdrawalRequestsTable)
      .set({ status: status as any, adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(withdrawalRequestsTable.id, id))
      .returning();

    const statusMessages: Record<string, string> = {
      accepted: "Your withdrawal request has been accepted and is being processed.",
      delivered: "Your withdrawal has been successfully transferred to your UPI account.",
      rejected: "Your withdrawal request has been rejected. Coins have been refunded.",
    };

    await db.insert(notificationsTable).values({
      userId: existing.userId,
      title: `Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: statusMessages[status],
      type: "info",
      isRead: false,
    });

    broadcastToUser(existing.userId, "withdrawal_status_changed", { withdrawalId: id, status });

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
    res.json(formatWithdrawal(updated, user?.name));
  } catch { res.status(500).json({ error: "Failed to update withdrawal" }); }
});

function formatWithdrawal(w: any, userName?: string) {
  return {
    id: w.id,
    userId: w.userId,
    userName: userName ?? null,
    coins: w.coins,
    amountRupees: w.amountRupees,
    upiId: w.upiId,
    status: w.status,
    adminNote: w.adminNote,
    createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : w.createdAt,
    updatedAt: w.updatedAt instanceof Date ? w.updatedAt.toISOString() : w.updatedAt,
  };
}

export default router;
