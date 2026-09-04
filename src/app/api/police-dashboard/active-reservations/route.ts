import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// ── City-wide list of live reservations (ACTIVE first, then upcoming) ──
// Used by the standalone Police App "Guests" screen and available to any
// police-grade surface. Read-only, capped, police-only.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 500);

    const reservations = await db.reservation.findMany({
      where: { status: { in: ["ACTIVE", "UPCOMING"] } },
      select: {
        id: true,
        status: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        totalCost: true,
        paidAmount: true,
        balance: true,
        secondGuestName: true,
        secondGuestIdNumber: true,
        createdAt: true,
        guest: {
          select: {
            name: true,
            phone: true,
            idNumber: true,
            nationality: true,
          },
        },
        room: {
          select: {
            number: true,
            name: true,
            type: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { checkIn: "asc" }], // ACTIVE before UPCOMING (A < U), soonest check-in first
      take: limit,
    });

    const items = reservations.map((r) => ({
      id: r.id,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      nights: r.nights,
      totalCost: r.totalCost,
      paidAmount: r.paidAmount,
      balance: r.balance,
      guestName: r.guest?.name || "—",
      guestPhone: r.guest?.phone || "",
      guestIdNumber: r.guest?.idNumber || "",
      guestNationality: r.guest?.nationality || "",
      secondGuestName: r.secondGuestName || "",
      secondGuestIdNumber: r.secondGuestIdNumber || "",
      roomNumber: r.room?.number || "—",
      roomName: r.room?.name || "",
      roomType: r.room?.type || "",
      providerId: r.provider?.id || "",
      providerName: r.provider?.name || "—",
      providerPhone: r.provider?.phone || "",
      providerAddress: r.provider?.address || "",
    }));

    return NextResponse.json({ items, count: items.length });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch active reservations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
