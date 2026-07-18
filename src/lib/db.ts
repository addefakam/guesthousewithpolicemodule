import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

type PrismaClientInstance = PrismaClient & { $disconnect: () => Promise<void> };

let _db: PrismaClientInstance | null = null;

function createPrismaClient(): PrismaClientInstance {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoUrl.trim().length > 0) {
    console.log("[db] Connecting to Turso cloud database");
    // Prisma still reads DATABASE_URL from schema internally.
    // Override it so Prisma's internal URL parsing gets a valid value.
    // The adapter handles the actual connection regardless.
    process.env.DATABASE_URL = tursoUrl.trim();

    const libsql = createClient({
      url: tursoUrl.trim(),
      authToken: authToken?.trim() || undefined,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter }) as PrismaClientInstance;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[db] TURSO_DATABASE_URL is not set. " +
      "Add it in Vercel Dashboard > Settings > Environment Variables."
    );
  }

  console.log("[db] TURSO_DATABASE_URL not set — using local SQLite");
  return new PrismaClient() as PrismaClientInstance;
}

function getDb(): PrismaClientInstance {
  if (!_db) {
    _db = createPrismaClient();
  }
  return _db;
}

// Lazy Proxy — PrismaClient is created on first use (request time), not at module load time
export const db = new Proxy({} as PrismaClientInstance, {
  get(_target, prop, receiver) {
    const client = getDb();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});