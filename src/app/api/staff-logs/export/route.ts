import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, AuthError } from "@/lib/tenant";
import { ensureNewTables } from "@/lib/ensure-tables";

/**
 * GET /api/staff-logs/export
 *
 * Returns a CSV file of all staff logs matching the filter (no pagination —
 * returns everything that matches). Same filter params as /api/staff-logs:
 *   action, targetType, userId, from, to
 *
 * Auth/scoping: same as the main GET — OPERATOR/STAFF see only their own
 * provider's logs, POLICE/SUPERUSER see all.
 *
 * The CSV columns are:
 *   timestamp, staffName, action, targetType, targetId, details, ipAddress, providerId
 */
export async function GET(req: NextRequest) {
  try {
    await ensureNewTables();
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);

    const where: Record<string, unknown> = filter.isPolice
      ? {}
      : { providerId: filter.providerId };

    const { searchParams } = req.nextUrl;
    const action = searchParams.get("action") || "";
    const targetType = searchParams.get("targetType") || "";
    const userId = searchParams.get("userId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59");
    }

    // Cap at 10,000 rows to prevent memory exhaustion on huge log tables.
    // Operators with >10k logs in a single filter should narrow the date range.
    const logs = await db.staffLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    // Build CSV
    const escapeCsv = (v: string | null | undefined): string => {
      const s = v === null || v === undefined ? "" : String(v);
      // RFC 4180: wrap in quotes if it contains comma, newline, or quote
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = [
      "timestamp",
      "staffName",
      "action",
      "targetType",
      "targetId",
      "details",
      "ipAddress",
      "providerId",
    ].join(",");

    const rows = logs.map((l) =>
      [
        new Date(l.createdAt).toISOString(),
        l.userName || "",
        l.action,
        l.targetType,
        l.targetId,
        l.details,
        l.ipAddress,
        l.providerId,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = [header, ...rows].join("\r\n");

    const filename = `staff-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[staff-logs/export GET]", error);
    return NextResponse.json({ error: "Failed to export staff logs" }, { status: 500 });
  }
}
