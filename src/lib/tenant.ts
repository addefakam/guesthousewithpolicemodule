import { NextRequest } from "next/server";
import { verifyToken, type JWTPayload } from "@/lib/auth-utils";

export interface AuthContext {
  userId: string;
  role: string;
  providerId: string | null;
  permissions: string[];
  policeRank: string;
  userName: string;
  // ── Police jurisdiction ──
  jurisdictionType: string;  // CITY | SUBCITY | WOREDA
  subCity?: string | null;
  woreda?: string | null;
  // Raw JWT payload for reference
  token: JWTPayload;
}

/**
 * Server-side auth: reads JWT from httpOnly cookie and verifies it.
 * No header-based fallback — JWT is the only source of truth.
 * Throws on missing/invalid token so the API route returns 401.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const token = req.cookies.get("ghms_token")?.value;

  if (!token) {
    throw new AuthError("Not authenticated", 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    throw new AuthError("Invalid or expired session", 401);
  }

  return {
    userId: payload.userId,
    role: payload.role,
    providerId: payload.providerId,
    permissions: payload.permissions,
    policeRank: payload.policeRank,
    userName: payload.name,
    jurisdictionType: payload.jurisdictionType || "CITY",
    subCity: payload.subCity || null,
    woreda: payload.woreda || null,
    token: payload,
  };
}

/**
 * Thrown when authentication fails. API routes should catch this
 * and return a 401 with the message.
 */
export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export function getProviderFilter(auth: AuthContext) {
  if (auth.role === "POLICE") {
    return { isPolice: true, providerId: undefined as undefined };
  }
  return { isPolice: false, providerId: auth.providerId || undefined };
}

export function requirePolice(auth: AuthContext): void {
  // POLICE accounts and the system admin (SUPERUSER — the police
  // department's admin, no provider) may both use the police app.
  if (auth.role !== "POLICE" && auth.role !== "SUPERUSER") {
    throw new Error("Police access required");
  }
}

/**
 * Get a jurisdiction filter for Provider queries.
 *
 * - CITY level → returns {} (no filter, sees all providers)
 * - SUBCITY level → returns { subCity: auth.subCity }
 * - WOREDA level → returns { subCity: auth.subCity, woreda: auth.woreda }
 *
 * This filter should be spread into the `where` clause of any
 * Prisma query that fetches Provider-scoped data (reservations,
 * guests, rooms, etc.) when the caller is POLICE.
 *
 * SUPERUSER always gets CITY-level access (sees everything).
 */
export function getJurisdictionFilter(auth: AuthContext): Record<string, unknown> {
  // SUPERUSER always has full city access
  if (auth.role === "SUPERUSER") return {};

  // POLICE — filter by jurisdiction
  if (auth.role === "POLICE") {
    const jt = auth.jurisdictionType || "CITY";
    if (jt === "CITY") return {};
    if (jt === "SUBCITY" && auth.subCity) {
      return { subCity: auth.subCity };
    }
    if (jt === "WOREDA" && auth.subCity && auth.woreda) {
      return { subCity: auth.subCity, woreda: auth.woreda };
    }
  }

  // Default: no filter (shouldn't reach here for non-police)
  return {};
}

export function blockPoliceWrites(auth: AuthContext): void {
  if (auth.role === "POLICE") throw new Error("Police cannot write data");
}

interface PermissionOptions {
  staffOnlyWrite?: boolean;
  requireSuperuserOrOperator?: boolean;
  requireOperator?: boolean;
  allowSuperuser?: boolean;
  blockSuperuser?: boolean;
  staffPermissionKey?: string;
  staffCanCreate?: boolean;
}

export function checkWritePermission(
  auth: AuthContext,
  opts: PermissionOptions = {}
): void {
  if (auth.role === "POLICE") throw new Error("Police cannot perform this action");

  if (auth.role === "SUPERUSER") {
    if (opts.allowSuperuser) return;
    if (opts.blockSuperuser) {
      throw new Error("Owners cannot perform this action. Contact your operator for assistance.");
    }
    throw new Error("Owners cannot perform this action. Contact your operator for assistance.");
  }

  if (opts.requireOperator || opts.requireSuperuserOrOperator) {
    if (auth.role !== "OPERATOR") {
      throw new Error("Operator access required");
    }
    return;
  }

  if (auth.role === "STAFF") {
    if (opts.staffOnlyWrite) {
      throw new Error("Staff read-only for this section");
    }
    if (opts.staffPermissionKey) {
      const has = auth.permissions.includes(opts.staffPermissionKey);
      if (!has) {
        if (!opts.staffCanCreate) {
          throw new Error(`Staff lacks '${opts.staffPermissionKey}' permission`);
        }
      }
    } else {
      throw new Error("Staff cannot perform this action");
    }
  }
}
