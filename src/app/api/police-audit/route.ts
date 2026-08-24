import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, AuthError } from "@/lib/tenant";

const CRITICAL_ACTIONS = ["DELETE", "SUSPEND", "CONFIG_CHANGE", "APPROVE", "REJECT", "LOGIN_FAILED"];

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (auth.role !== "POLICE" && auth.role !== "SUPERUSER") {
      throw new AuthError("Police or superuser access required", 403);
    }
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "";
    const search = searchParams.get("search") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const critical = searchParams.get("critical") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (action && action !== "ALL") {
      where.action = action;
    }
    if (critical) {
      where.action = { in: CRITICAL_ACTIONS };
    }
    if (search) {
      where.OR = [
        { officerName: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
        { targetType: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
      ];
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Set end of day for dateTo
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.createdAt = dateFilter;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        select: {
          id: true, officerName: true, action: true, targetId: true, targetType: true,
          ipAddress: true, createdAt: true, details: true,
        },
        orderBy: { createdAt: "desc" }, skip, take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch audit logs";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
