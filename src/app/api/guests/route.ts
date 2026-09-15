import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";
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

    // Use raw SQL to avoid any Prisma schema mismatch issues
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pi = 1;

    if (!isPolice && providerId) {
      conditions.push(`"providerId" = $${pi++}`);
      params.push(providerId);
    }
    if (q) {
      conditions.push(`("name" ILIKE $${pi} OR "phone" ILIKE $${pi} OR "idNumber" ILIKE $${pi})`);
      params.push(`%${q}%`);
      pi++;
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const [guestsRaw, totalRaw] = await Promise.all([
      db.$queryRawUnsafe(
        `SELECT "id", "name", "phone", "email", "idNumber", "idType",
                "nationality", "region", "zone", "woreda", "kebele",
                "houseNumber", "streetName", "plateNumber", "weapon",
                "vip", "totalSpent", "totalStays", "providerId",
                "createdAt", "updatedAt"
         FROM "Guest"${whereClause}
         ORDER BY "createdAt" DESC
         LIMIT $${pi++} OFFSET $${pi++}`,
        ...params, limit, skip
      ),
      db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM "Guest"${whereClause}`,
        ...params
      ),
    ]);

    const guests = (guestsRaw as Record<string, unknown>[]).map((g) => ({
      id: String(g.id),
      name: String(g.name || ""),
      phone: String(g.phone || ""),
      email: String(g.email || ""),
      idNumber: String(g.idNumber || ""),
      idType: String(g.idType || ""),
      nationality: String(g.nationality || ""),
      region: String(g.region || ""),
      zone: String(g.zone || ""),
      woreda: String(g.woreda || ""),
      kebele: String(g.kebele || ""),
      houseNumber: String(g.houseNumber || ""),
      streetName: String(g.streetName || ""),
      plateNumber: String(g.plateNumber || ""),
      weapon: String(g.weapon || ""),
      vip: Boolean(g.vip),
      totalSpent: Number(g.totalSpent),
      totalStays: Number(g.totalStays),
      providerId: g.providerId ? String(g.providerId) : null,
      createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : String(g.createdAt || ""),
      updatedAt: g.updatedAt instanceof Date ? g.updatedAt.toISOString() : String(g.updatedAt || ""),
    }));

    const total = Array.isArray(totalRaw) ? (totalRaw[0] as Record<string, number>)?.count ?? 0 : 0;

    return NextResponse.json({ guests, total, page, limit });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
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
    const { name, phone, email, idNumber, idType, nationality, region, zone, woreda, kebele, houseNumber, streetName, plateNumber, weapon, address, notes, vip } = body;

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