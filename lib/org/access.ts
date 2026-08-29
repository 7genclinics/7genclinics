/**
 * Tenant access helpers for the app layer.
 * Database RLS is the source of truth; these names match the SQL functions.
 */
export const ORGANIZATION_OPERATOR_ROLES = [
  "owner",
  "admin",
  "receptionist",
] as const;
