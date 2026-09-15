import { PrismaClient } from "@prisma/client";
import { ensureDatabase, resetInitFlag } from "./init-db";

let _db: PrismaClient | null = null;
let _ensurePromise: Promise<void> | null = null;
let _migrating = false;

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "[db] DATABASE_URL is not set. " +
        "Add it in Vercel Dashboard > Settings > Environment Variables."
    );
  }

  // Append ?prepared_statements=false to the connection string if not
  // already present. This tells the PostgreSQL driver to NOT use prepared
  // statements, which prevents the enum cache issue entirely.
  //
  // When ALTER TYPE ADD VALUE adds FAMILY to the RoomType enum at runtime,
  // Prisma's prepared statements still have the old enum cached. By
  // disabling prepared statements, every query is sent as a fresh
  // statement that PostgreSQL validates against the CURRENT enum values.
  //
  // Performance impact: minimal for a serverless app (each request is
  // a fresh connection anyway). The slight per-query overhead is worth
  // the reliability of not crashing on new enum values.
  let url = process.env.DATABASE_URL;
  if (!url.includes("prepared_statements=false")) {
    url += (url.includes("?") ? "&" : "?") + "prepared_statements=false";
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    datasources: { db: { url } },
  });
}

function getClient(): PrismaClient {
  if (!_db) {
    _db = createPrismaClient();
  }
  return _db;
}

async function recreateClient(): Promise<PrismaClient> {
  if (_db) {
    try { await _db.$disconnect(); } catch { /* ignore */ }
  }
  _db = createPrismaClient();
  console.log("[db] PrismaClient recreated — prepared-statement cache cleared");
  return _db;
}

function ensureOnce(): Promise<void> {
  if (!_ensurePromise) {
    _ensurePromise = ensureDatabase();
  }
  return _ensurePromise;
}

function isSchemaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    /column \".*\" does not exist/i.test(msg) ||
    /relation \".*\" does not exist/i.test(msg) ||
    /table \".*\" does not exist/i.test(msg) ||
    /type \".*\" does not exist/i.test(msg) ||
    /does not exist in the current database/i.test(msg) ||
    /invalid input value for enum/i.test(msg) ||
    /not found in enum/i.test(msg) ||
    /22P02/.test(msg)
  );
}

async function forceRemigrate(): Promise<void> {
  if (_migrating) {
    while (_migrating) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return;
  }
  _migrating = true;
  try {
    console.log("[db] Schema error detected — forcing migration re-run...");
    resetInitFlag();
    _ensurePromise = null;
    await ensureDatabase();
    console.log("[db] Migration re-run complete.");
    await recreateClient();
  } catch (err) {
    console.error("[db] Forced migration failed:", err instanceof Error ? err.message : String(err));
  } finally {
    _migrating = false;
  }
}

async function withSchemaRetry<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  await ensureOnce();
  try {
    return await fn(getClient());
  } catch (err) {
    if (isSchemaError(err)) {
      console.log("[db] Schema/enum error caught, retrying:", err instanceof Error ? err.message : String(err));
      await forceRemigrate();
      return await fn(getClient());
    }
    throw err;
  }
}

export async function getSafeDb(): Promise<PrismaClient> {
  await ensureOnce();
  return getClient();
}

// Simple proxy: delegates to getClient() at call time, so recreateClient()
// always picks up the fresh instance.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      return async (...args: unknown[]) => {
        return withSchemaRetry((c) => {
          const fn = (c as unknown as Record<string, (...a: unknown[]) => unknown>)[prop as string];
          return fn.apply(c, args) as Promise<unknown>;
        }) as Promise<unknown>;
      };
    }
    if (value && typeof value === "object") {
      // Return a proxied model that resolves the client at CALL time
      const modelName = prop as string;
      return new Proxy({} as Record<string, (...args: unknown[]) => Promise<unknown>>, {
        get(_t, method) {
          if (typeof method !== "string") return undefined;
          return async (...args: unknown[]) => {
            return withSchemaRetry((c) => {
              const model = (c as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[modelName];
              const fn = model?.[method];
              if (typeof fn !== "function") {
                throw new Error(`Method ${method} not found on model ${modelName}`);
              }
              return fn.apply(model, args) as Promise<unknown>;
            }) as Promise<unknown>;
          };
        },
      });
    }
    return value;
  },
});
