import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable, adminSettingsTable, blockedIpsTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken } from "../lib/auth";
import { requireAuth, type AuthRequest } from "../lib/middleware";
import { broadcastToAdmins } from "../lib/websocket";
import { sendOtpEmail } from "../lib/mailer";

const router = Router();

function getIp(req: any): string {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}
function getUserAgent(req: any): string { return req.headers["user-agent"] || "unknown"; }

async function logActivity(userId: number | null, action: string, details: string, req: any) {
  try {
    await db.insert(activityLogsTable).values({ userId, action, details, ipAddress: getIp(req), userAgent: getUserAgent(req), deviceId: req.body?.deviceId || null });
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
  const rows = await db.select().from(blockedIpsTable).where(eq(blockedIpsTable.ipAddress, ip)).limit(1);
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

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res) => {
  try {
    const ip = getIp(req);
    if (await isIpBlocked(ip)) { res.status(403).json({ error: "Access denied from this IP address." }); return; }

    const settings = await getSettings();
    if (!settings.signupEnabled) { res.status(403).json({ error: "New registrations are currently disabled by the administrator." }); return; }

    const { email, password, name, phone, whatsappNumber, referralCode, deviceId } = req.body;
    if (!email || !password || !name) { res.status(400).json({ error: "Name, email, and password are required" }); return; }
    if (!phone) { res.status(400).json({ error: "Mobile number is required" }); return; }
    if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

    if (deviceId) {
      const existingDevice = await db.select().from(usersTable).where(eq(usersTable.deviceId, deviceId)).limit(1);
      if (existingDevice.length > 0) {
        await logActivity(null, "register_blocked_device", `Device already registered`, req);
        res.status(409).json({ error: "An account already exists on this device." }); return;
      }
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      await logActivity(null, "register_duplicate_email", `Duplicate: ${email}`, req);
      res.status(409).json({ error: "Email already registered" }); return;
    }

    let referrerId: number | null = null;
    if (referralCode) {
      const referrer = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
      if (referrer.length > 0) referrerId = referrer[0].id;
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const passwordHash = await hashPassword(password);
    const initialStatus = settings.autoApproveRegistrations ? "approved" : "pending";

    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      phone,
      whatsappNumber: whatsappNumber || phone,
      role: "user",
      status: initialStatus as any,
      emailVerified: false,
      verificationCode: otp,
      verificationCodeExpiry: otpExpiry,
      deviceId: deviceId || null,
      referredBy: referrerId,
      registrationIp: ip,
    }).returning();

    const userReferralCode = generateReferralCode(name, user.id);
    await db.update(usersTable).set({ referralCode: userReferralCode }).where(eq(usersTable.id, user.id));

    const { sent, preview } = await sendOtpEmail(email, name, otp);
    await logActivity(user.id, "register", `Registered: ${email}${referralCode ? ` via referral ${referralCode}` : ""}`, req);

    await db.insert(notificationsTable).values({
      userId: user.id, title: "Welcome! Verify your email",
      message: `Your OTP is: ${otp}. It expires in 10 minutes.`, type: "info", isRead: false,
    });

    broadcastToAdmins("new_user_registered", { userId: user.id, name: user.name, email: user.email, ip });

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, emailVerified: user.emailVerified, createdAt: user.createdAt.toISOString(), referralCode: userReferralCode },
      token,
      otpSent: sent,
      // Only included in dev when email not configured:
      ...(preview ? { verificationCode: preview } : {}),
      message: sent ? `OTP sent to ${email}. Check your inbox.` : `OTP: ${otp} (dev mode — configure SMTP to send real emails)`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
router.post("/auth/verify-email", async (req, res) => {
  try {
    const { code, email } = req.body;
    if (!code || !email) { res.status(400).json({ error: "Code and email are required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) { res.status(400).json({ error: "User not found" }); return; }

    if (user.emailVerified) {
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ user: formatUser(user), token, message: "Email already verified" }); return;
    }

    if (user.verificationCode !== code) {
      await logActivity(user.id, "verify_email_failed", "Invalid OTP", req);
      res.status(400).json({ error: "Invalid verification code" }); return;
    }

    // Check OTP expiry
    if (user.verificationCodeExpiry && user.verificationCodeExpiry < new Date()) {
      await logActivity(user.id, "verify_email_expired", "OTP expired", req);
      res.status(400).json({ error: "Verification code has expired. Please request a new one." }); return;
    }

    const [updated] = await db.update(usersTable)
      .set({ emailVerified: true, verificationCode: null, verificationCodeExpiry: null, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id)).returning();

    await logActivity(user.id, "email_verified", "Email verified successfully", req);

    await db.insert(notificationsTable).values({
      userId: user.id,
      title: user.status === "approved" ? "Email verified! Welcome aboard!" : "Email verified! Your account is pending approval.",
      message: user.status === "approved" ? "Your account is active. You can now log in." : "An admin will review and approve your account soon.",
      type: "info", isRead: false,
    });

    broadcastToAdmins("user_email_verified", { userId: user.id, name: user.name, email: user.email });

    // Credit referrer if referral enabled
    if (user.referredBy) {
      const settings = await getSettings();
      if (settings.referralEnabled) {
        const { referralsTable } = await import("@workspace/db/schema");
        const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
        if (referrer) {
          await db.insert(referralsTable).values({ referrerId: user.referredBy, referredUserId: user.id, coinsAwarded: settings.coinsPerReferral });
          await db.update(usersTable).set({ coinBalance: referrer.coinBalance + settings.coinsPerReferral, updatedAt: new Date() }).where(eq(usersTable.id, user.referredBy));
          await db.insert(notificationsTable).values({ userId: user.referredBy, title: `Referral Bonus! +${settings.coinsPerReferral} Coins`, message: `${user.name} joined via your referral!`, type: "info", isRead: false });
        }
      }
    }

    const token = signToken({ userId: updated.id, role: updated.role });
    res.json({ user: formatUser(updated), token });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// ─── RESEND OTP ───────────────────────────────────────────────────────────────
router.post("/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.emailVerified) { res.status(400).json({ error: "Email already verified" }); return; }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await db.update(usersTable).set({ verificationCode: otp, verificationCodeExpiry: otpExpiry, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

    const { sent, preview } = await sendOtpEmail(email, user.name, otp);
    res.json({ sent, message: sent ? `New OTP sent to ${email}` : `OTP: ${otp}`, ...(preview ? { verificationCode: preview } : {}) });
  } catch {
    res.status(500).json({ error: "Failed to resend OTP" });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res) => {
  try {
    const ip = getIp(req);
    if (await isIpBlocked(ip)) {
      await logActivity(null, "login_blocked_ip", "Blocked IP login attempt", req);
      res.status(403).json({ error: "Access denied from this IP address." }); return;
    }

    const settings = await getSettings();
    if (!settings.loginEnabled) { res.status(403).json({ error: "Login is currently disabled by the administrator." }); return; }

    const { email, password, deviceId } = req.body;
    if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) {
      await logActivity(null, "login_failed", `No user: ${email}`, req);
      res.status(400).json({ error: "Invalid email or password" }); return;
    }

    // Permanent ban check
    if (user.bannedPermanently) {
      await logActivity(user.id, "login_banned", "Banned user attempted login", req);
      res.status(403).json({ error: `Your account has been permanently banned.${user.bannedReason ? ` Reason: ${user.bannedReason}` : ""}` }); return;
    }

    // Suspension check
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const until = user.suspendedUntil.toLocaleDateString();
      await logActivity(user.id, "login_suspended", "Suspended user attempted login", req);
      res.status(403).json({ error: `Your account is suspended until ${until}.${user.suspensionReason ? ` Reason: ${user.suspensionReason}` : ""}` }); return;
    }

    // Lock check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      res.status(423).json({ error: `Account locked. Try again in ${remaining} minute(s).` }); return;
    }

    // Device check
    if (deviceId && user.deviceId && user.deviceId !== deviceId) {
      await logActivity(user.id, "login_wrong_device", "Login from different device", req);
      res.status(403).json({ error: "This account is registered on a different device." }); return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      const newAttempts = (user.loginAttempts || 0) + 1;
      const lockUpdate: any = { loginAttempts: newAttempts, updatedAt: new Date() };
      if (newAttempts >= settings.maxLoginAttempts) {
        lockUpdate.lockedUntil = new Date(Date.now() + settings.lockDurationMinutes * 60 * 1000);
        await db.update(usersTable).set(lockUpdate).where(eq(usersTable.id, user.id));
        await logActivity(user.id, "login_account_locked", `Locked after ${newAttempts} attempts`, req);
        res.status(423).json({ error: `Too many failed attempts. Account locked for ${settings.lockDurationMinutes} minutes.` });
      } else {
        await db.update(usersTable).set(lockUpdate).where(eq(usersTable.id, user.id));
        await logActivity(user.id, "login_failed", `Wrong password attempt ${newAttempts}/${settings.maxLoginAttempts}`, req);
        res.status(400).json({ error: `Invalid email or password. ${settings.maxLoginAttempts - newAttempts} attempt(s) remaining.` });
      }
      return;
    }

    if (!user.emailVerified) { res.status(403).json({ error: "Please verify your email first" }); return; }
    if (user.status === "rejected") {
      await logActivity(user.id, "login_rejected", "Rejected user attempted login", req);
      res.status(403).json({ error: "Your account has been rejected" }); return;
    }
    if (user.status === "pending" && user.role !== "admin") {
      res.status(403).json({ error: "Your account is pending admin approval" }); return;
    }

    await db.update(usersTable).set({
      loginAttempts: 0, lockedUntil: null, lastLoginIp: ip, lastLoginAt: new Date(),
      deviceId: deviceId && !user.deviceId ? deviceId : user.deviceId,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, user.id));

    await logActivity(user.id, "login_success", `Login from ${ip}`, req);

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
    // Check ban/suspend on every me call
    if (user.bannedPermanently) { res.status(403).json({ error: "Account permanently banned" }); return; }
    res.json(formatUser(user));
  } catch { res.status(500).json({ error: "Failed to get user" }); }
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res) => {
  await logActivity(req.userId!, "logout", "User logged out", req);
  res.json({ status: "ok" });
});

// Public settings (login/signup enabled flags — no auth needed)
router.get("/auth/public-settings", async (_req, res) => {
  try {
    const s = await getSettings();
    res.json({ loginEnabled: s.loginEnabled, signupEnabled: s.signupEnabled });
  } catch { res.status(500).json({ loginEnabled: true, signupEnabled: true }); }
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, email: user.email, name: user.name, role: user.role, status: user.status,
    emailVerified: user.emailVerified, createdAt: user.createdAt.toISOString(),
    referralCode: user.referralCode, coinBalance: user.coinBalance,
    phone: user.phone, whatsappNumber: user.whatsappNumber, address: user.address, upiId: user.upiId,
    language: user.language, theme: user.theme,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    bannedPermanently: user.bannedPermanently,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
  };
}

export default router;
