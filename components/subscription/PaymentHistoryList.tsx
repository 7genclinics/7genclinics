"use client";

import {
  formatBillingCycle,
  formatPkr,
  subscriptionStatusLabel,
  type SubscriptionPayment,
} from "@/lib/subscription/types";

export function PaymentHistoryList({ rows }: { rows: SubscriptionPayment[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payment history yet.</p>;
  }

  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.id} className="py-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {formatBillingCycle(row.billing_cycle)} · {formatPkr(row.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.plan_name ? `${row.plan_name} · ` : ""}
                Submitted {new Date(row.submitted_at).toLocaleString("en-PK")}
                {row.reviewed_at ? ` · Reviewed ${new Date(row.reviewed_at).toLocaleString("en-PK")}` : ""}
              </p>
              {row.payment_method && row.payment_method !== "opening" && (
                <p className="text-xs text-muted-foreground">Method: {row.payment_method}</p>
              )}
              {row.notes && <p className="mt-1 text-xs text-muted-foreground">{row.notes}</p>}
              {row.status === "rejected" && row.rejection_reason && (
                <p className="mt-1 text-xs text-rose-700">Reason: {row.rejection_reason}</p>
              )}
              {row.proof_url ? (
                <a
                  href={row.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-brand-600 hover:underline"
                >
                  View proof
                </a>
              ) : null}
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                row.status === "approved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : row.status === "rejected"
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {subscriptionStatusLabel(row.status)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
