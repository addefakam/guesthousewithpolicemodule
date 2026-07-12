import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    if (type) where.type = type;

    const rooms = await db.room.findMany({
      where,
      orderBy: { number: "asc" },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Rooms GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { number, name, type, pricePerNight, floor, capacity, amenities, description, image, status } = body;

    if (!number || !name || !type || pricePerNight === undefined) {
      return NextResponse.json({ error: "Number, name, type, and pricePerNight are required" }, { status: 400 });
    }

    // Check uniqueness scoped to provider (@@unique [number, providerId])
    const existing = await db.room.findFirst({ where: { number, providerId: providerId || "" } });
    if (existing) {
      return NextResponse.json({ error: "Room number already exists for this provider" }, { status: 400 });
    }

    const room = await db.room.create({
      data: {
        number,
        name,
        type,
        pricePerNight: parseFloat(pricePerNight),
        floor: floor || 1,
        capacity: capacity || 1,
        amenities: amenities || "",
        description: description || "",
        image: image || null,
        status: status || "AVAILABLE",
        providerId: providerId || "",
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Rooms POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    if (data.pricePerNight !== undefined) {
      data.pricePerNight = parseFloat(data.pricePerNight);
    }
    if (data.floor !== undefined) {
      data.floor = parseInt(data.floor);
    }
    if (data.capacity !== undefined) {
      data.capacity = parseInt(data.capacity);
    }

    const room = await db.room.update({
      where: { id, ...(providerId ? { providerId } : {}) },
      data,
    });

    return NextResponse.json(room);
  } catch (error: unknown) {
    console.error("Rooms PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (prismaError.code === "P2002") {
      return NextResponse.json({ error: "Room number already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    await db.room.delete({ where: { id, ...(providerId ? { providerId } : {}) } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Rooms DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}