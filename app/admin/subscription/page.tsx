"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  getSubscriptionPayments,
  reviewSubscriptionPayment,
  unfreezeSubscription,
  updateSubscriptionPlan,
} from "@/lib/subscription/api";
import {
  formatBillingCycle,
  formatPkr,
  subscriptionStatusLabel,
  type SubscriptionPayment,
  type SubscriptionPlan,
} from "@/lib/subscription/types";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

export default function AdminSubscriptionPage() {
  const { snapshot, loading, refresh } = useSubscription();
  const [rows, setRows] = useState<SubscriptionPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("3");
  const [planDrafts, setPlanDrafts] = useState<SubscriptionPlan[]>([]);

  const load = useCallback(async () => {
    setRows(await getSubscriptionPayments());
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(getErrorMessage(err)));
  }, [load]);

  useEffect(() => {
    if (snapshot?.plans.length) setPlanDrafts(snapshot.plans);
  }, [snapshot]);

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(ok);
      await Promise.all([refresh(), load()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !snapshot) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Subscription</h2>
        <p className="text-sm text-muted-foreground">
          Review clinic payment proofs, unfreeze access, and keep the two standard packages in sync
          for every clinic.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinic status</CardTitle>
          <CardDescription>
            {snapshot.frozen
              ? "Frozen — doctor and reception can only open Subscription until you approve proof."
              : snapshot.override_active
                ? `Temporary access until ${new Date(snapshot.unfreeze_until ?? "").toLocaleString("en-PK")}.`
                : `Active. Paid through ${snapshot.paid_through}. Phase: ${snapshot.phase}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Unfreeze for (days)</Label>
            <Input
              className="w-28"
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void act(
                async () => {
                  await unfreezeSubscription(Number(days));
                },
                "Clinic unfrozen for the selected days."
              )
            }
          >
            Unfreeze without payment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending proofs ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proofs waiting.</p>
          ) : (
            pending.map((row) => (
              <div key={row.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {formatBillingCycle(row.billing_cycle)} · {formatPkr(row.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.submitted_at).toLocaleString("en-PK")}
                      {row.payment_method ? ` · ${row.payment_method}` : ""}
                    </p>
                    {row.notes && <p className="text-xs">{row.notes}</p>}
                  </div>
                  <a href={row.proof_url} target="_blank" rel="noreferrer" className="text-sm text-brand-600">
                    Open screenshot
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await reviewSubscriptionPayment({ paymentId: row.id, approve: true });
                      }, "Approved. Clinic is active for the billing cycle.")
                    }
                  >
                    Approve
                  </Button>
                  {rejectId === row.id ? (
                    <div className="flex flex-1 flex-wrap gap-2">
                      <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Rejection reason"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            await reviewSubscriptionPayment({
                              paymentId: row.id,
                              approve: false,
                              rejectionReason: reason,
                            });
                            setRejectId(null);
                            setReason("");
                          }, "Rejected. Clinic staff can submit again.")
                        }
                      >
                        Confirm reject
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setRejectId(row.id)}>
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard packages</CardTitle>
          <CardDescription>Two fixed tiers for every clinic. Amounts apply globally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {planDrafts.map((plan, index) => (
            <form
              key={plan.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await updateSubscriptionPlan({
                    ...plan,
                    features: plan.features,
                  });
                }, `${plan.name} saved.`);
              }}
            >
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={plan.name}
                  onChange={(e) => {
                    const next = [...planDrafts];
                    next[index] = { ...plan, name: e.target.value };
                    setPlanDrafts(next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Monthly amount (PKR)</Label>
                <Input
                  type="number"
                  min={1}
                  value={plan.monthly_amount}
                  onChange={(e) => {
                    const next = [...planDrafts];
                    next[index] = { ...plan, monthly_amount: Number(e.target.value) };
                    setPlanDrafts(next);
                  }}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={plan.description}
                  onChange={(e) => {
                    const next = [...planDrafts];
                    next[index] = { ...plan, description: e.target.value };
                    setPlanDrafts(next);
                  }}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Features (one per line)</Label>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={plan.features.join("\n")}
                  onChange={(e) => {
                    const next = [...planDrafts];
                    next[index] = { ...plan, features: e.target.value.split("\n") };
                    setPlanDrafts(next);
                  }}
                />
              </div>
              <Button disabled={busy} type="submit">
                Save {plan.id}
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {formatBillingCycle(row.billing_cycle)} · {formatPkr(row.amount)}
                  {row.rejection_reason ? ` · ${row.rejection_reason}` : ""}
                </span>
                <span className="text-xs">{subscriptionStatusLabel(row.status)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
