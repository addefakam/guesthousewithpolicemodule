import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, AuthError } from "@/lib/tenant";
import { checkWritePermission } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// All page keys that can be toggled for OPERATOR/STAFF
// NOTE: 'users' (Account Management) is intentionally NOT in this list —
// the owner must always be able to manage their staff accounts. Removing
// it from the togglable list prevents the system admin from accidentally
// disabling it and locking the owner out of staff management.
const TOGGLABLE_PAGES = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", category: "core" },
  { key: "accommodation", label: "Accommodation", icon: "DoorOpen", category: "core" },
  // 'users' removed — always enabled for owners
  { key: "reports", label: "Reports", icon: "BarChart3", category: "management" },
  { key: "resources", label: "Stock Management", icon: "Package", category: "operations" },
  { key: "expenses", label: "Expenses", icon: "Receipt", category: "operations" },
  { key: "group-bookings", label: "Group Bookings", icon: "Users", category: "operations" },
  { key: "guest-communication", label: "Messages", icon: "MessageSquare", category: "operations" },
  { key: "staff-logs", label: "Staff Activity", icon: "ScrollText", category: "operations" },
  { key: "my-subscription", label: "Subscription", icon: "CreditCard", category: "billing" },
  { key: "settings", label: "Settings", icon: "Settings", category: "core" },
];

/**
 * GET /api/operator-features
 * Returns all togglable pages and which are currently disabled.
 * OPERATOR/STAFF can read (to know their own nav), SUPERUSER can read + write.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (auth.role !== "SUPERUSER" && auth.role !== "OPERATOR" && auth.role !== "STAFF") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const config = await db.policeAlertConfig.findFirst();
    let disabledPages: string[] = [];
    try {
      disabledPages = config?.disabledOperatorPages
        ? JSON.parse(config.disabledOperatorPages)
        : [];
    } catch {
      disabledPages = [];
    }

    // Filter out any page keys that are no longer in TOGGLABLE_PAGES
    // (e.g. 'users' was removed from the togglable list but might still
    // be in the stored config from a previous version). This ensures
    // the owner always sees Account Management even if it was disabled
    // before the key was removed.
    const validKeys = new Set(TOGGLABLE_PAGES.map((p) => p.key));
    disabledPages = disabledPages.filter((k) => validKeys.has(k));

    // OPERATOR/STAFF only need the disabled list (not the full catalog)
    if (auth.role !== "SUPERUSER") {
      return NextResponse.json({ disabledPages });
    }

    return NextResponse.json({
      pages: TOGGLABLE_PAGES.map((p) => ({
        ...p,
        enabled: !disabledPages.includes(p.key),
      })),
      disabledPages,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[operator-features] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/operator-features
 * SUPERUSER only — updates the list of disabled operator pages.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    checkWritePermission(auth, { allowSuperuser: true });

    const body = await req.json();
    const { disabledPages } = body as { disabledPages?: string[] };

    if (!Array.isArray(disabledPages)) {
      return NextResponse.json(
        { error: "disabledPages must be an array of page keys" },
        { status: 400 },
      );
    }

    // Validate: only allow known page keys
    const validKeys = new Set(TOGGLABLE_PAGES.map((p) => p.key));
    const invalid = disabledPages.filter((k) => !validKeys.has(k));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown page keys: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }

    // Dashboard cannot be disabled
    if (disabledPages.includes("dashboard")) {
      return NextResponse.json(
        { error: "Dashboard cannot be disabled" },
        { status: 400 },
      );
    }

    const jsonValue = JSON.stringify(disabledPages);

    // Upsert: find existing config row or create one
    const existing = await db.policeAlertConfig.findFirst();
    if (existing) {
      await db.policeAlertConfig.update({
        where: { id: existing.id },
        data: { disabledOperatorPages: jsonValue },
      });
    } else {
      await db.policeAlertConfig.create({
        data: { disabledOperatorPages: jsonValue },
      });
    }

    return NextResponse.json({ success: true, disabledPages });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error && error.message.includes("cannot perform")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[operator-features] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
