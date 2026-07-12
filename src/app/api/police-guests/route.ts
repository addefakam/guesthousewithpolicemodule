import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePolice } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const denied = requirePolice(request);
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const providerId = searchParams.get("providerId") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { idNumber: { contains: search } },
      ];
    }
    if (providerId) {
      where.providerId = providerId;
    }

    const guests = await db.guest.findMany({
      where,
      include: {
        provider: { select: { name: true, type: true } },
        _count: { select: { reservations: true } },
        reservations: {
          where: { status: "ACTIVE" },
          select: { id: true, checkIn: true, checkOut: true, room: { select: { number: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(guests);
  } catch (error) {
    console.error("Police Guests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}