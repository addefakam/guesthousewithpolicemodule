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

  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
  });
}

function getClient(): PrismaClient {
  if (!_db) {
    _db = createPrismaClient();
  }
  return _db;
}

/**
 * Returns a promise that resolves when DB migrations are guaranteed done.
 * Safe to call many times — only runs once per cold start.
 */
function ensureOnce(): Promise<void> {
  if (!_ensurePromise) {
    _ensurePromise = ensureDatabase();
  }
  return _ensurePromise;
}

/**
 * Check if an error is a database schema error (missing column, missing table, missing type).
 * These errors indicate migrations haven't been fully applied.
 */
function isSchemaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    /column \".*\" does not exist/i.test(msg) ||
    /relation \".*\" does not exist/i.test(msg) ||
    /table \".*\" does not exist/i.test(msg) ||
    /type \".*\" does not exist/i.test(msg) ||
    /does not exist in the current database/i.test(msg)
  );
}

/**
 * Force re-run migrations (used when schema errors are detected at runtime).
 * Guards against concurrent migration runs.
 */
async function forceRemigrate(): Promise<void> {
  if (_migrating) {
    // Another call is already migrating — wait for it
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
  } catch (err) {
    console.error("[db] Forced migration failed:", err instanceof Error ? err.message : String(err));
  } finally {
    _migrating = false;
  }
}

/**
 * Execute a Prisma method with auto-retry on schema errors.
 * If the first attempt fails due to a missing column/table,
 * it re-runs migrations and retries once.
 */
async function withSchemaRetry<T>(fn: () => Promise<T>): Promise<T> {
  await ensureOnce();
  try {
    return await fn();
  } catch (err) {
    if (isSchemaError(err)) {
      console.log("[db] Schema error caught, will retry after re-migration:", err instanceof Error ? err.message : String(err));
      await forceRemigrate();
      return await fn(); // Retry after migration
    }
    throw err;
  }
}

/**
 * Get a PrismaClient with migrations guaranteed to have run.
 * Use at the top of API route handlers:
 *   const db = await getSafeDb();
 */
export async function getSafeDb(): Promise<PrismaClient> {
  await ensureOnce();
  return getClient();
}

/**
 * Wraps a Prisma model so every method call first awaits ensureDatabase
 * and auto-retries on schema errors.
 */
function createEnsuredProxy<T>(model: T): T {
  return new Proxy(model as object, {
    get(target, prop) {
      const value = (target as Record<string, unknown>)[prop as string];
      if (typeof value === "function") {
        return async (...args: unknown[]) => {
          return withSchemaRetry(() =>
            (value as Function).apply(target, args)
          );
        };
      }
      return value;
    },
  }) as unknown as T;
}

/**
 * Convenience proxy — auto-ensures database before every query.
 * Auto-retries once if a schema error is detected (missing column/table).
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      // Prisma namespace methods like $queryRaw, $executeRaw, $transaction
      return async (...args: unknown[]) => {
        return withSchemaRetry(() =>
          (value as Function).apply(client, args)
        );
      };
    }
    // Prisma model accessors like .user, .room, .guest — wrap with ensure proxy
    if (value && typeof value === "object") {
      return createEnsuredProxy(value);
    }
    return value;
  },
});
