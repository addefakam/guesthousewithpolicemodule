import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Log DATABASE_URL status for diagnostics
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("[db] DATABASE_URL=" + (dbUrl ? dbUrl.replace(/file:.*/, "file:***)") : "NOT SET"));
  console.log("[db] CWD=" + process.cwd());

  try {
    const client = new PrismaClient({
      log: [],
    });
    return client;
  } catch (err) {
    console.error("[db] Failed to initialize PrismaClient:", err);
    // In production, we must not crash — return the client anyway
    // Individual queries will fail with clear error messages
    return new PrismaClient({ log: [] });
  }
}

export const db =
  globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;