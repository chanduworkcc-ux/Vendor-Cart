import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const coinTokensTable = pgTable("coin_tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  emoji: text("emoji").notNull().default("🪙"),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userTokenBalancesTable = pgTable("user_token_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenId: integer("token_id").notNull().references(() => coinTokensTable.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tokenTransactionsTable = pgTable("token_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenId: integer("token_id").notNull().references(() => coinTokensTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // "mint" | "deduct"
  note: text("note"),
  mintedBy: integer("minted_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CoinToken = typeof coinTokensTable.$inferSelect;
export type UserTokenBalance = typeof userTokenBalancesTable.$inferSelect;
export type TokenTransaction = typeof tokenTransactionsTable.$inferSelect;
