import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, AuthError } from "@/lib/tenant";
import { logStaffActivity, getLogUserInfo } from "@/lib/staff-log";
import { ensureNewTables } from "@/lib/ensure-tables";
import { isValidPhone, isValidEmail } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await ensureNewTables();
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);

    const where: Record<string, unknown> = filter.isPolice
      ? {}
      : { providerId: filter.providerId };

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || "";
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { contactPhone: { contains: q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.groupBooking.findMany({
        where,
        include: {
          reservations: {
            include: {
              guest: { select: { id: true, name: true, phone: true, email: true } },
            },
            orderBy: { checkIn: "asc" },
          },
          _count: { select: { reservations: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.groupBooking.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[group-bookings GET]", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("does not exist") || msg.includes("Unknown table") || msg.includes("relation")) {
      return NextResponse.json({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    }
    return NextResponse.json({ error: "Failed to fetch group bookings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureNewTables();
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    if (!providerId) return NextResponse.json({ error: "Provider required" }, { status: 403 });

    const body = await req.json();
    const { name, contactName, contactPhone, contactEmail, startDate, endDate, notes } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, startDate, and endDate are required" }, { status: 400 });
    }

    if (contactPhone && !isValidPhone(contactPhone)) {
      return NextResponse.json({ error: "Invalid phone number format. Use 7-15 digits with optional + prefix." }, { status: 400 });
    }
    if (contactEmail && !isValidEmail(contactEmail)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }

    const groupBooking = await db.groupBooking.create({
      data: {
        name,
        contactName: contactName || "",
        contactPhone: contactPhone || "",
        contactEmail: contactEmail || "",
        startDate,
        endDate,
        notes: notes || "",
        providerId,
      },
    });

    const { userId, userName } = getLogUserInfo(req);
    logStaffActivity({
      req,
      userId,
      userName,
      action: "CREATE_GROUP_BOOKING",
      targetType: "GROUP_BOOKING",
      targetId: groupBooking.id,
      details: { name, startDate, endDate },
      providerId,
    });

    return NextResponse.json(groupBooking, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[group-bookings POST]", error);
    return NextResponse.json({ error: "Failed to create group booking" }, { status: 500 });
  }
}
