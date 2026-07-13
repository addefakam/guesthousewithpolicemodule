import { NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "POLICE" | "SUPERUSER" | "OPERATOR" | "STAFF";

interface AuthContext {
  role: UserRole | null;
  providerId: string | null;
  isPolice: boolean;
  isSuperuser: boolean;
  isOperator: boolean;
  isStaff: boolean;
  isProvider: boolean;
}

// ─── Role Permission Matrix ──────────────────────────────────────────────────
// POLICE   : read-only city-wide + provider management (approve/reject/suspend)
// SUPERUSER: manage all users + settings + reports + rooms. NO guest ops, NO housekeeping/expenses/resources
// OPERATOR  : manage users + settings + rooms + housekeeping + expenses + resources + reports. NO guest ops
// STAFF     : configurable permissions (default: reservations + guests). Controlled by admin.

const ROLE_PERMISSIONS: Record<UserRole, {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageProviders: boolean;
  canExportData: boolean;
  canImportData: boolean;
}> = {
  POLICE: {
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canManageSettings: false,
    canManageProviders: true,
    canExportData: false,
    canImportData: false,
  },
  SUPERUSER: {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,   // can manage ALL user types
    canManageSettings: true,
    canManageProviders: false,
    canExportData: true,
    canImportData: true,
  },
  OPERATOR: {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,   // can manage users for their provider
    canManageSettings: true,
    canManageProviders: false,
    canExportData: false,
    canImportData: false,
  },
  STAFF: {
    canCreate: true,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canManageSettings: false,
    canManageProviders: false,
    canExportData: false,
    canImportData: false,
  },
};

// ─── Core Auth Functions ────────────────────────────────────────────────────

export function getAuthContext(request: Request): AuthContext {
  const role = (request.headers.get("x-user-role") as UserRole) || null;
  const providerId = request.headers.get("x-provider-id");
  const isPolice = role === "POLICE";
  return {
    role,
    providerId: isPolice ? null : (providerId || null),
    isPolice,
    isSuperuser: role === "SUPERUSER",
    isOperator: role === "OPERATOR",
    isStaff: role === "STAFF",
    isProvider: !isPolice && !!role,
  };
}

export function getProviderFilter(request: Request): { providerId: string | null; isPolice: boolean } {
  const ctx = getAuthContext(request);
  return { providerId: ctx.providerId, isPolice: ctx.isPolice };
}

// ─── RBAC Guard Functions ───────────────────────────────────────────────────

/** Require POLICE role */
export function requirePolice(request: Request): NextResponse | null {
  const ctx = getAuthContext(request);
  if (!ctx.isPolice) {
    return NextResponse.json({ error: "Access denied. Police role required." }, { status: 403 });
  }
  return null;
}

/** Block POLICE from write operations */
export function blockPoliceWrites(request: Request, method: string): NextResponse | null {
  const ctx = getAuthContext(request);
  if (ctx.isPolice && method !== "GET") {
    return NextResponse.json(
      { error: "Police users have read-only access to provider data." },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Check if current role can perform a write action.
 *
 * Options:
 *   requireSuperuserOrOperator — only SUPERUSER or OPERATOR can do this (users, settings)
 *   blockSuperuser             — SUPERUSER cannot access (housekeeping, expenses, resources)
 *   staffOnlyWrite             — only STAFF can write (guest operations: reservations, guests, payments)
 *   staffCanCreate             — STAFF can also POST on this route (legacy)
 *   staffPermissionKey         — permission key to check for STAFF users (e.g. "housekeeping")
 *                                When set, STAFF with this permission in x-user-permissions header
 *                                can do full CRUD on the route (applies to both blockSuperuser
 *                                and staffOnlyWrite routes).
 */
export function checkWritePermission(
  request: Request,
  method: string,
  options?: {
    requireSuperuserOrOperator?: boolean;
    blockSuperuser?: boolean;
    staffOnlyWrite?: boolean;
    staffCanCreate?: boolean;
    staffPermissionKey?: string;
  }
): NextResponse | null {
  if (method === "GET") return null;

  const ctx = getAuthContext(request);

  if (ctx.isPolice) {
    return NextResponse.json({ error: "Access denied. Police users cannot modify this data." }, { status: 403 });
  }

  if (!ctx.role) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // ── Parse STAFF permissions from header ──
  let staffPermissions: string[] = [];
  if (ctx.isStaff) {
    const permHeader = request.headers.get("x-user-permissions") || "[]";
    try { staffPermissions = JSON.parse(permHeader); } catch { staffPermissions = []; }
  }
  const staffHasPerm = options?.staffPermissionKey
    ? staffPermissions.includes(options.staffPermissionKey)
    : false;

  // ── Staff-only write routes (guest operations: reservations, guests, payments, checkin/out) ──
  // Both SUPERUSER and OPERATOR are blocked; only STAFF with permission can write
  if (options?.staffOnlyWrite) {
    if (ctx.isSuperuser) {
      return NextResponse.json(
        { error: "Access denied. Admins cannot perform guest operations. Assign this task to a Staff member." },
        { status: 403 }
      );
    }
    if (ctx.isOperator) {
      return NextResponse.json(
        { error: "Access denied. Operators cannot perform guest operations. Assign this task to a Staff member." },
        { status: 403 }
      );
    }
    // STAFF with matching permission: allow full CRUD
    if (ctx.isStaff && staffHasPerm) return null;
    // STAFF with legacy staffCanCreate: allow POST only
    if (ctx.isStaff && options?.staffCanCreate && method === "POST") return null;
    // STAFF without permission: blocked
    if (ctx.isStaff) {
      return NextResponse.json(
        { error: "Access denied. You do not have permission for this action." },
        { status: 403 }
      );
    }
  }

  // ── Block SUPERUSER from operational routes (housekeeping, expenses, resources) ──
  if (options?.blockSuperuser && ctx.isSuperuser) {
    return NextResponse.json(
      { error: "Access denied. Admins cannot perform this operation. Assign this task to an Operator or Staff member." },
      { status: 403 }
    );
  }

  // ── Superuser-or-Operator-only actions (user management, settings) ──
  if (options?.requireSuperuserOrOperator && !ctx.isSuperuser && !ctx.isOperator) {
    return NextResponse.json(
      { error: "Access denied. Only admins and operators can perform this action." },
      { status: 403 }
    );
  }

  // ── Legacy: requireSuperuser (kept for backward compat) ──
  if (options?.requireSuperuser && !ctx.isSuperuser) {
    return NextResponse.json(
      { error: "Access denied. Only the primary admin can perform this action." },
      { status: 403 }
    );
  }

  // ── STAFF on operational routes (blockSuperuser): need permission for full CRUD ──
  if (ctx.isStaff) {
    if (staffHasPerm) return null;
    // Legacy: staffCanCreate allows POST without specific permission
    if (options?.staffCanCreate && method === "POST") return null;
    // All other STAFF writes blocked
    return NextResponse.json(
      { error: "Access denied. You do not have permission for this action." },
      { status: 403 }
    );
  }

  // ── Operator/Superuser general CRUD checks ──
  const perms = ROLE_PERMISSIONS[ctx.role];
  if (method === "POST" && !perms.canCreate) {
    return NextResponse.json({ error: "Access denied. You cannot create records." }, { status: 403 });
  }
  if (method === "PUT" && !perms.canUpdate) {
    return NextResponse.json({ error: "Access denied. You cannot update records." }, { status: 403 });
  }
  if (method === "DELETE" && !perms.canDelete) {
    return NextResponse.json({ error: "Access denied. You cannot delete records." }, { status: 403 });
  }

  return null;
}