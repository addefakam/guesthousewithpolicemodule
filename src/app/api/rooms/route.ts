import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthContext,
  getProviderFilter,
  checkWritePermission,
  AuthError,
} from "@/lib/tenant";
import { runReservationMaintenance } from "@/lib/reservation-maintenance";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);

    // Lazy maintenance (throttled) so room statuses reflect past-checkout
    // auto-releases even between cron runs. Never blocks the read.
    try {
      await runReservationMaintenance(filter.isPolice ? {} : { providerId: filter.providerId });
    } catch {
      // Ignore — maintenance must not break room reads.
    }

    const where: Record<string, unknown> = filter.isPolice
      ? {}
      : { providerId: filter.providerId };

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (q) {
      where.OR = [
        { number: { contains: q } },
        { name: { contains: q } },
      ];
    }

    // Use raw SQL with type::text cast to avoid Prisma's enum cache issue.
    // Build the query with parameterized values to prevent SQL injection.
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (q) {
      conditions.push(`("number" ILIKE $${paramIdx} OR "name" ILIKE $${paramIdx})`);
      params.push(`%${q}%`);
      paramIdx++;
    }
    if (where.providerId) {
      conditions.push(`"providerId" = $${paramIdx}`);
      params.push(where.providerId);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const roomsRaw = await db.$queryRawUnsafe(
      `SELECT "id", "number", "name", "type"::text AS "type", "pricePerNight", "floor", "capacity", "status", "providerId", "createdAt", "updatedAt" FROM "Room"${whereClause} ORDER BY "floor" ASC, "number" ASC`,
      ...params
    ) as Record<string, unknown>[];

    // Serialize ALL fields — $queryRawUnsafe returns BigInt for INT
    // columns and Date for TIMESTAMP columns. Both cause JSON.stringify
    // to throw, which makes NextResponse.json() return an empty response.
    const rooms = roomsRaw.map((r) => ({
      id: String(r.id),
      number: String(r.number),
      name: String(r.name || ""),
      type: String(r.type || ""),
      pricePerNight: Number(r.pricePerNight),
      floor: Number(r.floor),
      capacity: Number(r.capacity),
      status: String(r.status || "AVAILABLE"),
      providerId: r.providerId ? String(r.providerId) : null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || ""),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt || ""),
    }));

    return NextResponse.json({ rooms });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("List rooms error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    checkWritePermission(auth, { staffPermissionKey: "rooms" });

    if (!auth.providerId) {
      return NextResponse.json(
        { error: "No provider assigned to this user" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // ── Bulk import ──────────────────────────────────────────────────────────
    if (Array.isArray(body.bulk)) {
      const results: { number: string; status: string; error?: string }[] = [];

      for (const row of body.bulk) {
        const { number, type, pricePerNight, floor, capacity, amenities, description, name } = row;
        // pricePerNight is optional — defaults to 0 when omitted.
        if (!number || !type || floor == null || capacity == null) {
          results.push({ number: String(number ?? "?"), status: "skipped", error: "Missing required fields" });
          continue;
        }
        // ── Capacity cap for SINGLE rooms (same as the single-row path) ──
        // Bulk import skips the row with a clear error message instead of
        // silently capping — so the operator can see which rows failed.
        if (type === "SINGLE" && Number(capacity) > 2) {
          results.push({ number: String(number ?? "?"), status: "skipped", error: "Single rooms can hold max 2 guests" });
          continue;
        }
        try {
          const existing = await db.room.findFirst({ select: { id: true, number: true }, where: { number: String(number), providerId: auth.providerId } });
          if (existing) {
            results.push({ number: String(number), status: "skipped", error: "Room number already exists" });
            continue;
          }
          await db.room.create({
            data: {
              number: String(number),
              name: name ? String(name) : `Room ${number}`,
              type: String(type).toUpperCase() as import("@prisma/client").RoomType,
              pricePerNight: pricePerNight == null || pricePerNight === "" ? 0 : Number(pricePerNight),
              floor: Number(floor),
              capacity: Number(capacity),
              amenities: amenities ? JSON.stringify(String(amenities).split(",").map((s: string) => s.trim()).filter(Boolean)) : "[]",
              description: description ? String(description) : "",
              providerId: auth.providerId,
            },
          });
          results.push({ number: String(number), status: "created" });
        } catch {
          results.push({ number: String(number), status: "error", error: "Database error" });
        }
      }

      const created = results.filter((r) => r.status === "created").length;
      const skipped = results.filter((r) => r.status !== "created").length;
      return NextResponse.json({ imported: created, skipped, results }, { status: 200 });
    }

    // ── Single room create ───────────────────────────────────────────────────
    const {
      number,
      name,
      type,
      pricePerNight,
      floor,
      capacity,
      amenities,
      description,
      image,
    } = body;

    // pricePerNight is OPTIONAL — defaults to 0 when omitted. Some operators
    // don't charge per-night (e.g. flat-rate guest houses, complimentary rooms,
    // or rooms where pricing is set later). The field is no longer required.
    if (!number || !type || floor == null || capacity == null) {
      return NextResponse.json(
        { error: "Missing required fields: number, type, floor, capacity" },
        { status: 400 }
      );
    }

    // ── Capacity cap by room type ──
    // SINGLE rooms can hold at most 2 guests (one primary + one optional
    // companion). DOUBLE/TWIN/SUITE/DELUXE/etc. have no hard cap here —
    // the operator decides based on the room's physical layout.
    // This matches the front-end validation on both the main system and
    // mobile app, so the API is the source of truth in case a request
    // bypasses the UI (e.g. direct API call, bulk import).
    const SINGLE_MAX_CAPACITY = 2;
    const capacityNum = Number(capacity);
    if (type === "SINGLE" && capacityNum > SINGLE_MAX_CAPACITY) {
      return NextResponse.json(
        {
          error: `Single rooms can hold a maximum of ${SINGLE_MAX_CAPACITY} guests. Use a DOUBLE or larger room type for higher capacity.`,
          code: "SINGLE_ROOM_CAPACITY_EXCEEDED",
          details: { type, requestedCapacity: capacityNum, maxCapacity: SINGLE_MAX_CAPACITY },
        },
        { status: 400 }
      );
    }

    // Check for duplicate room number within the same provider
    const existing = await db.room.findFirst({ select: { id: true, number: true },
      where: { number, providerId: auth.providerId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Room number already exists for this provider" },
        { status: 409 }
      );
    }

    // pricePerNight is OPTIONAL — defaults to 0 when omitted/empty.
    const priceVal = pricePerNight == null || pricePerNight === "" ? 0 : Number(pricePerNight);

    let room;

    // Prisma connection doesn't see it yet (PostgreSQL caches prepared
    // statements per-connection). We add the enum value explicitly
    // and retry with a fresh PrismaClient instance.
    try {
      room = await db.room.create({
        data: {
          number,
          name: name || `Room ${number}`,
          type,
          pricePerNight: priceVal,
          floor: Number(floor),
          capacity: Number(capacity),
          amenities: amenities || "[]",
          description: description || "",
          image: image || null,
          providerId: auth.providerId,
        },
      });
    } catch (createErr: unknown) {
      const errMsg = createErr instanceof Error ? createErr.message : String(createErr);

      if (errMsg.includes("22P02") || errMsg.includes("invalid input value for enum")) {

        // Force-add the enum value (this works even if already present due to IF NOT EXISTS)
        const { Prisma, PrismaClient } = await import("@prisma/client");
        const freshClient = new PrismaClient();
        try {
          // Use the fresh client (which sees the new enum value) to create the room
          room = await freshClient.room.create({
            data: {
              number,
              name: name || `Room ${number}`,
              type,
              pricePerNight: priceVal,
              floor: Number(floor),
              capacity: Number(capacity),
              amenities: amenities || "[]",
              description: description || "",
              image: image || null,
              providerId: auth.providerId,
            },
          });
        } finally {
          await freshClient.$disconnect();
        }
      } else {
        throw createErr; // Re-throw if it's a different error
      }
    }

    return NextResponse.json({ room }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create room error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("cannot")
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}