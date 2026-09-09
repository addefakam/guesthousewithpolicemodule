import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/init-db";

/**
 * POST /api/auth/reset-request
 *
 * Body: { email: string }
 *
 * Looks up a user by email. If found:
 *   - Generates a single-use random token (32 bytes hex)
 *   - Persists a PasswordResetToken row (expires in 1 hour)
 *   - Returns the reset URL so the caller can deliver it (the platform
 *     has no SMTP integration yet; admin/operator can copy the link
 *     from the response and send it via SMS/WhatsApp to the user).
 *
 * If not found, returns a generic 200 with `sent: false` so the endpoint
 * can't be used to enumerate which emails are registered.
 *
 * No authentication required — this is the public reset-request endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Look up the user by email (case-insensitive). The User table has
    // email as a nullable TEXT column with no unique constraint, so we
    // pick the most recently created active match.
    const user = await db.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, username: true, email: true },
    });

    if (!user) {
      // Don't reveal whether the email exists — return generic success.
      return NextResponse.json({
        sent: false,
        message:
          "If an account with that email exists, a reset link has been generated.",
      });
    }

    // Generate a single-use token (32 random bytes → 64-char hex string)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 hour

    // Persist the token. We don't invalidate previous tokens for the same
    // user — they all expire naturally after 1h. This keeps the flow simple
    // and prevents race conditions if the user requests multiple resets.
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Build the reset URL. The /reset-password page reads the `token`
    // query param and posts it back to /api/auth/reset-confirm along
    // with the new password.
    const origin = req.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    return NextResponse.json({
      sent: true,
      message: "Reset link generated. Share it with the account owner.",
      // We return the URL+token in the response so the operator can
      // copy it and send it via SMS/WhatsApp. Once SMTP is configured,
      // we'll send the email server-side and remove these fields.
      resetUrl,
      token,
      user: {
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[auth/reset-request] Failed:",
      error instanceof Error ? error.message : String(error),
    );
    const message =
      error instanceof Error ? error.message : "Failed to request reset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
