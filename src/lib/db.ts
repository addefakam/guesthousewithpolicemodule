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
 * Clears the prepared-statement cache so new enum values are visible.
 */
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

/**
 * Detect schema errors AND enum cache errors.
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
 * Force re-run migrations + recreate PrismaClient.
 */
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

/**
 * Execute a Prisma method with auto-retry on schema/enum errors.
 * On error: re-migrates, recreates PrismaClient, then retries using
 * the FRESH client (fetched via getClient() inside the retry closure).
 */
async function withSchemaRetry<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  await ensureOnce();
  try {
    return await fn(getClient());
  } catch (err) {
    if (isSchemaError(err)) {
      console.log("[db] Schema/enum error caught, will retry after re-migration:", err instanceof Error ? err.message : String(err));
      await forceRemigrate();
      // getClient() now returns the FRESH client (recreated in forceRemigrate)
      return await fn(getClient());
    }
    throw err;
  }
}

/**
 * Get a PrismaClient with migrations guaranteed to have run.
 */
export async function getSafeDb(): Promise<PrismaClient> {
  await ensureOnce();
  return getClient();
}

/**
 * Convenience proxy — auto-ensures database before every query.
 * Auto-retries on schema/enum errors with a FRESH PrismaClient.
 *
 * Key fix: the fn callback receives the client as a parameter, so
 * when forceRemigrate() creates a new client, the retry uses it.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    // For function calls ($queryRaw, $executeRaw, $transaction, etc.)
    if (typeof prop === "string" && prop.startsWith("$")) {
      return async (...args: unknown[]) => {
        return withSchemaRetry((client) =>
          (client as unknown as Record<string, unknown>)[prop] &&
          ((client as unknown as Record<string, (...a: unknown[]) => unknown>)[prop]).apply(client, args)
        );
      };
    }
    // For model accessors (.room, .guest, .reservation, etc.)
    // Return a proxy that defers client resolution to call-time
    return new Proxy({}, {
      get(_t, method) {
        if (typeof method !== "string") return undefined;
        return async (...args: unknown[]) => {
          return withSchemaRetry((client) => {
            const model = (client as unknown as Record<string, Record<string, unknown>>)[prop];
            const fn = model?.[method];
            if (typeof fn === "function") {
              return fn.apply(model, args);
            }
            throw new Error(`Method ${String(method)} not found on model ${prop}`);
          });
        };
      },
    });
  },
});
