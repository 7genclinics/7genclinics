import { NextResponse } from "next/server";
import { searchChatableUsersWithClient } from "@/lib/chat/search-users";
import { createClient } from "@/lib/supabase/server";
import type { ChatParticipant } from "@/types/chat";

const ALLOWED_ROLES: ChatParticipant["role"][] = [
  "patient",
  "doctor",
  "admin",
  "super_admin",
];

function parseRoles(raw: string | null): ChatParticipant["role"][] {
  if (!raw?.trim()) return [];

  const roles = raw
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is ChatParticipant["role"] =>
      ALLOWED_ROLES.includes(role as ChatParticipant["role"]),
    );

  return [...new Set(roles)];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const roles = parseRoles(searchParams.get("roles"));

  if (!query) {
    return NextResponse.json([]);
  }

  if (roles.length === 0) {
    return NextResponse.json({ error: "No searchable roles provided" }, {
      status: 400,
    });
  }

  try {
    const results = await searchChatableUsersWithClient(
      supabase,
      query,
      roles,
      user.id,
    );
    return NextResponse.json(results);
  } catch (error) {
    console.error("chat search-users failed", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
