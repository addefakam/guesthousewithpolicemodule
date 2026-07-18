import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

type PrismaClientWithDisconnect = PrismaClient & { $disconnect: () => Promise<void> };

let _db: PrismaClientWithDisconnect | null = null;

function createPrismaClient(): PrismaClientWithDisconnect {
  // Read env vars inside the function (called at runtime, not build time)
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoUrl.trim().length > 0) {
    console.log("[db] Connecting to Turso cloud database");
    const libsql = createClient({ url: tursoUrl.trim(), authToken: authToken?.trim() || undefined });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter }) as PrismaClientWithDisconnect;
  }

  // In production (Vercel), Turso URL MUST be set — local SQLite won't work
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[db] TURSO_DATABASE_URL is not set. " +
      "Please add it in Vercel Dashboard > Settings > Environment Variables."
    );
  }

  // Local development: fall back to local SQLite
  console.log("[db] TURSO_DATABASE_URL not set — using local SQLite");
  return new PrismaClient() as PrismaClientWithDisconnect;
}

// Lazy singleton — created on first access, not at module load time
function getDb(): PrismaClientWithDisconnect {
  if (!_db) {
    _db = createPrismaClient();
  }
  return _db;
}

// Proxy that delegates all property access to the real client,
// initializing it lazily on first use (at request time, not build time)
export const db = new Proxy({} as PrismaClientWithDisconnect, {
  get(_target, prop, receiver) {
    const client = getDb();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});