import { pgTable, serial, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "special"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "approved", "rejected"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("pending"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  language: text("language").notNull().default("en"),
  theme: text("theme").notNull().default("light"),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeen: timestamp("last_seen"),
  phone: text("phone"),
  address: text("address"),
  upiId: text("upi_id"),
  coinBalance: integer("coin_balance").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
  deviceId: text("device_id"),
  lastOrderAt: timestamp("last_order_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
