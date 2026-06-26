import { pgTable, serial, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const couponTypeEnum = pgEnum("coupon_type", ["public", "private", "new_user", "special_user"]);
export const couponDiscountTypeEnum = pgEnum("coupon_discount_type", ["percentage", "fixed_coins"]);

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: couponTypeEnum("type").notNull().default("public"),
  discountType: couponDiscountTypeEnum("discount_type").notNull().default("percentage"),
  discountValue: integer("discount_value").notNull().default(10),
  bonusCoins: integer("bonus_coins").notNull().default(0),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  assignedUserId: integer("assigned_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const couponUsagesTable = pgTable("coupon_usages", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull(),
  userId: integer("user_id").notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export type Coupon = typeof couponsTable.$inferSelect;
export type CouponUsage = typeof couponUsagesTable.$inferSelect;
