import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  getFlexibleSearchWords,
  matchesPersonName,
} from "@/lib/search/flexible-match";
import type { ChatParticipant } from "@/types/chat";

type ChatableRole = ChatParticipant["role"];

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function pickSearchWords(query: string): string[] {
  const words = getFlexibleSearchWords(query);
  // Prefer meaningful tokens, but keep short ones if that is all we have.
  const meaningful = words.filter((word) => word.length >= 2);
  return meaningful.length > 0 ? meaningful : words;
}

function normalizeJoinedProfile(
  profile: unknown,
): (ChatParticipant & { is_active?: boolean }) | null {
  const row = Array.isArray(profile) ? profile[0] : profile;
  if (!row || typeof row !== "object") return null;

  const { id, full_name, avatar_url, role, is_active } = row as {
    id?: string;
    full_name?: string;
    avatar_url?: string | null;
    role?: string;
    is_active?: boolean;
  };

  if (!id || !full_name || !role) return null;

  return {
    id,
    full_name,
    avatar_url: avatar_url ?? null,
    role: role as ChatableRole,
    is_active,
  };
}

async function getApprovedDoctorUserIds(
  supabase: SupabaseClient<Database>,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select("user_id")
    .eq("status", "approved")
    .limit(500);

  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((row) => row.user_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
}

async function searchApprovedDoctors(
  supabase: SupabaseClient<Database>,
  query: string,
): Promise<ChatParticipant[]> {
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(
      "profile:profiles!doctor_profiles_user_id_fkey(id, full_name, avatar_url, role, is_active)",
    )
    .eq("status", "approved")
    .limit(500);

  if (error) throw error;

  const matches: ChatParticipant[] = [];
  for (const row of data ?? []) {
    const profile = normalizeJoinedProfile(row.profile);
    if (!profile || profile.is_active === false) continue;
    if (!matchesPersonName(profile.full_name, query)) continue;
    matches.push({
      id: profile.id,
      full_name: profile.full_name.trim(),
      avatar_url: profile.avatar_url,
      role: "doctor",
    });
  }

  return matches;
}

async function searchProfilesByRole(
  supabase: SupabaseClient<Database>,
  query: string,
  roles: ChatableRole[],
): Promise<ChatParticipant[]> {
  const words = pickSearchWords(query);
  if (words.length === 0 || roles.length === 0) return [];

  const orFilter = words
    .map((word) => `full_name.ilike.%${escapeIlikePattern(word)}%`)
    .join(",");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("role", roles)
    .eq("is_active", true)
    .or(orFilter)
    .limit(100);

  if (error) throw error;

  return ((data ?? []) as ChatParticipant[]).filter((profile) =>
    matchesPersonName(profile.full_name, query),
  );
}

export async function searchChatableUsersWithClient(
  supabase: SupabaseClient<Database>,
  query: string,
  roles: ChatableRole[],
  excludeUserId?: string,
): Promise<ChatParticipant[]> {
  const trimmed = query.trim();
  if (!trimmed || roles.length === 0) return [];

  const merged = new Map<string, ChatParticipant>();
  const wantsDoctors = roles.includes("doctor");
  const nonDoctorRoles = roles.filter((role) => role !== "doctor");

  if (wantsDoctors) {
    // Path 1: approved doctors via doctor_profiles (RLS-friendly public directory path)
    try {
      for (const doctor of await searchApprovedDoctors(supabase, trimmed)) {
        merged.set(doctor.id, doctor);
      }
    } catch (error) {
      console.error("chat doctor_profiles search failed", error);
    }

    // Path 2: profiles fallback + approval filter (covers join/RLS edge cases)
    if (merged.size === 0) {
      try {
        const [approvedIds, profiles] = await Promise.all([
          getApprovedDoctorUserIds(supabase),
          searchProfilesByRole(supabase, trimmed, ["doctor"]),
        ]);
        for (const profile of profiles) {
          if (!approvedIds.has(profile.id)) continue;
          merged.set(profile.id, { ...profile, full_name: profile.full_name.trim() });
        }
      } catch (error) {
        console.error("chat doctor profiles fallback search failed", error);
      }
    }
  }

  if (nonDoctorRoles.length > 0) {
    for (const profile of await searchProfilesByRole(
      supabase,
      trimmed,
      nonDoctorRoles,
    )) {
      merged.set(profile.id, {
        ...profile,
        full_name: profile.full_name.trim(),
      });
    }
  }

  return [...merged.values()]
    .filter((profile) => profile.id !== excludeUserId)
    .slice(0, 20);
}
