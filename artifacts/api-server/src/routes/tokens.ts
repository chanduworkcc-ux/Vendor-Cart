import { Router } from "express";
import { db } from "@workspace/db";
import { coinTokensTable, userTokenBalancesTable, tokenTransactionsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";

const router = Router();

// GET /api/tokens — list all token types (any authenticated user)
router.get("/tokens", requireAuth, async (_req, res) => {
  try {
    const tokens = await db.select().from(coinTokensTable).orderBy(coinTokensTable.createdAt);
    res.json({ data: tokens });
  } catch {
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

// GET /api/tokens/my-balances — current user's balances for all tokens
router.get("/tokens/my-balances", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const tokens = await db.select().from(coinTokensTable).orderBy(coinTokensTable.createdAt);
    const balances = await db
      .select()
      .from(userTokenBalancesTable)
      .where(eq(userTokenBalancesTable.userId, userId));

    const result = tokens.map((token) => {
      const bal = balances.find((b) => b.tokenId === token.id);
      return { ...token, balance: bal?.balance ?? 0 };
    });

    res.json({ data: result });
  } catch {
    res.status(500).json({ error: "Failed to fetch token balances" });
  }
});

// GET /api/tokens/my-transactions — current user's transaction history
router.get("/tokens/my-transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const txns = await db
      .select({
        id: tokenTransactionsTable.id,
        amount: tokenTransactionsTable.amount,
        type: tokenTransactionsTable.type,
        note: tokenTransactionsTable.note,
        createdAt: tokenTransactionsTable.createdAt,
        tokenName: coinTokensTable.name,
        tokenSymbol: coinTokensTable.symbol,
        tokenEmoji: coinTokensTable.emoji,
        tokenColor: coinTokensTable.color,
      })
      .from(tokenTransactionsTable)
      .innerJoin(coinTokensTable, eq(tokenTransactionsTable.tokenId, coinTokensTable.id))
      .where(eq(tokenTransactionsTable.userId, userId))
      .orderBy(desc(tokenTransactionsTable.createdAt))
      .limit(50);
    res.json({ data: txns });
  } catch {
    res.status(500).json({ error: "Failed to fetch token transactions" });
  }
});

// POST /api/tokens — admin: create a token type
router.post("/tokens", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, symbol, emoji, color, description } = req.body;
    if (!name || !symbol) return res.status(400).json({ error: "name and symbol are required" });

    const [token] = await db
      .insert(coinTokensTable)
      .values({ name, symbol: symbol.toUpperCase(), emoji: emoji || "🪙", color: color || "#6366f1", description })
      .returning();
    res.json(token);
  } catch (e: any) {
    if (e?.code === "23505") return res.status(409).json({ error: "Token symbol already exists" });
    res.status(500).json({ error: "Failed to create token" });
  }
});

// PATCH /api/tokens/:id — admin: update token type
router.patch("/tokens/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { name, emoji, color, description } = req.body;
    const [updated] = await db
      .update(coinTokensTable)
      .set({ name, emoji, color, description, updatedAt: new Date() })
      .where(eq(coinTokensTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Token not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update token" });
  }
});

// DELETE /api/tokens/:id — admin: delete token type
router.delete("/tokens/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(coinTokensTable).where(eq(coinTokensTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete token" });
  }
});

// POST /api/tokens/:id/mint — admin: mint tokens to a user
router.post("/tokens/:id/mint", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const tokenId = parseInt(String(req.params.id));
    const { userId, amount, note } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "userId and a positive amount are required" });
    }

    const token = await db.select().from(coinTokensTable).where(eq(coinTokensTable.id, tokenId)).limit(1);
    if (!token.length) return res.status(404).json({ error: "Token not found" });

    const user = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(userId))).limit(1);
    if (!user.length) return res.status(404).json({ error: "User not found" });

    // Upsert balance
    const existing = await db
      .select()
      .from(userTokenBalancesTable)
      .where(and(eq(userTokenBalancesTable.userId, parseInt(userId)), eq(userTokenBalancesTable.tokenId, tokenId)))
      .limit(1);

    if (existing.length) {
      await db
        .update(userTokenBalancesTable)
        .set({ balance: existing[0].balance + parseInt(amount), updatedAt: new Date() })
        .where(eq(userTokenBalancesTable.id, existing[0].id));
    } else {
      await db.insert(userTokenBalancesTable).values({
        userId: parseInt(userId),
        tokenId,
        balance: parseInt(amount),
      });
    }

    await db.insert(tokenTransactionsTable).values({
      userId: parseInt(userId),
      tokenId,
      amount: parseInt(amount),
      type: "mint",
      note: note || null,
      mintedBy: req.userId!,
    });

    res.json({ success: true, message: `Minted ${amount} ${token[0].symbol} to ${user[0].name}` });
  } catch {
    res.status(500).json({ error: "Failed to mint tokens" });
  }
});

