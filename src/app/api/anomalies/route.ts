import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";
import { requirePoliceMinRank } from "@/lib/police-permissions";
import { logAudit } from "@/lib/audit";
import { runSystemWideScan, getAnomalyStats, isAnomalyDetectionEnabled, invalidateAnomalyToggleCache } from "@/lib/anomaly-engine";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") || "";
    const severity = searchParams.get("severity") || "";
    const reviewed = searchParams.get("reviewed");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "50", 10)));

    const offset = (page - 1) * pageSize;
    const reviewedBool = reviewed === "true";

    const [anomalies, countResult, stats, enabled] = await Promise.all([
      db.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM "AnomalyRecord"
          WHERE ($1 = '' OR "type" = $1)
            AND ($2 = '' OR "severity" = $2)
            AND ($3::boolean IS NULL OR "isReviewed" = $3)
          ORDER BY "createdAt" DESC
          LIMIT $4 OFFSET $5`,
        type, severity, reviewed ? reviewedBool : null, pageSize, offset
      ),
      db.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT COUNT(*)::bigint as c FROM "AnomalyRecord"
          WHERE ($1 = '' OR "type" = $1)
            AND ($2 = '' OR "severity" = $2)
            AND ($3::boolean IS NULL OR "isReviewed" = $3)`,
        type, severity, reviewed ? reviewedBool : null
      ),
      getAnomalyStats(),
      isAnomalyDetectionEnabled(),
    ]);

    return NextResponse.json({
      anomalies,
      total: Number(countResult[0]?.c || 0),
      page,
      pageSize,
      stats,
      enabled,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch anomalies";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    const body = await req.json();
    const { action } = body;

    if (action === "toggle") {
      requirePoliceMinRank(auth, "ADMIN");

      const enabled: boolean = body.enabled ?? false;

      let config = await db.policeAlertConfig.findFirst();
      if (!config) {
        config = await db.policeAlertConfig.create({ data: { anomalyDetectionEnabled: enabled } });
      } else {
        config = await db.policeAlertConfig.update({
          where: { id: config.id },
          data: { anomalyDetectionEnabled: enabled },
        });
      }

      invalidateAnomalyToggleCache();

      logAudit(req, { action: "ANOMALY_TOGGLE", details: `Anomaly detection ${enabled ? "ENABLED" : "DISABLED"}` });
      return NextResponse.json({ enabled, message: `Anomaly detection ${enabled ? "enabled" : "disabled"}` });
    }

    if (action === "review") {
      const ids: string[] = body.ids || [];
      if (ids.length === 0) {
        return NextResponse.json({ error: "ids array is required" }, { status: 400 });
      }

      if (ids.length > 0) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
        await db.$executeRawUnsafe(
          `UPDATE "AnomalyRecord" SET "isReviewed" = true WHERE "id" IN (${placeholders})`,
          ...ids
        );
      }

      logAudit(req, { action: "ANOMALY_REVIEW", details: `Reviewed ${ids.length} anomalies` });
      return NextResponse.json({ reviewed: ids.length });
    }

    if (action === "scan") {
      requirePoliceMinRank(auth, "DETECTIVE");
      logAudit(req, { action: "ANOMALY_SCAN", details: "System-wide anomaly scan triggered" });

      const result = await runSystemWideScan();
      return NextResponse.json({
        message: `Scan complete. ${result.scanned} guests scanned, ${result.anomalies} anomalies found.`,
        ...result,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'scan', 'review', or 'toggle'." }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to process anomalies";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
