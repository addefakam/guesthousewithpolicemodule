import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission } from "@/lib/tenant";
import { checkSuspectMatch } from "@/lib/suspect-check";
import { composeAddress } from "@/lib/ethiopian-admin-divisions";
import { isValidPhone, isValidEmail } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const { isPolice, providerId } = getProviderFilter(auth);

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (!isPolice) {
      where.providerId = providerId;
    }

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { idNumber: { contains: q } },
      ];
    }

    const [guests, total] = await Promise.all([
      db.guest.findMany({
        where,
        select: {
          id: true, name: true, phone: true, email: true, idNumber: true, idType: true,
          nationality: true, region: true, zone: true, woreda: true, kebele: true,
          houseNumber: true, streetName: true, plateNumber: true, weapon: true,
          vip: true, totalSpent: true, totalStays: true, providerId: true,
          createdAt: true, updatedAt: true,
          // Exclude heavy fields from list: notes, address (composeAddress builds it)
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.guest.count({ where }),
    ]);

    return NextResponse.json({ guests, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch guests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    checkWritePermission(auth, { staffOnlyWrite: true, staffPermissionKey: "guests" });

    const body = await req.json();
    const { name, phone, email, idNumber, idType, nationality, region, zone, woreda, kebele, houseNumber, streetName, plateNumber, weapon, address, notes, vip, role, familyLeaderId } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }
    if (!nationality || !nationality.trim()) {
      return NextResponse.json({ error: "Nationality is required" }, { status: 400 });
    }
    if (!idType || !idType.trim()) {
      return NextResponse.json({ error: "ID type is required" }, { status: 400 });
    }
    if (!idNumber || !idNumber.trim()) {
      return NextResponse.json({ error: "ID number is required" }, { status: 400 });
    }
    if (idNumber.trim().length < 4) {
      return NextResponse.json({ error: "ID number is too short. Please enter a valid ID number." }, { status: 400 });
    }

    // Auto-compose address from normalized fields if not explicitly provided
    const composedAddress = address || composeAddress({ region, zone, woreda, kebele, houseNumber, streetName });

    const guest = await db.guest.create({
      data: {
        name,
        phone,
        email: email || "",
        idNumber: idNumber || "",
        idType: idType || "",
        nationality: nationality || "",
        region: region || "",
        zone: zone || "",
        woreda: woreda || "",
        kebele: kebele || "",
        houseNumber: houseNumber || "",
        streetName: streetName || "",
        plateNumber: plateNumber || "",
        weapon: weapon || "",
        address: composedAddress,
        notes: notes || "",
        vip: vip || false,
        // familyLeaderId (points to the leader's Guest.id for companions)
        providerId,
      },
    });

    // Background: check if guest matches any suspected person (fire-and-forget)
    checkSuspectMatch({
      name,
      phone,
      idNumber: idNumber || "",
      idType: idType || "",
      matchType: "GUEST_CHECKIN",
      providerId,
      extraDetails: {
        email: email || "",
        nationality: nationality || "",
        address: composedAddress,
      },
    }).catch(() => {});

    return NextResponse.json(guest, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create guest";
    const status = message.includes("required") ? 400 : message.includes("permission") || message.includes("cannot") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}