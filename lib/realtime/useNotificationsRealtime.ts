"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/notifications/api";

interface Options {
  userId: string;
  /** Called with the new notification row whenever one is inserted. */
  onNew: (notification: AppNotification) => void;
  /** Called when a notification row is updated (e.g. marked read elsewhere). */
  onUpdate?: (notification: AppNotification) => void;
  /** Called after (re)subscribe succeeds — use to resync missed events. */
  onResync?: () => void;
  enabled?: boolean;
}

/**
 * Subscribes to realtime INSERT/UPDATE events on the notifications table,
 * filtered to the authenticated user's own rows.
 * Reconnects automatically on channel errors and when the tab becomes visible.
 */
export function useNotificationsRealtime({
  userId,
  onNew,
  onUpdate,
  onResync,
  enabled = true,
}: Options) {
  const onNewRef = useRef(onNew);
  const onUpdateRef = useRef(onUpdate);
  const onResyncRef = useRef(onResync);
  onNewRef.current = onNew;
  onUpdateRef.current = onUpdate;
  onResyncRef.current = onResync;

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(
    null
  );
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedOnceRef = useRef(false);

  const cleanupChannel = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const channel = channelRef.current;
    channelRef.current = null;
    if (channel) {
      const supabase = createClient();
      void supabase.removeChannel(channel);
    }
  }, []);

  const subscribe = useCallback(() => {
    if (!enabled || !userId) return;

    cleanupChannel();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNewRef.current(payload.new as AppNotification);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdateRef.current?.(payload.new as AppNotification);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Resync after first subscribe and every successful reconnect.
          if (subscribedOnceRef.current) {
            onResyncRef.current?.();
          }
          subscribedOnceRef.current = true;
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            subscribe();
          }, 2500);
        }
      });

    channelRef.current = channel;
  }, [userId, enabled, cleanupChannel]);

  useEffect(() => {
    subscribedOnceRef.current = false;
    subscribe();
    return cleanupChannel;
  }, [subscribe, cleanupChannel]);

  // When the tab/PWA returns to foreground, force a fresh subscription + resync.
  useEffect(() => {
    if (!enabled || !userId) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      onResyncRef.current?.();
      subscribe();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, userId, subscribe]);
}
