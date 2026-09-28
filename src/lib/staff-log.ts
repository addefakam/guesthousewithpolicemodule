import { db } from "./db";
import type { NextRequest } from "next/server";

interface StaffLogOpts {
  req?: NextRequest;
  userId: string;
  userName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string | Record<string, unknown>;
  providerId: string;
}

/**
 * Fire-and-forget staff activity logger.
 * Captures who did what, when, from where.
 * Never throws — errors are caught and logged to console.
 */
export function logStaffActivity(opts: StaffLogOpts): void {
  const {
    req,
    userId,
    userName = "",
    action,
    targetType = "",
    targetId = "",
    details = "",
    providerId,
  } = opts;

  const detailsStr = typeof details === "string" ? details : JSON.stringify(details);
  const ip =
    req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req?.headers.get("x-real-ip") ||
    "";

  // Fire and forget — don't await
  (async () => {
    try {
      await db.staffLog.create({
        data: {
          userId,
          userName,
          action,
          targetType,
          targetId,
          details: detailsStr,
          ipAddress: ip,
          providerId,
        },
      });
    } catch (err) {
      console.error("[staffLog] Failed to log:", err instanceof Error ? err.message : String(err));
    }
  })();
}

/**
 * Extract user info from JWT token for logging purposes.
 * Returns { userId, userName } or defaults.
 *
 * Uses base64url decoding (not standard base64) since jose library
 * encodes JWT payloads in base64url format.
 */
export function getLogUserInfo(req: NextRequest): { userId: string; userName: string } {
  try {
    const token = req.cookies.get("ghms_token")?.value;
    if (!token) return { userId: "unknown", userName: "" };
    const parts = token.split(".");
    if (parts.length !== 3) return { userId: "unknown", userName: "" };
    // JWT uses base64url encoding (replace - with +, _ with /)
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString());
    return {
      userId: payload.userId || payload.sub || "unknown",
      userName: payload.name || payload.userName || "",
    };
  } catch {
    return { userId: "unknown", userName: "" };
  }
}
