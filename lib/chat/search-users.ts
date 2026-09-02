import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  getPersonSearchWords,
  matchesPersonName,
} from "@/lib/public/doctor-filters";
import type { ChatParticipant } from "@/types/chat";

type ChatableRole = ChatParticipant["role"];

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function pickProfileSearchWords(words: string[]): string[] {
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
    .limit(200);

  if (error) throw error;

  const matches: ChatParticipant[] = [];
  for (const row of data ?? []) {
    const profile = normalizeJoinedProfile(row.profile);
    if (!profile || profile.is_active === false) continue;
    if (!matchesPersonName(profile.full_name, query)) continue;
    matches.push({
      id: profile.id,
      full_name: profile.full_name,
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
  const words = pickProfileSearchWords(getPersonSearchWords(query));
  const merged = new Map<string, ChatParticipant>();

  await Promise.all(
    words.map(async (word) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("role", roles)
        .eq("is_active", true)
        .ilike("full_name", `%${escapeIlikePattern(word)}%`)
        .limit(50);

      if (error) throw error;

      for (const row of data ?? []) {
        const participant = row as ChatParticipant;
        if (!matchesPersonName(participant.full_name, query)) continue;
        merged.set(participant.id, participant);
      }
    }),
  );

  return [...merged.values()];
}

export async function searchChatableUsersWithClient(
  supabase: SupabaseClient<Database>,
  query: string,
  roles: ChatableRole[],
  excludeUserId?: string,
): Promise<ChatParticipant[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const merged = new Map<string, ChatParticipant>();
  const nonDoctorRoles = roles.filter((role) => role !== "doctor");

  if (roles.includes("doctor")) {
    for (const doctor of await searchApprovedDoctors(supabase, trimmed)) {
      merged.set(doctor.id, doctor);
    }
  }

  if (nonDoctorRoles.length > 0) {
    for (const profile of await searchProfilesByRole(
      supabase,
      trimmed,
      nonDoctorRoles,
    )) {
      merged.set(profile.id, profile);
    }
  }

  return [...merged.values()]
    .filter((profile) => profile.id !== excludeUserId)
    .slice(0, 20);
}
