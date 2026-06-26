/**
 * seed-admin.ts
 *
 * Creates a default admin account if one doesn't already exist.
 * Safe to run multiple times — idempotent via onConflictDoNothing.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed-admin
 *
 * Credentials (change after first login):
 *   Email:    admin@xylocart.com
 *   Password: Admin@1234
 */

import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const ADMIN_EMAIL = "admin@xylocart.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME = "Admin";

async function generateReferralCode(): Promise<string> {
  return "ADMIN" + Math.random().toString(36).substring(2, 7).toUpperCase();
}

async function main() {
  console.log("🌱 Seeding admin account...");

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const referralCode = await generateReferralCode();

  const result = await db
    .insert(usersTable)
    .values({
      email: ADMIN_EMAIL,
      passwordHash,
      name: ADMIN_NAME,
      role: "admin",
      status: "approved",
      emailVerified: true,
      referralCode,
    })
    .onConflictDoNothing({ target: usersTable.email })
    .returning({ id: usersTable.id, email: usersTable.email });

  if (result.length === 0) {
    console.log(`ℹ️  Admin account already exists: ${ADMIN_EMAIL}`);
  } else {
    console.log(`✅ Admin account created!`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   ⚠️  Change your password after first login.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
