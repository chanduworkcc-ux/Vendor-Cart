import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db/schema";
import { eq, desc, isNull, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";

const router = Router();

function fmt(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    images: p.images ?? [],
    category: p.category,
    price: p.price ? parseFloat(p.price) : 0,
    discountPrice: p.discountPrice ? parseFloat(p.discountPrice) : null,
    badge: p.badge,
    stock: p.stock,
    status: p.status,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /api/products — public (any authenticated user or guest)
router.get("/products", async (req, res) => {
  try {
    const { category, search, status, includeDeleted } = req.query as Record<string, string>;
    const isAdmin = (req as AuthRequest).userRole === "admin";

    let products = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt));

    // Customers NEVER see deleted products — hard rule
    if (!isAdmin || includeDeleted !== "true") {
      products = products.filter(p => !p.deletedAt);
    }

    // Non-admin users only see active, non-deleted products
    if (!isAdmin) {
      products = products.filter(p => p.status === "active");
    }
    if (status && isAdmin) products = products.filter(p => p.status === status);
    if (category) products = products.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }

    res.json({ data: products.map(fmt) });
  } catch {
    res.status(500).json({ error: "Failed to list products" });
  }
});

// GET /api/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const isAdmin = (req as AuthRequest).userRole === "admin";
    const [p] = await db.select().from(productsTable)
      .where(eq(productsTable.id, parseInt(String(req.params.id)))).limit(1);
    if (!p) { res.status(404).json({ error: "Product not found" }); return; }
    // Customers cannot access deleted products
    if (!isAdmin && p.deletedAt) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(fmt(p));
  } catch {
    res.status(500).json({ error: "Failed to get product" });
  }
});

// POST /api/products — admin only
router.post("/products", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, description, images, category, price, discountPrice, badge, stock, status } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Product name is required" }); return; }
    if (!price || isNaN(parseFloat(price))) { res.status(400).json({ error: "Valid price is required" }); return; }

    const imageArr = Array.isArray(images) ? images.filter((u: any) => typeof u === "string" && u.trim()) : [];

    const [p] = await db.insert(productsTable).values({
      name: name.trim(),
      description: description?.trim() || null,
      images: imageArr,
      category: category?.trim() || null,
      price: String(parseFloat(price)),
      discountPrice: discountPrice && !isNaN(parseFloat(discountPrice)) ? String(parseFloat(discountPrice)) : null,
      badge: badge?.trim() || null,
      stock: parseInt(stock) || 0,
      status: status || "active",
    }).returning();

    res.status(201).json(fmt(p));
  } catch {
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PATCH /api/products/:id — admin only (general update)
router.patch("/products/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }

    const { name, description, images, category, price, discountPrice, badge, stock, status } = req.body;

    const imageArr = Array.isArray(images)
      ? images.filter((u: any) => typeof u === "string" && u.trim())
      : existing.images;

    const [updated] = await db.update(productsTable).set({
      name: name?.trim() ?? existing.name,
      description: description !== undefined ? (description?.trim() || null) : existing.description,
      images: imageArr,
      category: category !== undefined ? (category?.trim() || null) : existing.category,
      price: price !== undefined ? String(parseFloat(price)) : existing.price,
      discountPrice: discountPrice !== undefined
        ? (discountPrice && !isNaN(parseFloat(discountPrice)) ? String(parseFloat(discountPrice)) : null)
        : existing.discountPrice,
      badge: badge !== undefined ? (badge?.trim() || null) : existing.badge,
      stock: stock !== undefined ? Math.max(0, parseInt(stock) || 0) : existing.stock,
      status: status ?? existing.status,
      updatedAt: new Date(),
    }).where(eq(productsTable.id, id)).returning();

    res.json(fmt(updated));
  } catch {
    res.status(500).json({ error: "Failed to update product" });
  }
});

// POST /api/products/:id/add-stock — admin only: add units to stock
router.post("/products/:id/add-stock", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const qty = parseInt(req.body.quantity);
    if (!qty || qty < 1) { res.status(400).json({ error: "quantity must be a positive integer" }); return; }

    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }

    const [updated] = await db.update(productsTable).set({
      stock: sql`${productsTable.stock} + ${qty}`,
      updatedAt: new Date(),
    }).where(eq(productsTable.id, id)).returning();

    res.json(fmt(updated));
  } catch {
    res.status(500).json({ error: "Failed to add stock" });
  }
});

// PATCH /api/products/:id/out-of-stock — admin only: mark out of stock (stock = 0)
router.patch("/products/:id/out-of-stock", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }

    const [updated] = await db.update(productsTable).set({
      stock: 0,
      updatedAt: new Date(),
    }).where(eq(productsTable.id, id)).returning();

    res.json(fmt(updated));
  } catch {
    res.status(500).json({ error: "Failed to mark out of stock" });
  }
});

// DELETE /api/products/:id — admin only (SOFT DELETE: hidden from customers, recoverable)
router.delete("/products/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }

    const [updated] = await db.update(productsTable).set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(productsTable.id, id)).returning();

    res.json({ success: true, deletedAt: updated.deletedAt });
  } catch {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

router.get("/categories", async (_req, res) => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    res.json({ data: cats });
  } catch {
    res.status(500).json({ error: "Failed to list categories" });
  }
});

router.post("/categories", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Category name is required" }); return; }
    const [cat] = await db.insert(categoriesTable).values({ name: name.trim() }).returning();
    res.status(201).json(cat);
  } catch (e: any) {
    if (e.code === "23505") { res.status(409).json({ error: "Category already exists" }); return; }
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.delete("/categories/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [del] = await db.delete(categoriesTable).where(eq(categoriesTable.id, parseInt(String(req.params.id)))).returning();
    if (!del) { res.status(404).json({ error: "Category not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