// POST /api/tokens/:id/deduct — admin: deduct tokens from a user
router.post("/tokens/:id/deduct", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const tokenId = parseInt(String(req.params.id));
    const { userId, amount, note } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "userId and a positive amount are required" });
    }

    const existing = await db
      .select()
      .from(userTokenBalancesTable)
      .where(and(eq(userTokenBalancesTable.userId, parseInt(userId)), eq(userTokenBalancesTable.tokenId, tokenId)))
      .limit(1);

    const currentBalance = existing[0]?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance - parseInt(amount));

    if (existing.length) {
      await db
        .update(userTokenBalancesTable)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(userTokenBalancesTable.id, existing[0].id));
    }

    await db.insert(tokenTransactionsTable).values({
      userId: parseInt(userId),
      tokenId,
      amount: -parseInt(amount),
      type: "deduct",
      note: note || null,
      mintedBy: req.user!.id,
    });

    res.json({ success: true, newBalance });
  } catch {
    res.status(500).json({ error: "Failed to deduct tokens" });
  }
});

// GET /api/admin/token-ledger — admin: all balances across all users
router.get("/admin/token-ledger", requireAdmin, async (_req, res) => {
  try {
    const ledger = await db
      .select({
        id: userTokenBalancesTable.id,
        balance: userTokenBalancesTable.balance,
        updatedAt: userTokenBalancesTable.updatedAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userId: usersTable.id,
        tokenName: coinTokensTable.name,
        tokenSymbol: coinTokensTable.symbol,
        tokenEmoji: coinTokensTable.emoji,
        tokenColor: coinTokensTable.color,
        tokenId: coinTokensTable.id,
      })
      .from(userTokenBalancesTable)
      .innerJoin(usersTable, eq(userTokenBalancesTable.userId, usersTable.id))
      .innerJoin(coinTokensTable, eq(userTokenBalancesTable.tokenId, coinTokensTable.id))
      .orderBy(desc(userTokenBalancesTable.updatedAt));

    res.json({ data: ledger });
  } catch {
    res.status(500).json({ error: "Failed to fetch token ledger" });
  }
});

// GET /api/admin/token-transactions — admin: all transactions
router.get("/admin/token-transactions", requireAdmin, async (_req, res) => {
  try {
    const txns = await db
      .select({
        id: tokenTransactionsTable.id,
        amount: tokenTransactionsTable.amount,
        type: tokenTransactionsTable.type,
        note: tokenTransactionsTable.note,
        createdAt: tokenTransactionsTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userId: usersTable.id,
        tokenName: coinTokensTable.name,
        tokenSymbol: coinTokensTable.symbol,
        tokenEmoji: coinTokensTable.emoji,
        tokenColor: coinTokensTable.color,
      })
      .from(tokenTransactionsTable)
      .innerJoin(usersTable, eq(tokenTransactionsTable.userId, usersTable.id))
      .innerJoin(coinTokensTable, eq(tokenTransactionsTable.tokenId, coinTokensTable.id))
      .orderBy(desc(tokenTransactionsTable.createdAt))
      .limit(200);

    res.json({ data: txns });
  } catch {
    res.status(500).json({ error: "Failed to fetch token transactions" });
  }
});

// GET /api/admin/users/:userId/tokens — admin: get a specific user's token balances
router.get("/admin/users/:userId/tokens", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const tokens = await db.select().from(coinTokensTable).orderBy(coinTokensTable.createdAt);
    const balances = await db
      .select()
      .from(userTokenBalancesTable)
      .where(eq(userTokenBalancesTable.userId, userId));

    const result = tokens.map((token) => {
      const bal = balances.find((b) => b.tokenId === token.id);
      return { ...token, balance: bal?.balance ?? 0 };
    });

    res.json({ data: result });
  } catch {
    res.status(500).json({ error: "Failed to fetch user token balances" });
  }
});

export default router;
