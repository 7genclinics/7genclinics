import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseKey, getSupabaseUrl } from "./env";

/**
 * Supabase client for Route Handlers. Auth token refresh must be copied onto
 * the outgoing NextResponse; otherwise getUser() looks signed-out on the next
 * request and the video page sends people back to login.
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  const pending: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pending.push({ name, value, options });
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Next may block cookie writes until we attach them to the response.
          }
        });
      },
    },
  });

  function json<T>(body: T, init?: ResponseInit) {
    const response = NextResponse.json(body, init);
    for (const cookie of pending) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  }

  return { supabase, json };
}
