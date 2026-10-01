import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, AuthError } from "@/lib/tenant";
import { ensureNewTables } from "@/lib/ensure-tables";

/**
 * GET /api/resources/[id]/movements
 *
 * Returns the audit-trail history for a single Resource — every quantity
 * change (restock, edit, consumption, stocktake-correction) with who/when/
 * why/previous/new quantity.
 *
 * Auth: same as the resource itself — operators/staff/superuser with
 * matching providerId, or POLICE (read-only city-wide access).
 *
 * Query params:
 *   ?limit=50  (default 50, max 200)
 *   ?offset=0  (for pagination)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureNewTables();
    const auth = await getAuthContext(req);
    const { id } = await params;

    const filter = getProviderFilter(auth);
    const where: Record<string, unknown> = filter.isPolice
      ? { id }
      : { id, providerId: filter.providerId };

    // Verify the resource exists + belongs to the caller's provider
    const existing = await db.resource.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    const { searchParams } = req.nextUrl;
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where: { resourceId: id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.stockMovement.count({ where: { resourceId: id } }),
    ]);

    return NextResponse.json({
      movements,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[resources/[id]/movements GET]", error);
    const msg = error instanceof Error ? error.message : String(error);
    // If the StockMovement table doesn't exist yet (pre-migration),
    // return an empty list rather than crashing the UI.
    if (msg.includes("does not exist") || msg.includes("Unknown table") || msg.includes("relation")) {
      return NextResponse.json({ movements: [], total: 0, limit: 50, offset: 0 });
    }
    return NextResponse.json(
      { error: "Failed to load movement history" },
      { status: 500 }
    );
  }
}
