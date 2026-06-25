import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralsTable, notificationsTable, adminSettingsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToUser, broadcastToAdmins } from "../lib/websocket";

const router = Router();

// Get referral info for current user
router.get("/referral/info", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const settings = await getSettings();
    const referrals = await db.select({ ref: referralsTable, name: usersTable.name })
      .from(referralsTable)
      .leftJoin(usersTable, eq(referralsTable.referredUserId, usersTable.id))
      .where(eq(referralsTable.referrerId, req.userId!))
      .orderBy(desc(referralsTable.createdAt));

    res.json({
      referralCode: user.referralCode,
      coinBalance: user.coinBalance,
      coinsPerReferral: settings.coinsPerReferral,
      minWithdrawalCoins: settings.minWithdrawalCoins,
      coinsPerRupee: settings.coinsPerRupee,
      totalReferrals: referrals.length,
      referrals: referrals.map(r => ({
        id: r.ref.id,
        referredUserName: r.name,
        coinsAwarded: r.ref.coinsAwarded,
        createdAt: r.ref.createdAt.toISOString(),
      })),
    });
  } catch { res.status(500).json({ error: "Failed to get referral info" }); }
});

// Admin: get all referrals
router.get("/admin/referrals", requireAdmin, async (_req, res) => {
  try {
    const referrals = await db
      .select()
      .from(referralsTable)
      .orderBy(desc(referralsTable.createdAt));

    const users = await db.select({ id: usersTable.id, name: usersTable.name, coinBalance: usersTable.coinBalance, referralCode: usersTable.referralCode })
      .from(usersTable);

    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      data: referrals.map(r => ({
        id: r.id,
        referrerId: r.referrerId,
        referrerName: userMap.get(r.referrerId)?.name,
        referredUserId: r.referredUserId,
        referredUserName: userMap.get(r.referredUserId)?.name,
        coinsAwarded: r.coinsAwarded,
        createdAt: r.createdAt.toISOString(),
      })),
      users: users.map(u => ({ id: u.id, name: u.name, coinBalance: u.coinBalance, referralCode: u.referralCode })),
    });
  } catch { res.status(500).json({ error: "Failed to get referrals" }); }
});

async function getSettings() {
  const existing = await db.select().from(adminSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(adminSettingsTable).values({}).returning();
  return created;
}

export default router;
