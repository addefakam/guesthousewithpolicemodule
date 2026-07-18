import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (tursoUrl && tursoUrl.length > 0) {
    console.log("[db] Connecting to Turso cloud database");
    const libsql = createClient({ url: tursoUrl, authToken: authToken || undefined });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter });
  }

  // In production (Vercel), Turso URL MUST be set — local SQLite won't work
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[db] TURSO_DATABASE_URL is not set. " +
      "Please add it in Vercel Dashboard → Settings → Environment Variables."
    );
  }

  // Local development: fall back to local SQLite
  console.log("[db] TURSO_DATABASE_URL not set — using local SQLite");
  return new PrismaClient();
}

export const db = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;