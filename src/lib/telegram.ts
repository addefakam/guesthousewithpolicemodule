/**
 * Telegram Bot integration — sends alert messages to private Telegram users.
 *
 * Setup:
 *   1. Create a bot via @BotFather → get the bot token
 *   2. Set TELEGRAM_BOT_TOKEN in Vercel environment variables
 *   3. Each user sends /start to the bot to get their chat ID
 *   4. Configure the chat ID(s) in the system config (PoliceAlertConfig)
 *
 * The bot sends messages to private Telegram users (not groups) — each
 * user must have started a conversation with the bot first.
 */

/**
 * Send a message to a Telegram user via the Bot API.
 *
 * @param chatId  The Telegram chat ID of the recipient (numeric, as string)
 * @param text    The message text (supports Markdown)
 * @param botToken Optional — if not provided, reads from TELEGRAM_BOT_TOKEN env var
 * @returns true on success, false on failure
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  botToken?: string,
): Promise<boolean> {
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN || "8319586071:AAHvZSVPo1UX2gn_1cz2O2XMrKU_sAmekCs";
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set — skipping Telegram send");
    return false;
  }

  if (!chatId || chatId.trim() === "") {
    console.warn("[telegram] No chat ID provided — skipping Telegram send");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    // Telegram message limit is 4096 characters — truncate if needed
    const truncatedText =
      text.length > 4000 ? text.substring(0, 4000) + "\n\n...(message truncated)" : text;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: truncatedText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[telegram] sendMessage failed: ${response.status} ${response.statusText}`,
        errorBody.substring(0, 200),
      );
      return false;
    }

    const data = await response.json();
    if (!data.ok) {
      console.error("[telegram] sendMessage returned ok=false:", data.description);
      return false;
    }

    console.log(`[telegram] Message sent to chat_id=${chatId} (message_id=${data.result?.message_id})`);
    return true;
  } catch (error) {
    console.error("[telegram] sendMessage error:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Send a message to multiple Telegram users.
 * Each chat ID receives the message independently — one failure doesn't
 * block the others.
 *
 * @param chatIds Array of Telegram chat IDs
 * @param text Message text
 * @returns Number of successful sends
 */
export async function sendTelegramBulk(
  chatIds: string[],
  text: string,
): Promise<number> {
  if (!chatIds || chatIds.length === 0) return 0;

  let successCount = 0;
  for (const chatId of chatIds) {
    const ok = await sendTelegramMessage(chatId, text);
    if (ok) successCount++;
  }
  return successCount;
}

/**
 * Format a suspect match alert as a clean Telegram message with HTML formatting.
 */
export function formatSuspectAlertMessage(params: {
  severity: string;
  suspectName: string;
  guestName: string;
  guestPhone: string;
  guestIdNumber: string;
  matchType: string;
  providerName: string;
  matchReason: string;
  bookingSummary?: string;
  geofenceBreaches?: string[];
  matchId: string;
}): string {
  const {
    severity,
    suspectName,
    guestName,
    guestPhone,
    guestIdNumber,
    matchType,
    providerName,
    matchReason,
    bookingSummary,
    geofenceBreaches,
    matchId,
  } = params;

  const severityEmoji =
    severity === "CRITICAL" ? "🚨" :
    severity === "HIGH" ? "⚠️" :
    severity === "MEDIUM" ? "🟡" : "ℹ️";

  const lines: string[] = [];
  lines.push(`${severityEmoji} <b>[${severity}] Suspect Match Alert</b>`);
  lines.push("");
  lines.push(`<b>Suspect:</b> ${escapeHtml(suspectName)}`);
  lines.push(`<b>Detected at:</b> ${escapeHtml(providerName)}`);
  lines.push("");
  lines.push(`<b>Matched Guest:</b> ${escapeHtml(guestName)}`);
  if (guestPhone) lines.push(`<b>Phone:</b> ${escapeHtml(guestPhone)}`);
  if (guestIdNumber) lines.push(`<b>ID:</b> ${escapeHtml(guestIdNumber)}`);
  lines.push(`<b>Matched By:</b> ${escapeHtml(matchReason)}`);
  if (bookingSummary) lines.push(`<b>Booking:</b> ${escapeHtml(bookingSummary)}`);
  lines.push(`<b>Type:</b> ${escapeHtml(matchType)}`);
  if (geofenceBreaches && geofenceBreaches.length > 0) {
    lines.push("");
    lines.push(`<b>🔒 GEOFENCE BREACH:</b> ${escapeHtml(geofenceBreaches.join("; "))}`);
  }
  lines.push("");
  lines.push(`<b>Match ID:</b> <code>${escapeHtml(matchId)}</code>`);
  lines.push(`<b>Time:</b> ${new Date().toISOString()}`);

  return lines.join("\n");
}

/**
 * Format a suspended/provider-suspension alert as a Telegram message.
 */
export function formatSuspendedAlertMessage(params: {
  providerName: string;
  reason: string;
  suspendedBy: string;
}): string {
  const { providerName, reason, suspendedBy } = params;
  const lines: string[] = [];
  lines.push(`⛔ <b>Provider Suspended</b>`);
  lines.push("");
  lines.push(`<b>Guesthouse:</b> ${escapeHtml(providerName)}`);
  lines.push(`<b>Reason:</b> ${escapeHtml(reason || "N/A")}`);
  lines.push(`<b>Suspended by:</b> ${escapeHtml(suspendedBy)}`);
  lines.push(`<b>Time:</b> ${new Date().toISOString()}`);
  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
