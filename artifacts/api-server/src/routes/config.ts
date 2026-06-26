import { Router } from "express";
import { db } from "@workspace/db";
import { adminSettingsTable } from "@workspace/db/schema";

const router = Router();

router.get("/config", async (_req, res) => {
  try {
    const rows = await db.select().from(adminSettingsTable).limit(1);
    let s = rows[0];
    if (!s) {
      const [created] = await db.insert(adminSettingsTable).values({}).returning();
      s = created;
    }
    res.json({
      logoUrl: s.logoUrl ?? null,
      currentAppVersion: s.currentAppVersion,
      minRequiredVersion: s.minRequiredVersion,
      updateDownloadLink: s.updateDownloadLink ?? null,
      forceUpdateEnabled: s.forceUpdateEnabled,
    });
  } catch {
    res.status(500).json({ error: "Failed to load config" });
  }
});

export default router;
