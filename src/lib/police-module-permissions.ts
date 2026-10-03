/**
 * Police permission helper — checks if a POLICE user has the required
 * module permission. Returns a user-friendly error message if not.
 *
 * Usage in API routes:
 *   import { checkPolicePermission } from "@/lib/police-permissions";
 *
 *   requirePolice(auth);
 *   const permError = checkPolicePermission(auth, "police_reports");
 *   if (permError) return NextResponse.json({ error: permError }, { status: 403 });
 *
 * SUPERUSER always passes (full access).
 * POLICE users with no police_* permissions at all always pass (backwards
 * compatibility — existing police accounts without module permissions
 * see everything).
 */
import type { AuthContext } from "@/lib/tenant";

export function checkPolicePermission(
  auth: AuthContext,
  requiredPermission: string
): string | null {
  // SUPERUSER always has full access
  if (auth.role === "SUPERUSER") return null;

  // Only check POLICE users
  if (auth.role !== "POLICE") return null;

  // If the user has NO police_* permissions at all, allow all
  // (backwards compatibility — existing accounts created before this
  // feature was added don't have police_* permissions)
  const hasAnyPolicePerms = auth.permissions.some((p) => p.startsWith("police_"));
  if (!hasAnyPolicePerms) return null;

  // Check if the user has the required permission
  if (!auth.permissions.includes(requiredPermission)) {
    return `You don't have access to this module. Required permission: ${requiredPermission}. Please contact your administrator.`;
  }

  return null;
}
