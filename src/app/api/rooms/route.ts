import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthContext,
  getProviderFilter,
  checkWritePermission,
  AuthError,
} from "@/lib/tenant";
import { runReservationMaintenance } from "@/lib/reservation-maintenance";
import { ensureRoomTypeFAMILY } from "@/lib/ensure-room-type-enum";

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

    // Use raw SQL with type::text cast to avoid Prisma's prepared-statement
    // cache issue with the RoomType enum (FAMILY value added at runtime).
    const roomsRaw = await db.$queryRaw<{
      id: string; number: string; name: string; type: string;
      pricePerNight: number; floor: number; capacity: number;
      status: string; providerId: string | null;
      createdAt: Date; updatedAt: Date;
    }[]>`
      SELECT
        "id", "number", "name",
        "type"::text AS "type",
        "pricePerNight", "floor", "capacity",
        "status", "providerId", "createdAt", "updatedAt"
      FROM "Room"
      ${q ? db.$queryRaw`WHERE "number" ILIKE ${'%' + q + '%'} OR "name" ILIKE ${'%' + q + '%'}` : db.$queryRaw``}
      ${where.providerId ? (q ? db.$queryRaw`AND "providerId" = ${where.providerId}` : db.$queryRaw`WHERE "providerId" = ${where.providerId}`) : db.$queryRaw``}
      ORDER BY "floor" ASC, "number" ASC
    `;

    return NextResponse.json({ rooms: roomsRaw });
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
        if (!number || !type || pricePerNight == null || floor == null || capacity == null) {
          results.push({ number: String(number ?? "?"), status: "skipped", error: "Missing required fields" });
          continue;
        }
        try {
          const existing = await db.room.findFirst({ where: { number: String(number), providerId: auth.providerId } });
          if (existing) {
            results.push({ number: String(number), status: "skipped", error: "Room number already exists" });
            continue;
          }
          await db.room.create({
            data: {
              number: String(number),
              name: name ? String(name) : `Room ${number}`,
              type: String(type).toUpperCase() as import("@prisma/client").RoomType,
              pricePerNight: Number(pricePerNight),
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

    if (!number || !type || pricePerNight == null || floor == null || capacity == null) {
      return NextResponse.json(
        { error: "Missing required fields: number, type, pricePerNight, floor, capacity" },
        { status: 400 }
      );
    }

    // Check for duplicate room number within the same provider
    const existing = await db.room.findFirst({
      where: { number, providerId: auth.providerId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Room number already exists for this provider" },
        { status: 409 }
      );
    }

    // Ensure FAMILY exists in the RoomType enum before creating any room.
    // This is a no-op if FAMILY is already present.
    if (type === "FAMILY") {
      await ensureRoomTypeFAMILY();
    }

    let room;

    // Try to create the room. If it fails with the enum error (22P02),
    // it means the FAMILY enum value was just added but the current
    // Prisma connection doesn't see it yet (PostgreSQL caches prepared
    // statements per-connection). We add the enum value explicitly
    // and retry with a fresh PrismaClient instance.
    try {
      room = await db.room.create({
        data: {
          number,
          name: name || `Room ${number}`,
          type,
          pricePerNight: Number(pricePerNight),
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

      // If it's the enum error, try to add the value and retry with a new connection
      if (errMsg.includes("22P02") || errMsg.includes("invalid input value for enum")) {
        console.log("[rooms] Enum error — adding FAMILY to RoomType and retrying with fresh connection");

        // Force-add the enum value (this works even if already present due to IF NOT EXISTS)
        const { Prisma, PrismaClient } = await import("@prisma/client");
        const freshClient = new PrismaClient();
        try {
          await freshClient.$executeRawUnsafe(`ALTER TYPE "RoomType" ADD VALUE IF NOT EXISTS 'FAMILY'`);
          // Use the fresh client (which sees the new enum value) to create the room
          room = await freshClient.room.create({
            data: {
              number,
              name: name || `Room ${number}`,
              type,
              pricePerNight: Number(pricePerNight),
              floor: Number(floor),
              capacity: Number(capacity),
              amenities: amenities || "[]",
              description: description || "",
              image: image || null,
              providerId: auth.providerId,
            },
          });
          console.log("[rooms] Retry succeeded — FAMILY room created");
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