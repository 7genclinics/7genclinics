import type { Profile } from "@/types";
import type { Database } from "@/types/database";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/** Fields end users must never self-write. Role changes go through admin/staff RPCs. */
const BLOCKED_SELF_UPDATE_KEYS = [
  "id",
  "email",
  "role",
  "account_status",
  "is_active",
  "approved_by",
  "approved_at",
  "rejection_reason",
  "created_at",
] as const;

/**
 * Strip privileged profile columns so client updates cannot escalate role
 * or mutate account status even if a caller spreads a full Profile object.
 */
export function sanitizeSelfProfileUpdate(
  updates: Partial<Profile> | ProfileUpdate
): ProfileUpdate {
  const next: Record<string, unknown> = { ...updates };
  for (const key of BLOCKED_SELF_UPDATE_KEYS) {
    delete next[key];
  }
  return next as ProfileUpdate;
}
