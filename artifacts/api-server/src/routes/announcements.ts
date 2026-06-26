import { Router } from "express";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../lib/middleware";

const router = Router();

// GET /api/announcements — public
router.get("/announcements", async (_req, res) => {
  try {
    const all = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
    res.json({ data: all });
  } catch {
    res.status(500).json({ error: "Failed to list announcements" });
  }
});

// POST /api/announcements — admin
router.post("/announcements", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) { res.status(400).json({ error: "Announcement text is required" }); return; }
    const [a] = await db.insert(announcementsTable).values({ text: text.trim() }).returning();
    res.status(201).json(a);
  } catch {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// PATCH /api/announcements/:id — admin (toggle active, edit text)
router.patch("/announcements/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { text, isActive } = req.body;
    const [existing] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Announcement not found" }); return; }

    const [updated] = await db.update(announcementsTable).set({
      text: text?.trim() ?? existing.text,
      isActive: isActive !== undefined ? isActive : existing.isActive,
      updatedAt: new Date(),
    }).where(eq(announcementsTable.id, id)).returning();

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

// DELETE /api/announcements/:id — admin
router.delete("/announcements/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [del] = await db.delete(announcementsTable).where(eq(announcementsTable.id, parseInt(req.params.id))).returning();
    if (!del) { res.status(404).json({ error: "Announcement not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;
