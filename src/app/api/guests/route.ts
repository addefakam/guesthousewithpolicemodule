import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { idNumber: { contains: search } },
      ];
    }

    const guests = await db.guest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(guests);
  } catch (error) {
    console.error("Guests GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, idNumber, idType, nationality, address, notes, vip } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const guest = await db.guest.create({
      data: {
        name,
        phone,
        email: email || "",
        idNumber: idNumber || "",
        idType: idType || "",
        nationality: nationality || "",
        address: address || "",
        notes: notes || "",
        vip: vip || false,
      },
    });

    return NextResponse.json(guest, { status: 201 });
  } catch (error) {
    console.error("Guests POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Guest ID is required" }, { status: 400 });
    }

    const guest = await db.guest.update({
      where: { id },
      data,
    });

    return NextResponse.json(guest);
  } catch (error: unknown) {
    console.error("Guests PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Guest ID is required" }, { status: 400 });
    }

    await db.guest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Guests DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}