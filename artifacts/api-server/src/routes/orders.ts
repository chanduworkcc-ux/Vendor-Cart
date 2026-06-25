import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, notificationsTable, adminSettingsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/middleware";
import { broadcastToUser, broadcastToAdmins } from "../lib/websocket";

const router = Router();

router.get("/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, userId: queryUserId } = req.query as { status?: string; userId?: string };
    let orders = await db
      .select({
        order: ordersTable,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .orderBy(desc(ordersTable.createdAt));

    if (req.userRole !== "admin") {
      orders = orders.filter(o => o.order.userId === req.userId);
    } else if (queryUserId) {
      orders = orders.filter(o => o.order.userId === parseInt(queryUserId));
    }
    if (status) orders = orders.filter(o => o.order.status === status);

    res.json({ data: orders.map(o => formatOrder(o.order, o.userName, o.userEmail)) });
  } catch {
    res.status(500).json({ error: "Failed to list orders" });
  }
});

router.post("/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const settings = await getSettings();
    if (!settings.acceptingOrders) {
      res.status(400).json({ error: "Orders are not being accepted at this time" });
      return;
    }

    const { title, description, notes } = req.body;
    if (!title) {
      res.status(400).json({ error: "Title is required" }); return;
    }

    // Enforce: one order per cooldown period
    const cooldownMs = settings.orderCooldownMinutes * 60 * 1000;
    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (currentUser?.lastOrderAt) {
      const timeSinceLast = Date.now() - new Date(currentUser.lastOrderAt).getTime();
      if (timeSinceLast < cooldownMs) {
        const remainingMin = Math.ceil((cooldownMs - timeSinceLast) / 60000);
        res.status(400).json({ error: `You can place another order in ${remainingMin} minute(s). One order per ${settings.orderCooldownMinutes} minutes.` });
        return;
      }
    }

    // Enforce: only one active (non-delivered, non-cancelled) order at a time
    const activeOrders = await db.select().from(ordersTable)
      .where(eq(ordersTable.userId, req.userId!));
    const hasActive = activeOrders.some(o => o.status !== "delivered" && o.status !== "cancelled");
    if (hasActive) {
      res.status(400).json({ error: "You already have an active order. You can place a new order after your current one is completed." });
      return;
    }

    // Generate orderRef: 2026-XXXX
    const year = new Date().getFullYear();
    const existingCount = await db.select().from(ordersTable);
    const refNum = String(existingCount.length + 1).padStart(4, "0");
    const orderRef = `${year}-${refNum}`;

    const [order] = await db.insert(ordersTable).values({
      orderRef,
      userId: req.userId!,
      title,
      description: description || null,
      quantity: 1,
      totalAmount: null,
      status: "pending",
      notes: notes || null,
    }).returning();

    // Update lastOrderAt
    await db.update(usersTable).set({ lastOrderAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, req.userId!));

    broadcastToAdmins("new_order", { orderId: order.id, userId: req.userId, title: order.title });

    const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    res.status(201).json(formatOrder(order, user?.name, user?.email));
  } catch {
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/:orderId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const [result] = await db
      .select({ order: ordersTable, userName: usersTable.name, userEmail: usersTable.email })
      .from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!result) { res.status(404).json({ error: "Order not found" }); return; }
    if (req.userRole !== "admin" && result.order.userId !== req.userId) {
      res.status(403).json({ error: "Access denied" }); return;
    }
    res.json(formatOrder(result.order, result.userName, result.userEmail));
  } catch {
    res.status(500).json({ error: "Failed to get order" });
  }
});

router.patch("/orders/:orderId/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status, notes } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" }); return;
    }

    const [updated] = await db.update(ordersTable)
      .set({ status, notes: notes || null, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

    const statusLabels: Record<string, string> = {
      pending: "Pending", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
    };

    await db.insert(notificationsTable).values({
      userId: updated.userId,
      title: `Order ${updated.orderRef ?? `#${orderId}`} Status Updated`,
      message: `Your order "${updated.title}" is now ${statusLabels[status]}.${notes ? ` Note: ${notes}` : ""}`,
      type: "order_update", isRead: false,
    });

    broadcastToUser(updated.userId, "order_status_changed", { orderId, status, title: updated.title });

    const [userInfo] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);

    res.json(formatOrder(updated, userInfo?.name, userInfo?.email));
  } catch {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

router.patch("/orders/:orderId/shipping", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { shippingPartner, deliveryDate, trackingLink, notes } = req.body;
    if (!shippingPartner || !deliveryDate || !trackingLink) {
      res.status(400).json({ error: "Shipping partner, delivery date, and tracking link are required" }); return;
    }

    const [updated] = await db.update(ordersTable)
      .set({ shippingPartner, deliveryDate, trackingLink, status: "shipped", notes: notes || null, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

    await db.insert(notificationsTable).values({
      userId: updated.userId,
      title: `Order ${updated.orderRef ?? `#${orderId}`} Has Been Shipped!`,
      message: `Your order "${updated.title}" has been shipped via ${shippingPartner}. Expected delivery: ${deliveryDate}. Track: ${trackingLink}`,
      type: "order_update", isRead: false,
    });

    broadcastToUser(updated.userId, "order_shipped", { orderId, shippingPartner, deliveryDate, trackingLink });

    const [userInfo] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);

    res.json(formatOrder(updated, userInfo?.name, userInfo?.email));
  } catch {
    res.status(500).json({ error: "Failed to update shipping details" });
  }
});

async function getSettings() {
  const existing = await db.select().from(adminSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(adminSettingsTable).values({}).returning();
  return created;
}

function formatOrder(order: typeof ordersTable.$inferSelect, userName?: string | null, userEmail?: string | null) {
  return {
    id: order.id,
    orderRef: order.orderRef ?? `${new Date().getFullYear()}-${String(order.id).padStart(4, "0")}`,
    userId: order.userId,
    userName: userName ?? null,
    userEmail: userEmail ?? null,
    title: order.title,
    description: order.description,
    quantity: order.quantity,
    totalAmount: order.totalAmount ? parseFloat(order.totalAmount) : null,
    status: order.status,
    shippingPartner: order.shippingPartner,
    deliveryDate: order.deliveryDate,
    trackingLink: order.trackingLink,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export default router;
