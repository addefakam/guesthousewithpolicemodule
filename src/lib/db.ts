import { PrismaClient } from "@prisma/client";
import { ensureDatabase } from "./init-db";

let _db: PrismaClient | null = null;
let _initPromise: Promise<void> | null = null;

function getClient(): PrismaClient {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("[db] DATABASE_URL is not set.");
    }
    _db = new PrismaClient({ log: ["warn", "error"] });
  }
  return _db;
}

async function ensureDb(): Promise<void> {
  if (!_initPromise) {
    _initPromise = ensureDatabase();
  }
  return _initPromise;
}

export async function getSafeDb(): Promise<PrismaClient> {
  await ensureDb();
  return getClient();
}

export const db = getClient();
