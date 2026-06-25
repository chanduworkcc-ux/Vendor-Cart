import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable, adminSettingsTable, blockedIpsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword, comparePassword, signToken, generateVerificationCode } from "../lib/auth";
import { requireAuth, type AuthRequest } from "../lib/middleware";
import { broadcastToAdmins } from "../lib/websocket";
import { notificationsTable } from "@workspace/db/schema";

const router = Router();

function getIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function getUserAgent(req: any): string {
  return req.headers["user-agent"] || "unknown";
}

async function logActivity(userId: number | null, action: string, details: string, req: any) {
  try {
    await db.insert(activityLogsTable).values({
      userId,
      action,
      details,
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      deviceId: req.body?.deviceId || null,
    });
  } catch {}
}

async function getSettings() {
  const rows = await db.select().from(adminSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(adminSettingsTable).values({}).returning();
  return created;
}

async function isIpBlocked(ip: string): Promise<boolean> {
  const now = new Date();
  const rows = await db.select().from(blockedIpsTable)
    .where(eq(blockedIpsTable.ipAddress, ip))
    .limit(1);
  if (rows.length === 0) return false;
  const b = rows[0];
  if (b.permanent) return true;
  if (b.expiresAt && b.expiresAt > now) return true;
  return false;
}

function generateReferralCode(name: string, id: number): string {
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4).padEnd(4, "X");
  return `${clean}${String(id).padStart(4, "0")}`;
}

