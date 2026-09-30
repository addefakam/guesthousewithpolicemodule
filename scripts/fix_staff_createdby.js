#!/usr/bin/env node
/**
 * One-time fix: backfill createdBy for existing staff accounts.
 *
 * Staff created before commit d8a0ac3 have createdBy=null because the
 * POST handler only set it for OPERATOR role, not SUPERUSER-with-providerId.
 * This script finds all staff with createdBy=null and sets it to the
 * owner (SUPERUSER or OPERATOR) at the same provider.
 *
 * Run with: node scripts/fix_staff_createdby.js
 *
 * After running, the old staff accounts will appear in the Account
 * Management page and the owner can edit/delete them from the UI.
 */

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  console.log("════════════════════════════════════════════");
  console.log("  Fix staff createdBy backfill");
  console.log("════════════════════════════════════════════");

  // Find all staff with createdBy=null
  const orphanStaff = await db.user.findMany({
    where: { role: "STAFF", createdBy: null },
    select: { id: true, username: true, name: true, providerId: true },
  });

  console.log(`\nFound ${orphanStaff.length} staff account(s) with createdBy=null\n`);

  if (orphanStaff.length === 0) {
    console.log("✓ Nothing to fix — all staff already have createdBy set.");
    return;
  }

  for (const staff of orphanStaff) {
    console.log(`  Staff: ${staff.name} (${staff.username}) — providerId: ${staff.providerId}`);

    if (!staff.providerId) {
      console.log(`    ⚠️  No providerId — skipping (can't determine owner)`);
      continue;
    }

    // Find the owner at the same provider — prefer SUPERUSER, then OPERATOR
    const owner = await db.user.findFirst({
      where: {
        providerId: staff.providerId,
        role: { in: ["SUPERUSER", "OPERATOR"] },
      },
      select: { id: true, name: true, role: true },
      orderBy: { createdAt: "asc" }, // oldest owner first (likely the original creator)
    });

    if (!owner) {
      console.log(`    ⚠️  No owner found at this provider — skipping`);
      continue;
    }

    console.log(`    → Setting createdBy to: ${owner.name} (${owner.role})`);

    await db.user.update({
      where: { id: staff.id },
      data: { createdBy: owner.id },
    });

    console.log(`    ✓ Fixed`);
  }

  console.log("\n════════════════════════════════════════════");
  console.log("  Done! Old staff accounts now appear in the");
  console.log("  Account Management page. The owner can");
  console.log("  edit or delete them from the UI.");
  console.log("════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
