"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { formatPkr } from "@/lib/subscription/types";

export function SubscriptionReminder({
  portal,
}: {
  portal: "doctor" | "reception";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot } = useSubscription();
  const [open, setOpen] = useState(false);

  const href = portal === "doctor" ? "/doctor/subscription" : "/reception/subscription";

  const shouldPrompt = useMemo(() => {
    if (!snapshot) return false;
    if (snapshot.phase === "ok") return false;
    if (pathname.includes("/subscription")) return false;
    return true;
  }, [snapshot, pathname]);

  useEffect(() => {
    if (!shouldPrompt || !snapshot) {
      setOpen(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (snapshot.phase === "renewal") {
      const key = `sub-reminder-${snapshot.phase}-${today}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
      setOpen(true);
      return;
    }

    if (snapshot.phase === "frozen") {
      setOpen(true);
      return;
    }

    const last = Number(window.sessionStorage.getItem("sub-grace-last") ?? "0");
    const now = Date.now();
    if (now - last < 20 * 60 * 1000) return;
    if (Math.random() > 0.45) return;
    window.sessionStorage.setItem("sub-grace-last", String(now));
    setOpen(true);
  }, [shouldPrompt, snapshot]);

  if (!open || !snapshot) return null;

  const title =
    snapshot.phase === "frozen"
      ? "Clinic access is frozen"
      : snapshot.phase === "grace"
        ? "Grace period — pay to avoid freeze"
        : "Subscription renewal due";

  const body =
    snapshot.phase === "frozen"
      ? "Payment was not received after the 5th. Doctor and reception dashboards stay locked until admin approves your proof."
      : snapshot.phase === "grace"
        ? `The clinic is in a grace window until ${snapshot.grace_until}. ${snapshot.days_remaining ?? 0} day(s) remain.`
        : `Renew by month-end. ${snapshot.days_remaining ?? 0} day(s) remaining. Current plan: ${snapshot.plan.name} (${formatPkr(snapshot.plan.monthly_amount)} / month).`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Subscription</p>
        <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          {snapshot.phase !== "frozen" && (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Later
            </Button>
          )}
          <Button
            onClick={() => {
              setOpen(false);
              router.push(href);
            }}
          >
            Open Subscription
          </Button>
        </div>
      </div>
    </div>
  );
}
