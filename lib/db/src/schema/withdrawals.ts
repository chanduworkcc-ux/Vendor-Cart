import { pgTable, serial, integer, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["created", "accepted", "processing", "delivered", "rejected"]);

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  coins: integer("coins").notNull(),
  amountRupees: integer("amount_rupees").notNull(),
  upiId: text("upi_id").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("created"),
  adminNote: text("admin_note"),
  isLocked: boolean("is_locked").notNull().default(false),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
