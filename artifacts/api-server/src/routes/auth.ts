import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken, generateVerificationCode } from "../lib/auth";
import { requireAuth, type AuthRequest } from "../lib/middleware";
import { broadcastToAdmins } from "../lib/websocket";
import { notificationsTable } from "@workspace/db/schema";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash,
      name,
      role: "user",
      status: "pending",
      emailVerified: false,
      verificationCode,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "Welcome! Please verify your email",
      message: `Your verification code is: ${verificationCode}. Enter it to activate your account.`,
      type: "info",
      isRead: false,
    });

    broadcastToAdmins("new_user_registered", {
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        verificationCode: user.verificationCode,
      },
      token,
      message: `Your verification code is: ${verificationCode}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/verify-email", async (req, res) => {
  try {
    const { code, email } = req.body;
    if (!code || !email) {
      res.status(400).json({ error: "Code and email are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(400).json({ error: "User not found" });
      return;
    }
    if (user.emailVerified) {
      const token = signToken({ userId: user.id, role: user.role });
      res.json({
        user: formatUser(user),
        token,
        message: "Email already verified",
      });
      return;
    }
    if (user.verificationCode !== code) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }
    const [updated] = await db.update(usersTable)
      .set({ emailVerified: true, verificationCode: null, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "Email verified! Your account is pending approval.",
      message: "An admin will review and approve your account soon.",
      type: "info",
      isRead: false,
    });

    broadcastToAdmins("user_email_verified", {
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    const token = signToken({ userId: updated.id, role: updated.role });
    res.json({ user: formatUser(updated), token });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({ error: "Please verify your email first" });
      return;
    }
    if (user.status === "rejected") {
      res.status(403).json({ error: "Your account has been rejected" });
      return;
    }
    if (user.status === "pending" && user.role !== "admin") {
      res.status(403).json({ error: "Your account is pending admin approval" });
      return;
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.json({ user: formatUser(user), token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.post("/auth/logout", async (_req, res) => {
  res.json({ status: "ok" });
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    verificationCode: user.verificationCode,
  };
}

export default router;
