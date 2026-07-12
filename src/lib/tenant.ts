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
  isProvider: boolean; // any non-police role
}

// ─── Role Permission Matrix ──────────────────────────────────────────────────
// POLICE   : read-only city-wide + provider management (approve/reject/suspend)
// SUPERUSER: full CRUD on own provider + manage users + settings
// OPERATOR  : CRUD on rooms, reservations, guests, daytime, housekeeping, expenses
// STAFF     : read-only on most things, can create reservations & guests

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
    canManageProviders: true,  // approve/reject/suspend
    canExportData: false,
    canImportData: false,
  },
  SUPERUSER: {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageSettings: true,
    canManageProviders: false,
    canExportData: true,
    canImportData: true,
  },
  OPERATOR: {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: false,
    canManageSettings: false,
    canManageProviders: false,
    canExportData: false,
    canImportData: false,
  },
  STAFF: {
    canCreate: true,   // can create reservations & guests only (enforced per-route)
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

/** Extract auth context from request headers */
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

/** Get provider-scoped where clause. Police get null (see all), providers get their own id */
export function getProviderFilter(request: Request): { providerId: string | null; isPolice: boolean } {
  const ctx = getAuthContext(request);
  return { providerId: ctx.providerId, isPolice: ctx.isPolice };
}

// ─── RBAC Guard Functions ───────────────────────────────────────────────────

/** Require POLICE role — returns 403 if not police */
export function requirePolice(request: Request): NextResponse | null {
  const ctx = getAuthContext(request);
  if (!ctx.isPolice) {
    return NextResponse.json({ error: "Access denied. Police role required." }, { status: 403 });
  }
  return null;
}

/** Block POLICE from write operations (POST/PUT/DELETE) on provider data */
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

/** Block SUPERUSER from guest operation endpoints (reservations, guests, payments, checkin/checkout) */
export function blockSuperuserGuestOps(request: Request, method: string): NextResponse | null {
  if (method === "GET") return null; // SUPERUSER can still view guest data
  const ctx = getAuthContext(request);
  if (ctx.isSuperuser) {
    return NextResponse.json(
      { error: "Access denied. Admins cannot perform guest operations. Assign this task to an Operator or Staff member." },
      { status: 403 }
    );
  }
  return null;
}

/** Check if current role can perform a write action */
export function checkWritePermission(
  request: Request,
  method: string,
  options?: {
    requireSuperuser?: boolean;  // only SUPERUSER can do this
    staffCanCreate?: boolean;    // STAFF can also create
  }
): NextResponse | null {
  if (method === "GET") return null; // reads are always allowed (scoped by providerId)

  const ctx = getAuthContext(request);
  if (ctx.isPolice) {
    return NextResponse.json({ error: "Access denied. Police users cannot modify this data." }, { status: 403 });
  }

  if (!ctx.role) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const perms = ROLE_PERMISSIONS[ctx.role];

  // Superuser-only actions (user management, settings)
  if (options?.requireSuperuser && !ctx.isSuperuser) {
    return NextResponse.json(
      { error: "Access denied. Only the primary admin can perform this action." },
      { status: 403 }
    );
  }

  // Block SUPERUSER from guest operations if specified
  if (options?.blockSuperuser && ctx.isSuperuser) {
    return NextResponse.json(
      { error: "Access denied. Admins cannot perform guest operations. Assign this task to an Operator or Staff member." },
      { status: 403 }
    );
  }

  // Staff can only create on specific routes
  if (ctx.isStaff && options?.staffCanCreate && method === "POST") {
    return null;
  }

  // Staff cannot update or delete
  if (ctx.isStaff) {
    return NextResponse.json(
      { error: "Access denied. Staff users have limited permissions." },
      { status: 403 }
    );
  }

  // Operator/Superuser checks
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