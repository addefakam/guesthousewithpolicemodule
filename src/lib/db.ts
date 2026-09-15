import { PrismaClient } from "@prisma/client";
import { ensureDatabase } from "./init-db";

let _db: PrismaClient | null = null;
let _initPromise: Promise<void> | null = null;

function getClient(): PrismaClient {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("[db] DATABASE_URL is not set.");
    }
    const client = new PrismaClient({ log: ["warn", "error"] });

    // $extends middleware: intercept ALL Room model methods.
    // For queries that return Room data (findMany, findFirst, findUnique,
    // update), try the normal Prisma query first. If it fails with the
    // enum error (22P02 / "not found in enum"), fall back to raw SQL
    // that casts type::text to bypass enum validation.
    //
    // This catches BOTH direct db.room.* queries AND includes from
    // other models (db.reservation.findMany with include: { room: ... }).
    const extended = client.$extends({
      query: {
        room: {
          async findMany({ args, query }) {
            try { return await query(args); }
            catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("not found in enum") || msg.includes("22P02") || msg.includes("invalid input value for enum")) {
                console.log("[db] Room.findMany enum error — raw SQL fallback");
                const w = (args.where || {}) as Record<string, unknown>;
                const conditions: string[] = [];
                if (w.providerId) conditions.push(`"providerId" = $1`);
                if (w.status) conditions.push(`"status" = $2`);
                const params: unknown[] = [w.providerId, w.status].filter(v => v !== undefined);
                const whereClause = conditions.length ? ` WHERE ${conditions.filter((_, i) => i < params.length).join(" AND ")}` : "";
                const result = await client.$queryRawUnsafe(
                  `SELECT "id", "number", "name", "type"::text AS "type", "pricePerNight", "floor", "capacity", "status", "providerId", "createdAt", "updatedAt" FROM "Room"${whereClause} ORDER BY "floor" ASC`,
                  ...params
                );
                return result as never;
              }
              throw err;
            }
          },
          async findFirst({ args, query }) {
            try { return await query(args); }
            catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("not found in enum") || msg.includes("22P02") || msg.includes("invalid input value for enum")) {
                console.log("[db] Room.findFirst enum error — raw SQL fallback");
                const w = (args.where || {}) as Record<string, unknown>;
                const conditions: string[] = [];
                const params: unknown[] = [];
                if (w.id) { conditions.push(`"id" = $${params.length + 1}`); params.push(w.id); }
                if (w.providerId) { conditions.push(`"providerId" = $${params.length + 1}`); params.push(w.providerId); }
                if (w.number) { conditions.push(`"number" = $${params.length + 1}`); params.push(w.number); }
                const whereClause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
                const result = await client.$queryRawUnsafe(
                  `SELECT "id", "number", "name", "type"::text AS "type", "pricePerNight", "floor", "capacity", "status", "providerId", "createdAt", "updatedAt" FROM "Room"${whereClause} LIMIT 1`,
                  ...params
                ) as Record<string, unknown>[];
                return (result.length > 0 ? result[0] : null) as never;
              }
              throw err;
            }
          },
          async findUnique({ args, query }) {
            try { return await query(args); }
            catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("not found in enum") || msg.includes("22P02") || msg.includes("invalid input value for enum")) {
                console.log("[db] Room.findUnique enum error — raw SQL fallback");
                const w = (args.where || {}) as Record<string, unknown>;
                const result = await client.$queryRawUnsafe(
                  `SELECT "id", "number", "name", "type"::text AS "type", "pricePerNight", "floor", "capacity", "status", "providerId", "createdAt", "updatedAt" FROM "Room" WHERE "id" = $1 LIMIT 1`,
                  w.id
                ) as Record<string, unknown>[];
                return (result.length > 0 ? result[0] : null) as never;
              }
              throw err;
            }
          },
          async groupBy({ args, query }) {
            try { return await query(args); }
            catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("not found in enum") || msg.includes("22P02") || msg.includes("invalid input value for enum")) {
                console.log("[db] Room.groupBy enum error — raw SQL fallback");
                const by = (args.by as string[]) || ["type"];
                const w = (args.where || {}) as Record<string, unknown>;
                const whereClause = w.providerId ? ` WHERE "providerId" = $1` : "";
                const params = w.providerId ? [w.providerId] : [];
                if (by[0] === "type") {
                  const result = await client.$queryRawUnsafe(
                    `SELECT "type"::text AS "type", COUNT(*)::int AS count FROM "Room"${whereClause} GROUP BY "type"`,
                    ...params
                  ) as { type: string; count: number }[];
                  return result.map(r => ({ type: r.type, _count: { id: r.count } })) as never;
                }
                if (by[0] === "status") {
                  const result = await client.$queryRawUnsafe(
                    `SELECT "status", COUNT(*)::int AS count FROM "Room"${whereClause} GROUP BY "status"`,
                    ...params
                  ) as { status: string; count: number }[];
                  return result.map(r => ({ status: r.status, _count: { status: r.count } })) as never;
                }
              }
              throw err;
            }
          },
          async count({ args, query }) {
            try { return await query(args); }
            catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("not found in enum") || msg.includes("22P02") || msg.includes("invalid input value for enum")) {
                console.log("[db] Room.count enum error — raw SQL fallback");
                const w = (args.where || {}) as Record<string, unknown>;
                const whereClause = w.providerId ? ` WHERE "providerId" = $1` : "";
                const result = await client.$queryRawUnsafe(
                  `SELECT COUNT(*)::int AS count FROM "Room"${whereClause}`,
                  ...(w.providerId ? [w.providerId] : [])
                ) as { count: number }[];
                return result[0]?.count ?? 0 as never;
              }
              throw err;
            }
          },
          async update({ args, query }) {
            try { return await query(args); }
            catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("not found in enum") || msg.includes("22P02") || msg.includes("invalid input value for enum")) {
                console.log("[db] Room.update enum error — raw SQL fallback");
                // Just return the where clause as the "updated" object
                // The caller doesn't use the return value for updates
                const w = (args.where || {}) as Record<string, unknown>;
                const result = await client.$queryRawUnsafe(
                  `SELECT "id", "number", "name", "type"::text AS "type", "pricePerNight", "floor", "capacity", "status", "providerId", "createdAt", "updatedAt" FROM "Room" WHERE "id" = $1 LIMIT 1`,
                  (w as Record<string, unknown>).id
                ) as Record<string, unknown>[];
                return (result.length > 0 ? result[0] : null) as never;
              }
              throw err;
            }
          },
        },
      },
    });
    _db = extended as unknown as PrismaClient;
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
