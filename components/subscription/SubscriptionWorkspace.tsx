"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  getSubscriptionPayments,
  submitSubscriptionPayment,
} from "@/lib/subscription/api";
import { uploadSubscriptionProof } from "@/lib/subscription/upload";
import {
  formatBillingCycle,
  formatPkr,
  subscriptionStatusLabel,
  type SubscriptionPayment,
} from "@/lib/subscription/types";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

interface Account {
  id: string;
  method: string;
  account_title: string;
  account_number: string;
  bank_name: string | null;
  iban: string | null;
  instructions: string | null;
}

export function SubscriptionWorkspace({
  userId,
  roleLabel,
}: {
  userId: string;
  roleLabel: string;
}) {
  const { snapshot, loading, refresh } = useSubscription();
  const [history, setHistory] = useState<SubscriptionPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistory(await getSubscriptionPayments());
  }, []);

  useEffect(() => {
    void loadHistory().catch((err) => setError(getErrorMessage(err)));
    void fetch("/api/payment-accounts")
      .then((res) => res.json())
      .then((body) => setAccounts(body.accounts ?? []))
      .catch(() => setAccounts([]));
  }, [loadHistory]);

  useEffect(() => {
    if (snapshot?.plan.id && !planId) setPlanId(snapshot.plan.id);
  }, [snapshot, planId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !planId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const proofUrl = await uploadSubscriptionProof(userId, file);
      await submitSubscriptionPayment({
        planId,
        proofUrl,
        paymentMethod: method,
        notes,
      });
      setFile(null);
      setNotes("");
      setMessage("Proof submitted. Admin will review it shortly.");
      await Promise.all([refresh(), loadHistory()]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit proof"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !snapshot) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const phaseNote =
    snapshot.phase === "frozen"
      ? snapshot.override_active
        ? `Temporary access until ${new Date(snapshot.unfreeze_until ?? "").toLocaleString("en-PK")}.`
        : "Clinic is frozen. This is the only page doctor and reception can use until admin approves payment."
      : snapshot.phase === "grace"
        ? `Grace period until ${snapshot.grace_until}. ${snapshot.days_remaining ?? 0} day(s) left.`
        : snapshot.phase === "renewal"
          ? `${snapshot.days_remaining ?? 0} day(s) left this month. Submit proof to renew.`
          : `Paid through ${snapshot.paid_through}.`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Subscription</h2>
        <p className="text-sm text-muted-foreground">
          Clinic-wide plan for doctor and reception. Pay outside the app, then upload proof here as{" "}
          {roleLabel}.
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

      <Card className={snapshot.frozen ? "border-rose-200 bg-rose-50/40" : ""}>
        <CardHeader>
          <CardTitle className="text-base">Current status</CardTitle>
          <CardDescription>{phaseNote}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-semibold">{snapshot.plan.name}</p>
            <p className="text-xs text-muted-foreground">{formatPkr(snapshot.plan.monthly_amount)} / month</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paying for</p>
            <p className="font-semibold">{formatBillingCycle(snapshot.billing_cycle)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending proof</p>
            <p className="font-semibold">{snapshot.pending ? "Waiting for admin" : "None"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit payment proof</CardTitle>
            <CardDescription>
              Transfer to a clinic account, then upload a screenshot. Status stays pending until admin
              approves.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.pending ? (
              <p className="text-sm text-muted-foreground">
                A proof is already pending for {formatBillingCycle(snapshot.pending.billing_cycle)}. Admin
                will approve or reject it before you can submit another.
              </p>
            ) : (
              <form className="space-y-3" onSubmit={(e) => void submit(e)}>
                <div className="space-y-1">
                  <Label>Package</Label>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  >
                    {snapshot.plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {formatPkr(plan.monthly_amount)}
                      </option>
                    ))}
                  </select>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {(snapshot.plans.find((p) => p.id === planId) ?? snapshot.plan).features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {accounts.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
                    <p className="font-medium">Pay to</p>
                    {accounts.map((acc) => (
                      <p key={acc.id}>
                        {acc.account_title} · {acc.account_number}
                        {acc.bank_name ? ` · ${acc.bank_name}` : ""}
                      </p>
                    ))}
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Payment method used</Label>
                  <Input
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    placeholder="Bank transfer, JazzCash, EasyPaisa…"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Screenshot</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Note (optional)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Transaction ID" />
                </div>
                <Button disabled={saving || !file} type="submit">
                  {saving ? "Submitting…" : "Submit proof"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
            <CardDescription>Invoices, dates, and approval or rejection reasons.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <ul className="divide-y">
                {history.map((row) => (
                  <li key={row.id} className="py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {formatBillingCycle(row.billing_cycle)} · {formatPkr(row.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(row.submitted_at).toLocaleString("en-PK")}
                          {row.reviewed_at
                            ? ` · Reviewed ${new Date(row.reviewed_at).toLocaleString("en-PK")}`
                            : ""}
                        </p>
                        {row.status === "rejected" && row.rejection_reason && (
                          <p className="mt-1 text-xs text-rose-700">Reason: {row.rejection_reason}</p>
                        )}
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
                    {row.proof_url && (
                      <a
                        href={row.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-brand-600 hover:underline"
                      >
                        View proof
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
