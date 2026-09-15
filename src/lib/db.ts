import { PrismaClient } from "@prisma/client";
import { ensureDatabase } from "./init-db";

// Create PrismaClient with prepared_statements=false to prevent
// PostgreSQL's prepared statement cache from holding stale enum values.
function createClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("[db] DATABASE_URL is not set.");
  }
  let url = process.env.DATABASE_URL;
  if (!url.includes("prepared_statements=false")) {
    url += (url.includes("?") ? "&" : "?") + "prepared_statements=false";
  }
  console.log("[db] Creating PrismaClient with prepared_statements=false");
  return new PrismaClient({
    log: ["warn", "error"],
    datasources: { db: { url } },
  });
}

let _db: PrismaClient | null = null;
let _initPromise: Promise<void> | null = null;

export function getClient(): PrismaClient {
  if (!_db) {
    _db = createClient();
  }
  return _db;
}

export async function ensureDb(): Promise<void> {
  if (!_initPromise) {
    _initPromise = ensureDatabase();
  }
  return _initPromise;
}

export async function getSafeDb(): Promise<PrismaClient> {
  await ensureDb();
  return getClient();
}

// Export the client directly. API routes should call `await ensureDb()`
// at the top of their handler before using db.
// For routes that don't call ensureDb(), the init-db migration runs
// on the first API request that does call it.
export const db = getClient();
