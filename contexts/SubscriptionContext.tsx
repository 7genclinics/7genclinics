"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSubscriptionSnapshot } from "@/lib/subscription/api";
import type { SubscriptionSnapshot } from "@/lib/subscription/types";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";

interface SubscriptionContextValue {
  snapshot: SubscriptionSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const refresh = useCallback(async () => {
    if (!snapshotRef.current) setLoading(true);
    try {
      const next = await getSubscriptionSnapshot();
      setSnapshot(next);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load subscription"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("clinic-subscription")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_subscriptions" },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_subscription_payments" },
        () => {
          void refresh();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ snapshot, loading, error, refresh }),
    [snapshot, loading, error, refresh]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    return {
      snapshot: null,
      loading: false,
      error: null,
      refresh: async () => undefined,
    } satisfies SubscriptionContextValue;
  }
  return ctx;
}
