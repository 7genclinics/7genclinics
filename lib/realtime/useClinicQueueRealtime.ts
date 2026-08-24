"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Options {
  onChange: () => void;
  doctorId?: string;
  enabled?: boolean;
}

export function useClinicQueueRealtime({ onChange, doctorId, enabled = true }: Options) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`clinic-queue-${doctorId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          ...(doctorId ? { filter: `doctor_id=eq.${doctorId}` } : {}),
        },
        () => callbackRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => callbackRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => callbackRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vitals" },
        () => callbackRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, enabled]);
}
