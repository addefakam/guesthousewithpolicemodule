import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/tenant";

// GET /api/owner-accounts — SUPERUSER lists all providers with their owner (SUPERUSER) user credentials
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    if (auth.role !== "SUPERUSER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch all providers with their SUPERUSER (owner) user accounts
    const providers = await db.provider.findMany({
      select: {
        id: true,
        name: true,
        ownerName: true,
        phone: true,
        email: true,
        status: true,
        createdAt: true,
        users: {
          where: { role: "SUPERUSER" },
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            providerId: true,
            createdAt: true,
            // intentionally NOT selecting password
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(providers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch owner accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}