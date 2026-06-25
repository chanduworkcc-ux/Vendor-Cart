import { pgTable, serial, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  acceptingOrders: boolean("accepting_orders").notNull().default(true),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  orderCooldownMinutes: integer("order_cooldown_minutes").notNull().default(120),
  coinsPerReferral: integer("coins_per_referral").notNull().default(100),
  minWithdrawalCoins: integer("min_withdrawal_coins").notNull().default(1000),
  coinsPerRupee: integer("coins_per_rupee").notNull().default(100),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdminSettingsSchema = createInsertSchema(adminSettingsTable).omit({ id: true });
export type InsertAdminSettings = z.infer<typeof insertAdminSettingsSchema>;
export type AdminSettings = typeof adminSettingsTable.$inferSelect;
