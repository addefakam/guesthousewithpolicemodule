import { db } from "./db";
import { sendTelegramMessage, formatSuspectAlertMessage } from "./telegram";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchData {
  matchId: string;
  providerId: string;
  providerName: string;
  guestName: string;
  guestPhone: string;
  guestIdNumber: string;
  matchType: string;
  details: string;
}

interface SuspectData {
  id: string;
  name: string;
  severity: string;
  is_active: boolean;
}

// ─── Haversine Distance ───────────────────────────────────────────────────────

/**
 * Calculate the great-circle distance between two points on Earth using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ─── Geofence Check ───────────────────────────────────────────────────────────

/**
 * Check if the given coordinates are within any active geofence.
 * Returns an array of breached geofence names (empty if none).
 */
async function checkGeofences(
  providerLat: number,
  providerLon: number
): Promise<string[]> {
  try {
    const geofences = await db.geofence.findMany({
      where: { isActive: true },
    });

    const breached: string[] = [];
    for (const gf of geofences) {
      const distance = haversineDistance(
        providerLat,
        providerLon,
        gf.latitude,
        gf.longitude
      );
      if (distance <= gf.radius) {
        breached.push(`${gf.name} (${Math.round(distance)}m inside ${Math.round(gf.radius)}m radius)`);
      }
    }
    return breached;
  } catch (error) {
    console.error("[alert-dispatcher] Geofence check failed:", error);
    return [];
  }
}

// ─── Notification Creation ────────────────────────────────────────────────────

/**
 * Create an in-app Notification record so the alert is visible in the Notifications page.
 */
async function createNotification(params: {
  title: string;
  message: string;
  providerId: string;
}): Promise<void> {
  try {
    await db.notification.create({
      data: {
        title: params.title,
        message: params.message,
        type: "WARNING",
        providerId: params.providerId,
        isRead: false,
      },
    });
  } catch (error) {
    console.error("[alert-dispatcher] Failed to create notification:", error);
  }
}

// ─── Email Dispatch Stub ─────────────────────────────────────────────────────

/**
 * Stub for email dispatch. Currently logs the email that *would* be sent.
 * When a real email SDK is integrated, replace the console.log with actual sending logic.
 */
async function dispatchEmail(
  recipients: string[],
  subject: string,
  body: string
): Promise<void> {
  try {
    // Placeholder — in production, replace with actual email sending (e.g. Resend, SendGrid, SES)
    console.log(`[alert-dispatcher] EMAIL to ${recipients.join(", ")}`);
    console.log(`[alert-dispatcher]   Subject: ${subject}`);
    console.log(`[alert-dispatcher]   Body: ${body}`);
  } catch (error) {
    console.error("[alert-dispatcher] Email dispatch failed:", error);
  }
}

// ─── SMS Dispatch Stub ────────────────────────────────────────────────────────

/**
 * Stub for SMS dispatch. Currently logs the SMS that *would* be sent.
 * When a real SMS provider is integrated, replace the console.log with actual sending logic.
 */
async function dispatchSMS(
  recipients: string[],
  message: string
): Promise<void> {
  try {
    // Placeholder — in production, replace with actual SMS sending (e.g. Twilio, Vonage)
    console.log(`[alert-dispatcher] SMS to ${recipients.join(", ")}`);
    console.log(`[alert-dispatcher]   Message: ${message}`);
  } catch (error) {
    console.error("[alert-dispatcher] SMS dispatch failed:", error);
  }
}

// ─── Safe JSON Parse ──────────────────────────────────────────────────────────

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────

/**
 * Dispatch an alert for a newly created suspect match.
 *
 * Flow:
 * 1. Read PoliceAlertConfig from DB
 * 2. Determine severity from the SuspectedPerson
 * 3. Check geofences and annotate breach info
 * 4. For CRITICAL + criticalImmediate → dispatch immediately
 * 5. For HIGH → log escalation delay (no cron on Vercel free tier)
 * 6. Create in-app Notification record
 * 7. If email/SMS enabled, dispatch via stubs
 *
 * This function is designed to be called fire-and-forget.
 * It never throws — all errors are caught and logged internally.
 */
