import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext,
  getProviderFilter,
  checkWritePermission, AuthError } from "@/lib/tenant";
import { uploadFile } from "@/lib/storage";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    checkWritePermission(auth, { staffPermissionKey: "rooms" });

    const { id } = await params;
    const body = await req.json();

    const filter = getProviderFilter(auth);
    const where: Record<string, unknown> = filter.isPolice
      ? { id }
      : { id, providerId: filter.providerId };

    const existing = await db.room.findFirst({ where, select: { id: true, number: true, name: true, pricePerNight: true, floor: true, capacity: true, status: true, providerId: true, type: true } });
    if (!existing) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // ── Capacity cap for SINGLE rooms ──
    // The effective room type is whichever is newer between the existing
    // type and the type being updated to. Same cap as POST: 2 guests max.
    const effectiveType = body.type !== undefined ? body.type : existing.type;
    if (effectiveType === "SINGLE" && body.capacity !== undefined && Number(body.capacity) > 2) {
      return NextResponse.json(
        {
          error: "Single rooms can hold a maximum of 2 guests. Use a DOUBLE or larger room type for higher capacity.",
          code: "SINGLE_ROOM_CAPACITY_EXCEEDED",
          details: { type: effectiveType, requestedCapacity: Number(body.capacity), maxCapacity: 2 },
        },
        { status: 400 }
      );
    }

    // If room number is being changed, check for duplicates
    if (body.number && body.number !== existing.number) {
      const dup = await db.room.findFirst({ select: { id: true, number: true },
        where: {
          number: body.number,
          providerId: existing.providerId,
          NOT: { id },
        },
      });
      if (dup) {
        return NextResponse.json(
          { error: "Room number already exists for this provider" },
          { status: 409 }
        );
      }
    }

    const room = await db.room.update({ select: { id: true, number: true, name: true, pricePerNight: true, floor: true, capacity: true, status: true, providerId: true },
      where: { id },
      data: {
        ...(body.number !== undefined && { number: body.number }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.pricePerNight !== undefined && {
          pricePerNight: Number(body.pricePerNight),
        }),
        ...(body.floor !== undefined && { floor: Number(body.floor) }),
        ...(body.capacity !== undefined && {
          capacity: Number(body.capacity),
        }),
        ...(body.amenities !== undefined && { amenities: body.amenities }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.image !== undefined && {
          image: body.image?.startsWith("data:")
            ? await uploadFile(body.image, "rooms")
            : body.image || "",
        }),
      },
    });

    return NextResponse.json({ room });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    console.error("Update room error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("cannot")
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    checkWritePermission(auth, { staffPermissionKey: "rooms" });

    const { id } = await params;

    const filter = getProviderFilter(auth);
    const where: Record<string, unknown> = filter.isPolice
      ? { id }
      : { id, providerId: filter.providerId };

    const existing = await db.room.findFirst({ where, select: { id: true, number: true, name: true, pricePerNight: true, floor: true, capacity: true, status: true, providerId: true } });
    if (!existing) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Prevent deleting rooms that have active reservations
    const activeReservation = await db.reservation.findFirst({
      where: {
        roomId: id,
        status: { in: ["UPCOMING", "ACTIVE"] },
      },
    });
    if (activeReservation) {
      return NextResponse.json(
        { error: "Cannot delete room with active or upcoming reservations" },
        { status: 409 }
      );
    }

    await db.room.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    console.error("Delete room error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("cannot")
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}