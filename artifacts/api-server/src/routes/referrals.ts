import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralsTable, adminSettingsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";

const router = Router();

async function getSettings() {
  const existing = await db.select().from(adminSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(adminSettingsTable).values({}).returning();
  return created;
}

// Get referral info for current user
router.get("/referral/info", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const settings = await getSettings();
    const referrals = await db.select({
      ref: referralsTable,
      name: usersTable.name,
    })
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
      referralEnabled: settings.referralEnabled,
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

// Admin: get all referrals with user details
router.get("/admin/referrals", requireAdmin, async (_req, res) => {
  try {
    const referrals = await db.select().from(referralsTable).orderBy(desc(referralsTable.createdAt));

    const users = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      coinBalance: usersTable.coinBalance,
      referralCode: usersTable.referralCode,
      deviceId: usersTable.deviceId,
      lastLoginIp: usersTable.lastLoginIp,
      registrationIp: usersTable.registrationIp,
      status: usersTable.status,
      createdAt: usersTable.createdAt,
    }).from(usersTable);

    const userMap = new Map(users.map(u => [u.id, u]));
    const settings = await getSettings();

    res.json({
      referralEnabled: settings.referralEnabled,
      coinsPerReferral: settings.coinsPerReferral,
      data: referrals.map(r => {
        const referrer = userMap.get(r.referrerId);
        const referred = userMap.get(r.referredUserId);
        return {
          id: r.id,
          referrerId: r.referrerId,
          referrerName: referrer?.name,
          referrerEmail: referrer?.email,
          referrerDevice: referrer?.deviceId,
          referrerIp: referrer?.lastLoginIp,
          referredUserId: r.referredUserId,
          referredUserName: referred?.name,
          referredUserEmail: referred?.email,
          referredUserDevice: referred?.deviceId,
          referredUserIp: referred?.registrationIp,
          coinsAwarded: r.coinsAwarded,
          createdAt: r.createdAt.toISOString(),
        };
      }),
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        coinBalance: u.coinBalance,
        referralCode: u.referralCode,
        deviceId: u.deviceId,
        lastLoginIp: u.lastLoginIp,
        registrationIp: u.registrationIp,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch { res.status(500).json({ error: "Failed to get referrals" }); }
});

export default router;
