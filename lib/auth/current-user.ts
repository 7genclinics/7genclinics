import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const EXPIRY_SKEW_SECONDS = 60;

/**
 * Resolve the signed-in user, refreshing the access token when it is missing
 * or about to expire. Access tokens last about an hour; refresh tokens last
 * much longer. Callers must not treat a stale JWT as a hard logout.
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const expiresAt = session?.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = !session?.user || expiresAt <= now + EXPIRY_SKEW_SECONDS;

  if (needsRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.user) {
      return data.session.user;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  }

  return session.user;
}