router.post("/auth/register", async (req, res) => {
  try {
    const ip = getIp(req);

    // IP block check
    if (await isIpBlocked(ip)) {
      res.status(403).json({ error: "Access denied from this IP address." });
      return;
    }

    const { email, password, name, referralCode, deviceId } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    // One device, one account check
    if (deviceId) {
      const existingDevice = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
      if (existingDevice.length > 0) {
        await logActivity(null, "register_blocked_device", `Device ${deviceId} already registered`, req);
        res.status(409).json({ error: "An account already exists on this device. Only one account per device is allowed." });
        return;
      }
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      await logActivity(null, "register_duplicate_email", `Duplicate email: ${email}`, req);
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Check referral code
    let referrerId: number | null = null;
    if (referralCode) {
      const referrer = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
      if (referrer.length > 0) referrerId = referrer[0].id;
    }

    const passwordHash = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: "user",
      status: "pending",
      emailVerified: false,
      verificationCode,
      deviceId: deviceId || null,
      referredBy: referrerId,
      registrationIp: ip,
    }).returning();

    const userReferralCode = generateReferralCode(name, user.id);
    await db.update(usersTable).set({ referralCode: userReferralCode }).where(eq(usersTable.id, user.id));

    await logActivity(user.id, "register", `Registered with email ${email}${referralCode ? ` via referral ${referralCode}` : ""}`, req);

    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "Welcome! Please verify your email",
      message: `Your verification code is: ${verificationCode}. Enter it to activate your account.`,
      type: "info",
      isRead: false,
    });

    broadcastToAdmins("new_user_registered", { userId: user.id, name: user.name, email: user.email, ip });

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
        referralCode: userReferralCode,
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
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) {
      res.status(400).json({ error: "User not found" });
      return;
    }
    if (user.emailVerified) {
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ user: formatUser(user), token, message: "Email already verified" });
      return;
    }
    if (user.verificationCode !== code) {
      await logActivity(user.id, "verify_email_failed", "Invalid verification code", req);
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }
    const [updated] = await db.update(usersTable)
      .set({ emailVerified: true, verificationCode: null, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    await logActivity(user.id, "email_verified", "Email verified successfully", req);

    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "Email verified! Your account is pending approval.",
      message: "An admin will review and approve your account soon.",
      type: "info",
      isRead: false,
    });

    broadcastToAdmins("user_email_verified", { userId: user.id, name: user.name, email: user.email });

    // Credit referrer if referral program is enabled
    if (user.referredBy) {
      const settings = await getSettings();
      if (settings.referralEnabled) {
        const { referralsTable } = await import("@workspace/db/schema");
        const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
        if (referrer) {
          await db.insert(referralsTable).values({
            referrerId: user.referredBy,
            referredUserId: user.id,
            coinsAwarded: settings.coinsPerReferral,
          });
          await db.update(usersTable)
            .set({ coinBalance: referrer.coinBalance + settings.coinsPerReferral, updatedAt: new Date() })
            .where(eq(usersTable.id, user.referredBy));
          await db.insert(notificationsTable).values({
            userId: user.referredBy,
            title: `Referral Bonus! +${settings.coinsPerReferral} Coins 🪙`,
            message: `${user.name} joined using your referral code. You've earned ${settings.coinsPerReferral} coins!`,
            type: "info",
            isRead: false,
          });
          await logActivity(user.referredBy, "referral_coin_credited", `Earned ${settings.coinsPerReferral} coins from referral by ${user.name}`, req);
        }
      }
    }

    const token = signToken({ userId: updated.id, role: updated.role });
    res.json({ user: formatUser(updated), token });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const ip = getIp(req);

    // IP block check
    if (await isIpBlocked(ip)) {
      await logActivity(null, "login_blocked_ip", `Blocked IP attempted login`, req);
      res.status(403).json({ error: "Access denied from this IP address." });
      return;
    }

    const { email, password, deviceId } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) {
      await logActivity(null, "login_failed", `Failed login attempt for ${email}`, req);
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await logActivity(user.id, "login_locked", `Attempted login while account locked`, req);
      res.status(423).json({ error: `Account temporarily locked due to too many failed attempts. Try again in ${remaining} minute(s).` });
      return;
    }

    // Device check
    if (deviceId && user.deviceId && user.deviceId !== deviceId) {
      await logActivity(user.id, "login_wrong_device", `Login attempt from different device`, req);
      res.status(403).json({ error: "This account is registered on a different device. Only one device per account is allowed." });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      // Get max attempts from settings
      const settings = await getSettings();
      const newAttempts = (user.loginAttempts || 0) + 1;
      const lockUpdate: any = { loginAttempts: newAttempts, updatedAt: new Date() };

      if (newAttempts >= settings.maxLoginAttempts) {
        const lockUntil = new Date(Date.now() + settings.lockDurationMinutes * 60 * 1000);
        lockUpdate.lockedUntil = lockUntil;
        await db.update(usersTable).set(lockUpdate).where(eq(usersTable.id, user.id));
        await logActivity(user.id, "login_account_locked", `Account locked after ${newAttempts} failed attempts`, req);
        res.status(423).json({ error: `Too many failed attempts. Account locked for ${settings.lockDurationMinutes} minutes.` });
      } else {
        await db.update(usersTable).set(lockUpdate).where(eq(usersTable.id, user.id));
        await logActivity(user.id, "login_failed", `Invalid password attempt ${newAttempts}/${settings.maxLoginAttempts}`, req);
        res.status(400).json({ error: `Invalid email or password. ${settings.maxLoginAttempts - newAttempts} attempt(s) remaining.` });
      }
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ error: "Please verify your email first" });
      return;
    }
    if (user.status === "rejected") {
      await logActivity(user.id, "login_rejected", "Rejected user attempted login", req);
      res.status(403).json({ error: "Your account has been rejected" });
      return;
    }

    // Reset login attempts on success
    await db.update(usersTable).set({
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginIp: ip,
      lastLoginAt: new Date(),
      deviceId: deviceId && !user.deviceId ? deviceId : user.deviceId,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, user.id));

    await logActivity(user.id, "login_success", `Logged in from ${ip}`, req);

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ user: formatUser(user), token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res) => {
  await logActivity(req.userId!, "logout", "User logged out", req);
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
    referralCode: user.referralCode,
    coinBalance: user.coinBalance,
    phone: user.phone,
    address: user.address,
    upiId: user.upiId,
    language: user.language,
    theme: user.theme,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export default router;
