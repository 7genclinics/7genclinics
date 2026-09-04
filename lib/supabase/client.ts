import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseKey, getSupabaseUrl } from "./env";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * One browser client per tab. Creating a new client on every call races
 * refresh-token rotation and looks like a logout after the JWT expires.
 */
export function createClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseKey());
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseKey());
  }

  return browserClient;
}
