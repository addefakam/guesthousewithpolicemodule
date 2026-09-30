import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, AuthError } from "@/lib/tenant";
import { uploadFile } from "@/lib/storage";
import { isValidPhone, isValidEmail } from "@/lib/utils";

/**
 * /api/providers/me
 *
 * Lets an OPERATOR (or STAFF with permission) VIEW and EDIT their own
 * organization info — the Provider record + the per-provider Settings row.
 *
 * GET  → returns merged { ...providerFields, ...settingsFields }
 * PATCH → splits the body into:
 *   - Core fields (name, ownerName, phone, email, address, type, licenseNo,
 *     licenseFile) → written to Provider. Auto-approved — saves instantly,
 *     no re-approval flow.
 *   - Operational fields (logo, currency, taxRate, language, checkInTime,
 *     checkOutTime) → written to Settings. Instant.
 *   - GPS coordinates (latitude, longitude) → written to Provider. Instant.
 *
 * Access: OPERATOR + STAFF + SUPERUSER (when they have a providerId).
 * POLICE is rejected — they manage providers via /api/providers/[id].
 */

const DEFAULT_SETTINGS = {
  guestHouseName: "Guest House",
  ownerName: "",
  address: "",
  phone: "",
  email: "",
  currency: "ETB",
  taxRate: 0,
  language: "en",
  logo: null as string | null,
  checkInTime: "14:00",
  checkOutTime: "12:00",
};

// Provider fields the operator can edit.
const EDITABLE_PROVIDER_CORE = new Set([
  "name",
  "ownerName",
  "phone",
  "email",
  "address",
  "type",
  "licenseNo",
]);

const EDITABLE_SETTINGS = new Set([
  "logo",
  "currency",
  "taxRate",
  "language",
  "checkInTime",
  "checkOutTime",
]);

const GUESTHOUSE_TYPES = ["GUEST_HOUSE", "HOTEL", "LODGE", "RESORT", "OTHER"];

// ───────────────────────────── GET ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);

    if (!auth.providerId) {
      return NextResponse.json(
        { error: "No organization associated with this account." },
        { status: 400 }
      );
    }

    const provider = await db.provider.findUnique({
      where: { id: auth.providerId },
      select: {
        id: true,
        name: true,
        ownerName: true,
        phone: true,
        email: true,
        address: true,
        type: true,
        licenseNo: true,
        licenseFile: true,
        status: true,
        latitude: true,
        longitude: true,
        approvedBy: true,
        approvedAt: true,
        rejectionReason: true,
        suspensionReason: true,
        suspendedAt: true,
        suspendedBy: true,
        certNumber: true,
        certIssuedAt: true,
        certIssuedByName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Organization record not found." },
        { status: 404 }
      );
    }

    const settings = await db.settings.findFirst({
      where: { providerId: auth.providerId },
    });

    return NextResponse.json({
      ...provider,
      logo: settings?.logo ?? DEFAULT_SETTINGS.logo,
      currency: settings?.currency ?? DEFAULT_SETTINGS.currency,
      taxRate: settings?.taxRate ?? DEFAULT_SETTINGS.taxRate,
      language: settings?.language ?? DEFAULT_SETTINGS.language,
      checkInTime: settings?.checkInTime ?? DEFAULT_SETTINGS.checkInTime,
      checkOutTime: settings?.checkOutTime ?? DEFAULT_SETTINGS.checkOutTime,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[providers/me GET]", error);
    return NextResponse.json({ error: "Failed to load organization info" }, { status: 500 });
  }
}

// ───────────────────────────── PATCH ─────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);

    if (!auth.providerId) {
      return NextResponse.json(
        { error: "No organization associated with this account." },
        { status: 400 }
      );
    }

    if (auth.role === "POLICE") {
      return NextResponse.json(
        { error: "Police accounts cannot edit organization info here." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // ── Validate core fields if provided ──
    if (body.phone !== undefined && body.phone !== "" && !isValidPhone(String(body.phone))) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }
    if (body.email !== undefined && body.email !== "" && !isValidEmail(String(body.email))) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }
    if (body.type !== undefined && !GUESTHOUSE_TYPES.includes(String(body.type))) {
      return NextResponse.json({ error: "Invalid guesthouse type" }, { status: 400 });
    }
    if (body.licenseNo !== undefined) {
      const licStr = String(body.licenseNo).trim();
      if (!licStr) {
        return NextResponse.json({ error: "License number cannot be empty" }, { status: 400 });
      }
      const existing = await db.provider.findFirst({
        where: { licenseNo: licStr, NOT: { id: auth.providerId } },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Another guesthouse already uses this license number." },
          { status: 409 }
        );
      }
    }

    // ── Detect if any core field changed ──
    // Auto-approved: changes save instantly, no re-approval flow.
    const coreChanges: Record<string, unknown> = {};

    for (const k of EDITABLE_PROVIDER_CORE) {
      if (body[k] !== undefined) {
        coreChanges[k] = body[k];
      }
    }

    // licenseFile — uploaded as data: URL.
    if (typeof body.licenseFile === "string" && body.licenseFile.startsWith("data:")) {
      const uploadedUrl = await uploadFile(body.licenseFile, "licenses");
      coreChanges.licenseFile = uploadedUrl;
    }

    // ── Settings (operational) changes — instant ──
    const settingsChanges: Record<string, unknown> = {};
    for (const k of EDITABLE_SETTINGS) {
      if (body[k] !== undefined) {
        // logo can be null (cleared) or a data: URL (new upload).
        if (k === "logo" && typeof body[k] === "string" && (body[k] as string).startsWith("data:")) {
          settingsChanges.logo = await uploadFile(body[k] as string, "logos");
        } else {
          settingsChanges[k] = body[k];
        }
      }
    }

    // ── GPS coordinates — instant, no re-approval ──
    if (body.latitude !== undefined) {
      const lat = parseFloat(body.latitude);
      if (!isNaN(lat)) coreChanges.latitude = lat;
    }
    if (body.longitude !== undefined) {
      const lng = parseFloat(body.longitude);
      if (!isNaN(lng)) coreChanges.longitude = lng;
    }

    // ── Apply Provider updates (auto-approved — no re-approval flow) ──
    let updatedProvider = null;
    if (Object.keys(coreChanges).length > 0) {
      updatedProvider = await db.provider.update({
        where: { id: auth.providerId },
        data: coreChanges,
      });
    }

    // ── Apply Settings updates ──
    let updatedSettings = null;
    if (Object.keys(settingsChanges).length > 0) {
      const existingSettings = await db.settings.findFirst({
        where: { providerId: auth.providerId },
      });
      if (existingSettings) {
        updatedSettings = await db.settings.update({
          where: { id: existingSettings.id },
          data: settingsChanges,
        });
      } else {
        updatedSettings = await db.settings.create({
          data: { ...settingsChanges, providerId: auth.providerId },
        });
      }
    }

    return NextResponse.json({
      success: true,
      provider: updatedProvider,
      settings: updatedSettings,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[providers/me PATCH]", error);
    const msg = error instanceof Error ? error.message : "Failed to update organization info";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
