import { NextRequest, NextResponse } from "next/server";
import { runReservationMaintenance } from "@/lib/reservation-maintenance";

/**
 * Vercel Cron endpoint — runs reservation lifecycle maintenance:
 *  (a) creates reminder notifications for reservations whose check-in date
 *      passed without a check-in, and
 *  (b) auto-releases rooms (reservation → CANCELLED, room → AVAILABLE) once
 *      the checkout day has passed.
 *
 * Schedule is defined in vercel.json ("crons"). Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` when the CRON_SECRET env var is set —
 * in that case the request MUST present the matching secret. When CRON_SECRET
 * is not configured (local development), the endpoint stays open.
 */
export const dynamic = "force-dynamic";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  const key = req.nextUrl.searchParams.get("key");
  return key === secret;
}

async function handle(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runReservationMaintenance({}, { force: true });
    return NextResponse.json(summary);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Maintenance run failed";
    console.error("[cron/reservation-maintenance] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
