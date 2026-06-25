import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const blockedIpsTable = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  reason: text("reason").notNull().default("Manual block"),
  blockedBy: integer("blocked_by"),
  permanent: boolean("permanent").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BlockedIp = typeof blockedIpsTable.$inferSelect;
