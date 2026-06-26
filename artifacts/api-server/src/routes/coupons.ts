import { Router } from "express";
import { db } from "@workspace/db";
import { couponsTable, couponUsagesTable, usersTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";

const router = Router();

// ─── ADMIN: Create coupon ─────────────────────────────────────────────────────
router.post("/admin/coupons", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { code, description, type, discountType, discountValue, bonusCoins, maxUses, expiresAt, assignedUserId, isActive } = req.body;
    if (!code) { res.status(400).json({ error: "Coupon code required" }); return; }

    const existing = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase())).limit(1);
    if (existing.length > 0) { res.status(409).json({ error: "Coupon code already exists" }); return; }

    const [coupon] = await db.insert(couponsTable).values({
      code: code.toUpperCase(),
      description: description || null,
      type: type || "public",
      discountType: discountType || "percentage",
      discountValue: parseInt(discountValue) || 10,
      bonusCoins: parseInt(bonusCoins) || 0,
      maxUses: maxUses ? parseInt(maxUses) : null,
      isActive: isActive !== undefined ? isActive : true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      assignedUserId: assignedUserId ? parseInt(assignedUserId) : null,
    }).returning();

    res.status(201).json(formatCoupon(coupon));
  } catch { res.status(500).json({ error: "Failed to create coupon" }); }
});

// ─── ADMIN: List coupons ──────────────────────────────────────────────────────
router.get("/admin/coupons", requireAdmin, async (_req, res) => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    res.json({ data: coupons.map(c => ({ ...formatCoupon(c), assignedUserName: c.assignedUserId ? userMap.get(c.assignedUserId)?.name : null, assignedUserEmail: c.assignedUserId ? userMap.get(c.assignedUserId)?.email : null })) });
  } catch { res.status(500).json({ error: "Failed to list coupons" }); }
});

// ─── ADMIN: Update coupon ─────────────────────────────────────────────────────
router.patch("/admin/coupons/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { description, type, discountType, discountValue, bonusCoins, maxUses, expiresAt, assignedUserId, isActive } = req.body;

    const [existing] = await db.select().from(couponsTable).where(eq(couponsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Coupon not found" }); return; }

    const [updated] = await db.update(couponsTable).set({
      description: description ?? existing.description,
      type: type ?? existing.type,
      discountType: discountType ?? existing.discountType,
      discountValue: discountValue !== undefined ? parseInt(discountValue) : existing.discountValue,
      bonusCoins: bonusCoins !== undefined ? parseInt(bonusCoins) : existing.bonusCoins,
      maxUses: maxUses !== undefined ? (maxUses === null ? null : parseInt(maxUses)) : existing.maxUses,
      isActive: isActive !== undefined ? isActive : existing.isActive,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
      assignedUserId: assignedUserId !== undefined ? (assignedUserId ? parseInt(assignedUserId) : null) : existing.assignedUserId,
      updatedAt: new Date(),
    }).where(eq(couponsTable.id, id)).returning();

    res.json(formatCoupon(updated));
  } catch { res.status(500).json({ error: "Failed to update coupon" }); }
});

// ─── ADMIN: Delete coupon ─────────────────────────────────────────────────────
router.delete("/admin/coupons/:id", requireAdmin, async (_req, res) => {
  try {
    const id = parseInt(_req.params.id);
    await db.delete(couponUsagesTable).where(eq(couponUsagesTable.couponId, id));
    await db.delete(couponsTable).where(eq(couponsTable.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete coupon" }); }
});

// ─── USER: Validate coupon ────────────────────────────────────────────────────
router.post("/coupons/validate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: "Code required" }); return; }

    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase())).limit(1);
    if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
    if (!coupon.isActive) { res.status(400).json({ error: "This coupon is no longer active" }); return; }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) { res.status(400).json({ error: "This coupon has expired" }); return; }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) { res.status(400).json({ error: "This coupon has reached its usage limit" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    // Type checks
    if (coupon.type === "private" && coupon.assignedUserId !== req.userId) {
      res.status(403).json({ error: "This coupon is not assigned to your account" }); return;
    }
    if (coupon.type === "special_user" && user.role !== "special" && user.role !== "admin") {
      res.status(403).json({ error: "This coupon is only for special members" }); return;
    }
    if (coupon.type === "new_user") {
      const usages = await db.select().from(couponUsagesTable).where(eq(couponUsagesTable.userId, req.userId!));
      if (usages.length > 0) { res.status(403).json({ error: "This coupon is only for new users" }); return; }
    }

    // Check already used by this user
    const alreadyUsed = await db.select().from(couponUsagesTable).where(and(eq(couponUsagesTable.couponId, coupon.id), eq(couponUsagesTable.userId, req.userId!))).limit(1);
    if (alreadyUsed.length > 0) { res.status(400).json({ error: "You have already used this coupon" }); return; }

    res.json({ valid: true, coupon: formatCoupon(coupon) });
  } catch { res.status(500).json({ error: "Failed to validate coupon" }); }
});

// ─── USER: Get available coupons ──────────────────────────────────────────────
router.get("/coupons/available", requireAuth, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const allCoupons = await db.select().from(couponsTable);
    const usages = await db.select().from(couponUsagesTable).where(eq(couponUsagesTable.userId, req.userId!));
    const usedIds = new Set(usages.map(u => u.couponId));
    const isNewUser = usages.length === 0;

    const available = allCoupons.filter(c => {
      if (!c.isActive) return false;
      if (c.expiresAt && c.expiresAt < now) return false;
      if (c.maxUses && c.usedCount >= c.maxUses) return false;
      if (usedIds.has(c.id)) return false;
      if (c.type === "private") return c.assignedUserId === req.userId;
      if (c.type === "special_user") return user.role === "special" || user.role === "admin";
      if (c.type === "new_user") return isNewUser;
      return true; // public
    });

    res.json({ data: available.map(formatCoupon) });
  } catch { res.status(500).json({ error: "Failed to get coupons" }); }
});

function formatCoupon(c: any) {
  return {
    id: c.id, code: c.code, description: c.description, type: c.type,
    discountType: c.discountType, discountValue: c.discountValue, bonusCoins: c.bonusCoins,
    maxUses: c.maxUses, usedCount: c.usedCount, isActive: c.isActive,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    assignedUserId: c.assignedUserId,
    createdAt: c.createdAt?.toISOString(),
    updatedAt: c.updatedAt?.toISOString(),
  };
}

export default router;
