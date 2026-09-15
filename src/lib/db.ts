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
 * Destroy the current PrismaClient and create a fresh one.
 * This clears Prisma's prepared-statement cache, which is needed
 * after adding a new enum value (e.g. FAMILY to RoomType) at runtime.
 * The old client's cached queries don't know about the new enum value.
 */
async function recreateClient(): Promise<PrismaClient> {
  if (_db) {
    try {
      await _db.$disconnect();
    } catch {
      /* ignore */
    }
  }
  _db = createPrismaClient();
  console.log("[db] PrismaClient recreated — prepared-statement cache cleared");
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
 * Check if an error is a database schema error (missing column, missing table,
 * missing type, or invalid enum value).
 * These errors indicate migrations haven't been fully applied OR Prisma's
 * prepared-statement cache is stale.
 */
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

/**
 * Force re-run migrations (used when schema errors are detected at runtime).
 * Guards against concurrent migration runs.
 * After migrating, recreates the PrismaClient to clear cached statements.
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

    // Recreate the PrismaClient so the new enum value is visible
    // to its prepared-statement cache.
    await recreateClient();
  } catch (err) {
    console.error("[db] Forced migration failed:", err instanceof Error ? err.message : String(err));
  } finally {
    _migrating = false;
  }
}

/**
 * Execute a Prisma method with auto-retry on schema errors.
 * If the first attempt fails due to a missing column/table/enum value,
 * it re-runs migrations, recreates the PrismaClient (clearing cached
 * prepared statements), and retries once.
 */
async function withSchemaRetry<T>(fn: () => Promise<T>): Promise<T> {
  await ensureOnce();
  try {
    return await fn();
  } catch (err) {
    if (isSchemaError(err)) {
      console.log("[db] Schema/enum error caught, will retry after re-migration:", err instanceof Error ? err.message : String(err));
      await forceRemigrate();
      return await fn(); // Retry with fresh PrismaClient
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
 * Auto-retries once if a schema error is detected (missing column/table/enum).
 * On retry, creates a FRESH PrismaClient to clear the prepared-statement cache.
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