export async function dispatchAlertForMatch(
  suspect: SuspectData,
  matchData: MatchData
): Promise<void> {
  try {
    const severity: string = suspect.severity?.toUpperCase() || "MEDIUM";

    console.log(
      `[alert-dispatcher] Processing match ${matchData.matchId} | ` +
      `suspect=${suspect.name} | severity=${severity} | ` +
      `provider=${matchData.providerName}`
    );

    // ── 1. Read alert config ────────────────────────────────────────────────
    let config: {
      emailEnabled: boolean;
      emailRecipients: string;
      smsEnabled: boolean;
      smsRecipients: string;
      escalationDelayMins: number;
      criticalImmediate: boolean;
    } | null = null;

    try {
      config = await db.policeAlertConfig.findFirst();
    } catch (error) {
      console.error("[alert-dispatcher] Failed to read PoliceAlertConfig:", error);
      // Fall back to defaults
      config = {
        emailEnabled: false,
        emailRecipients: "[]",
        smsEnabled: false,
        smsRecipients: "[]",
        escalationDelayMins: 60,
        criticalImmediate: true,
      };
    }

    if (!config) {
      config = {
        emailEnabled: false,
        emailRecipients: "[]",
        smsEnabled: false,
        smsRecipients: "[]",
        escalationDelayMins: 60,
        criticalImmediate: true,
      };
    }

    // ── 2. Check geofences ──────────────────────────────────────────────────
    let providerLat = 0;
    let providerLon = 0;

    try {
      const provider = await db.provider.findUnique({
        where: { id: matchData.providerId },
        select: { latitude: true, longitude: true },
      });
      if (provider) {
        providerLat = provider.latitude;
        providerLon = provider.longitude;
      }
    } catch (error) {
      console.error("[alert-dispatcher] Failed to fetch provider coords:", error);
    }

    const breachedGeofences = await checkGeofences(providerLat, providerLon);

    // ── 3. Build alert content ──────────────────────────────────────────────
    const geofenceTag =
      breachedGeofences.length > 0
        ? ` | GEOFENCE BREACH: ${breachedGeofences.join("; ")}`
        : "";

    const title = `[${severity}] Suspect Match Alert${breachedGeofences.length > 0 ? " — GEOFENCE BREACH" : ""}`;

    // Parse details for structured information
    const parsedDetails = safeJsonParse<Record<string, unknown>>(matchData.details, {});

    // Build match reason label
    const matchReasons = safeJsonParse<Record<string, string>>(String(parsedDetails.matchReasons || "{}"), {});
    const reasonEntries = Object.values(matchReasons);
    const reasonLabels: Record<string, string> = { ID_NUMBER: "ID Number", PHONE: "Phone Number", NAME: "Name" };
    const reasonStr = reasonEntries.length > 0 ? reasonEntries.map((r) => reasonLabels[r] || r).join(", ") : "Unknown";

    // Build booking summary based on match type
    let bookingSummary = "";
    if (matchData.matchType === "RESERVATION") {
      const checkIn = parsedDetails.checkIn ? new Date(String(parsedDetails.checkIn)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
      const checkOut = parsedDetails.checkOut ? new Date(String(parsedDetails.checkOut)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
      const room = parsedDetails.roomNumber ? `Room ${parsedDetails.roomNumber}` : "";
      const nights = parsedDetails.nights ? `${parsedDetails.nights} night(s)` : "";
      const cost = parsedDetails.totalCost ? `ETB ${Number(parsedDetails.totalCost).toLocaleString()}` : "";
      bookingSummary = [checkIn && checkOut ? `${checkIn} → ${checkOut}` : "", room, nights, cost].filter(Boolean).join(" | ");
    } else if (matchData.matchType === "DAYTIME_BOOKING") {
      const date = parsedDetails.date ? new Date(String(parsedDetails.date)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
      const time = parsedDetails.time ? String(parsedDetails.time) : "";
      const service = parsedDetails.serviceName ? String(parsedDetails.serviceName) : "";
      const cost = parsedDetails.totalCost ? `ETB ${Number(parsedDetails.totalCost).toLocaleString()}` : "";
      bookingSummary = [date, time, service, cost].filter(Boolean).join(" | ");
    }

    // Format guest ID info
    const guestIdType = String(parsedDetails.guestIdType || "");
    const guestIdNum = matchData.guestIdNumber || "";
    const guestIdStr = guestIdNum ? `${guestIdType ? guestIdType + ": " : "ID: "}${guestIdNum}` : "";

    // Build clean message lines
    const lines: string[] = [];
    lines.push(`Suspect "${suspect.name}" (${severity}) was detected at ${matchData.providerName || "unknown provider"}.`);
    lines.push("");
    lines.push(`Matched Guest: ${matchData.guestName}${matchData.guestPhone ? " | " + matchData.guestPhone : ""}${guestIdStr ? " | " + guestIdStr : ""}`);
    lines.push(`Matched By: ${reasonStr}`);
    if (bookingSummary) {
      lines.push(`Booking: ${bookingSummary}`);
    }
    lines.push(`Match Type: ${matchData.matchType}`);
    if (breachedGeofences.length > 0) {
      lines.push("");
      lines.push(`GEOFENCE BREACH: ${breachedGeofences.join("; ")}`);
    }
    lines.push("");
    lines.push(`Match ID: ${matchData.matchId}`);
    lines.push(`Detected: ${new Date().toISOString()}`);

    const message = lines.join("\n");

    // ── 4. Severity-based dispatch logic ────────────────────────────────────

    if (severity === "CRITICAL") {
      // CRITICAL — send immediately if criticalImmediate is enabled
      if (config.criticalImmediate) {
        console.log(
          `[alert-dispatcher] CRITICAL match ${matchData.matchId} — dispatching immediately`
        );

        // Create in-app notification
        await createNotification({
          title,
          message,
          providerId: matchData.providerId,
        });

        // Dispatch email if enabled
        if (config.emailEnabled) {
          const recipients = safeJsonParse<string[]>(config.emailRecipients, []);
          if (recipients.length > 0) {
            await dispatchEmail(
              recipients,
              `🚨 CRITICAL Suspect Match: ${suspect.name} at ${matchData.providerName}${geofenceTag}`,
              message
            );
          }
        }

        // Dispatch SMS if enabled
        if (config.smsEnabled) {
          const recipients = safeJsonParse<string[]>(config.smsRecipients, []);
          if (recipients.length > 0) {
            const smsMessage =
              `CRITICAL: Suspect "${suspect.name}" matched at "${matchData.providerName}". ` +
              `Guest: ${matchData.guestName}. Match ID: ${matchData.matchId}.` +
              (breachedGeofences.length > 0 ? ` GEOFENCE BREACH: ${breachedGeofences.join("; ")}` : "");
            await dispatchSMS(recipients, smsMessage);
          }
        }

        // ── Telegram dispatch (CRITICAL) ──────────────────────────────────
        // Sends to the Telegram chat ID configured in the TelegramChatId
        // env var, or to chat IDs stored in PoliceAlertConfig.
        await dispatchTelegramAlert(
          suspect,
          matchData,
          severity,
          title,
          message,
          bookingSummary,
          reasonStr,
          guestIdStr,
          breachedGeofences,
        );
      } else {
        console.log(
          `[alert-dispatcher] CRITICAL match ${matchData.matchId} — criticalImmediate disabled, skipping dispatch`
        );
      }
    } else if (severity === "HIGH") {
      // HIGH — log escalation delay (no cron available on Vercel free tier)
      console.log(
        `[alert-dispatcher] HIGH match ${matchData.matchId} — escalation delay of ${config.escalationDelayMins} minutes (no cron; log-only)` +
          (breachedGeofences.length > 0 ? ` | GEOFENCE BREACH detected` : "")
      );

      // Still create in-app notification for HIGH severity
      await createNotification({
        title,
        message,
        providerId: matchData.providerId,
      });

      // Dispatch email if enabled for HIGH
      if (config.emailEnabled) {
        const recipients = safeJsonParse<string[]>(config.emailRecipients, []);
        if (recipients.length > 0) {
          await dispatchEmail(
            recipients,
            `⚠ HIGH Suspect Match: ${suspect.name} at ${matchData.providerName}${geofenceTag}`,
            message
          );
        }
      }

      // Dispatch SMS if enabled for HIGH
      if (config.smsEnabled) {
        const recipients = safeJsonParse<string[]>(config.smsRecipients, []);
        if (recipients.length > 0) {
          const smsMessage =
            `HIGH: Suspect "${suspect.name}" matched at "${matchData.providerName}". ` +
            `Guest: ${matchData.guestName}. Match ID: ${matchData.matchId}.`;
          await dispatchSMS(recipients, smsMessage);
        }
      }

      // ── Telegram dispatch (HIGH) ─────────────────────────────────────
      await dispatchTelegramAlert(
        suspect,
        matchData,
        severity,
        title,
        message,
        bookingSummary,
        reasonStr,
        guestIdStr,
        breachedGeofences,
      );
    } else {
      // LOW / MEDIUM — create notification but don't trigger external channels
      console.log(
        `[alert-dispatcher] ${severity} match ${matchData.matchId} — in-app notification only` +
          (breachedGeofences.length > 0 ? ` | GEOFENCE BREACH detected` : "")
      );

      await createNotification({
        title,
        message,
        providerId: matchData.providerId,
      });
    }
  } catch (error) {
    // Top-level catch — this function must NEVER throw
    console.error(
      `[alert-dispatcher] Unhandled error dispatching alert for match ${matchData.matchId}:`,
      error
    );
  }
}

// ─── Telegram dispatch helper ────────────────────────────────────────────────
//
// Reads the target Telegram chat ID(s) from:
//   1. TELEGRAM_CHAT_IDS env var (comma-separated list of chat IDs)
//   2. PoliceAlertConfig.telegramChatIds field (JSON array, if it exists)
//
// Sends the formatted alert to each chat ID. One failure doesn't block
// the others — best-effort fire-and-forget.
async function dispatchTelegramAlert(
  suspect: SuspectData,
  matchData: MatchData,
  severity: string,
  _title: string,
  _message: string,
  bookingSummary: string,
  reasonStr: string,
  guestIdStr: string,
  breachedGeofences: string[],
): Promise<void> {
  try {
    // 1. Collect target chat IDs
    const chatIds: string[] = [];

    // From env var: TELEGRAM_CHAT_IDS="123456789,987654321"
    const envChats = process.env.TELEGRAM_CHAT_IDS;
    if (envChats) {
      for (const id of envChats.split(",")) {
        const trimmed = id.trim();
        if (trimmed) chatIds.push(trimmed);
      }
    }

    // 2. If no chat IDs configured, skip silently
    if (chatIds.length === 0) {
      console.log(
        `[alert-dispatcher] Telegram: no chat IDs configured (set TELEGRAM_CHAT_IDS env var) — skipping`
      );
      return;
    }

    // 3. Format the message for Telegram
    const telegramMessage = formatSuspectAlertMessage({
      severity,
      suspectName: suspect.name,
      guestName: matchData.guestName,
      guestPhone: matchData.guestPhone,
      guestIdNumber: guestIdStr || matchData.guestIdNumber,
      matchType: matchData.matchType,
      providerName: matchData.providerName,
      matchReason: reasonStr,
      bookingSummary: bookingSummary || undefined,
      geofenceBreaches: breachedGeofences.length > 0 ? breachedGeofences : undefined,
      matchId: matchData.matchId,
    });

    // 4. Send to each chat ID
    console.log(
      `[alert-dispatcher] Telegram: sending ${severity} alert to ${chatIds.length} chat(s)`
    );
    for (const chatId of chatIds) {
      await sendTelegramMessage(chatId, telegramMessage);
    }
  } catch (error) {
    // Never let Telegram errors break the alert dispatcher
    console.error("[alert-dispatcher] Telegram dispatch failed:", error);
  }
}
