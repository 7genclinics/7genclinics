"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDoctor } from "@/contexts/DoctorContext";
import { getDoctorPayments } from "@/lib/doctor/api";
import { usePaymentsRealtime } from "@/lib/realtime/usePaymentsRealtime";
import { formatCurrency } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import type { PaymentWithPatient } from "@/lib/doctor/types";

export default function DoctorPaymentsPage() {
  const { doctorProfile } = useDoctor();
  const [payments, setPayments] = useState<PaymentWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [review, setReview] = useState<PaymentWithPatient | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await getDoctorPayments(doctorProfile.id);
      setPayments(rows);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load payments"));
    } finally {
      setIsLoading(false);
    }
  }, [doctorProfile.id]);

  useEffect(() => {
    void load();
  }, [load]);

  usePaymentsRealtime({ doctorId: doctorProfile.id, onChange: () => { void load(); } });

  const pending = useMemo(
    () => payments.filter((p) => p.status === "pending" && p.proof_url),
    [payments]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const reviewPayment = async (paymentId: string, action: "approve" | "reject") => {
    setActionId(paymentId);
    setError("");
    try {
      const response = await fetch("/api/doctor/payments/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action, reason }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Review failed");
      setReview(null);
      setReason("");
      showToast(action === "approve" ? "Payment approved. Booking is confirmed." : "Payment proof rejected.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not review payment"));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {toast && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <Check className="h-4 w-4 text-brand-300" />
          {toast}
        </div>
      )}

      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Payment approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the screenshot. Approving confirms the booking and records the full fee as received in your account.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card className="border-violet-200 bg-violet-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-violet-900">Pending proofs ({pending.length})</CardTitle>
          <CardDescription>Only bookings assigned to you appear here.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : pending.length === 0 ? (
            <p className="px-6 py-10 text-sm text-muted-foreground">No payment proofs waiting for review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-violet-200 bg-violet-100/50 text-xs uppercase text-violet-900">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Patient</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Submitted</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100">
                  {pending.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 font-medium">{payment.patient?.full_name ?? "Patient"}</td>
                      <td className="px-6 py-4 font-semibold">{formatCurrency(Number(payment.amount))}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setReview(payment); setReason(""); }}>
                            Review proof
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={actionId === payment.id}
                            onClick={() => reviewPayment(payment.id, "approve")}
                          >
                            {actionId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card p-6">
              <div>
                <h3 className="text-lg font-bold">Review payment proof</h3>
                <p className="text-xs text-muted-foreground">{review.patient?.full_name ?? "Patient"}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setReview(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm font-semibold">{formatCurrency(Number(review.amount))}</p>
              {review.proof_url && (
                <div className="overflow-hidden rounded-lg border bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={review.proof_url} alt="Payment proof" className="max-h-80 w-full object-contain" />
                </div>
              )}
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason if rejecting the proof..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={actionId === review.id}
                  onClick={() => reviewPayment(review.id, "reject")}
                >
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={actionId === review.id}
                  onClick={() => reviewPayment(review.id, "approve")}
                >
                  {actionId === review.id ? "Processing..." : "Approve and confirm booking"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
