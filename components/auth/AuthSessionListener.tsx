"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/pending-review"];

/**
 * Keeps the session alive when the tab is backgrounded (JWT ~1 hour),
 * and only leaves the portal on a real sign-out.
 */
export function AuthSessionListener() {
  useEffect(() => {
    const supabase = createClient();

    const resumeSession = () => {
      void supabase.auth.startAutoRefresh();
      void supabase.auth.refreshSession();
    };

    resumeSession();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resumeSession();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", resumeSession);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        return;
      }
      if (event !== "SIGNED_OUT") return;

      const path = window.location.pathname;
      const isPublic = PUBLIC_PATHS.some(
        (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
      );
      if (!isPublic) {
        window.location.replace("/login");
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", resumeSession);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
