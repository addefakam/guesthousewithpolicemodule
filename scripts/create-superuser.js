#!/usr/bin/env node
/**
 * create-superuser.js
 *
 * Creates a new SUPERUSER account with a strong random password.
 * Credentials are written to .superuser-credentials.txt (gitignored).
 *
 * RUN:
 *   cd /home/z/my-project/guesthousewithpolicemodule
 *   npm install                       # if node_modules missing
 *   node scripts/create-superuser.js
 *
 * After running:
 *   1. Open .superuser-credentials.txt
 *   2. Record the password in your password manager
 *   3. DELETE the file: rm .superuser-credentials.txt
 *   4. Log in to the app and change the password immediately
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ── 1. Generate a strong random password ──
// 20 chars from a 64-char alphabet = ~120 bits of entropy
// (brute-force would take longer than the age of the universe)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
function generatePassword(length = 20) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

// ── 2. Generate a unique username (so we don't collide with existing 'admin') ──
function generateUsername() {
  const suffix = crypto.randomBytes(3).toString("hex"); // 6 hex chars
  return `superadmin-${suffix}`; // e.g. superadmin-3f9a2b
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Superuser Creation Script");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 3. Load environment variables from .env ──
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    });
    console.log("✓ Loaded .env file");
  } else {
    console.log("⚠ No .env file found — using environment variables only");
  }

  if (!process.env.DATABASE_URL) {
    console.error("\n❌ DATABASE_URL is not set.");
    console.error("   Create a .env file with: DATABASE_URL=postgresql://...");
    console.error("   Or export it: export DATABASE_URL=postgresql://...");
    process.exit(1);
  }
  console.log("✓ DATABASE_URL is set");

  // ── 4. Load Prisma client (must run `npm install` first) ──
  let PrismaClient;
  try {
    ({ PrismaClient } = require("@prisma/client"));
  } catch (err) {
    console.error("\n❌ @prisma/client not found. Run: npm install");
    process.exit(1);
  }

  // ── 5. Load bcrypt (for password hashing) ──
  let bcrypt;
  try {
    bcrypt = require("bcryptjs");
  } catch (err) {
    console.error("\n❌ bcryptjs not found. Run: npm install bcryptjs");
    process.exit(1);
  }

  // ── 6. Generate credentials ──
  const username = generateUsername();
  const password = generatePassword(20);
  console.log(`✓ Generated username: ${username}`);
  console.log("✓ Generated password: [hidden — see credentials file]");

  // ── 7. Hash the password (cost factor 12 — matches auth-utils.ts) ──
  console.log("⏳ Hashing password (this takes ~1 second)...");
  const passwordHash = await bcrypt.hash(password, 12);
  console.log("✓ Password hashed");

  // ── 8. Connect to database and create the user ──
  const prisma = new PrismaClient({ log: ["warn", "error"] });
  try {
    console.log("⏳ Connecting to database...");
    await prisma.$connect();
    console.log("✓ Connected");

    console.log("⏳ Creating superuser record...");
    const user = await prisma.user.create({
      data: {
        username,
        password: passwordHash,
        name: "System Administrator",
        role: "SUPERUSER",
        isActive: true,
        permissions: JSON.stringify(["all"]),
        policeRank: "",
        // No providerId — this is a system-wide admin
      },
    });
    console.log(`✓ Created user record (id: ${user.id})`);

    // ── 9. Write credentials to a gitignored file ──
    const credsPath = path.join(__dirname, "..", ".superuser-credentials.txt");
    const credsContent = [
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "  NEW SUPERUSER CREDENTIALS",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      `Username: ${username}`,
      `Password: ${password}`,
      "",
      `Created:  ${new Date().toISOString()}`,
      `Role:     SUPERUSER (system-wide admin, no provider)`,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "  SECURITY CHECKLIST",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "[ ] Record this password in your password manager (1Password,",
      "    Bitwarden, KeePass, browser password manager, etc.)",
      "",
      "[ ] DELETE this file:  rm .superuser-credentials.txt",
      "",
      "[ ] Log in to the app with these credentials",
      "",
      "[ ] Change the password to something you can remember",
      "    (go to: My Profile → Change Password)",
      "",
      "[ ] Disable the old 'admin / 123' demo account if it exists",
      "    (go to: System Admin Dashboard → User Management → admin →",
      "     set isActive = false)",
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ].join("\n");

    fs.writeFileSync(credsPath, credsContent, { mode: 0o600 }); // owner read/write only
    console.log(`✓ Credentials saved to: ${credsPath}`);
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  ✅ SUPERUSER CREATED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("  Username + Password are saved in:");
    console.log("    .superuser-credentials.txt");
    console.log("");
    console.log("  NEXT STEPS:");
    console.log("    1. Open .superuser-credentials.txt");
    console.log("    2. Record the password in your password manager");
    console.log("    3. DELETE the file:  rm .superuser-credentials.txt");
    console.log("    4. Log in and change the password");
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("\n❌ Failed to create superuser:", err.message);
    if (err.code === "P2002") {
      console.error("   (Username collision — re-run the script to get a new one)");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
