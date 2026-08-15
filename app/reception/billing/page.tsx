"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { DeskReceipt } from "@/components/clinic/DeskReceipt";
import { collectDeskPayment, getPendingInvoices, getTodayClinicAppointments } from "@/lib/clinic/api";
import { clinicStatusLabel, type ClinicAppointment } from "@/lib/clinic/types";
import { useClinicQueueRealtime } from "@/lib/realtime/useClinicQueueRealtime";
import { formatCurrency, formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import type { ClinicPaymentMethod } from "@/types";
import { Loader2, Printer } from "lucide-react";

export default function ReceptionBillingPage() {
  const [pending, setPending] = useState<ClinicAppointment[]>([]);
  const [todayPaid, setTodayPaid] = useState<ClinicAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [method, setMethod] = useState<Record<string, ClinicPaymentMethod>>({});
  const [discount, setDiscount] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<{
    apt: ClinicAppointment;
    method: ClinicPaymentMethod | "prepaid";
    discount: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [open, today] = await Promise.all([getPendingInvoices(), getTodayClinicAppointments()]);
      setPending(open);
      setTodayPaid(
        today.filter(
          (a) =>
            a.status === "completed" &&
            (a.invoice?.status === "paid" || a.payment?.status === "completed")
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load billing"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useClinicQueueRealtime({ onChange: load });

  const collect = async (apt: ClinicAppointment) => {
    setBusyId(apt.id);
    setError(null);
    try {
      const prepaid = apt.payment?.status === "completed";
      const disc = Number(discount[apt.id] || 0);
      const payMethod = method[apt.id] ?? "cash";
      await collectDeskPayment({
        appointmentId: apt.id,
        method: payMethod,
        discount: disc,
      });
      setReceipt({
        apt,
        method: prepaid ? "prepaid" : payMethod,
        discount: disc,
      });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Collection failed"));
    } finally {
      setBusyId(null);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h2 className="text-xl font-semibold">Desk billing</h2>
        <p className="text-sm text-muted-foreground">
          Collect payment after consult. Online prepaid visits are marked paid automatically and are not
          charged again.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          {error}
        </p>
      )}

      {receipt && (
        <div className="print:hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-medium text-emerald-900">Payment recorded — print receipt</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={printReceipt}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReceipt(null)}>
                Dismiss
              </Button>
            </div>
          </div>
          <DeskReceipt
            appointment={receipt.apt}
            method={receipt.method}
            discount={receipt.discount}
          />
        </div>
      )}

      {receipt && (
        <div className="hidden print:block">
          <DeskReceipt
            appointment={receipt.apt}
            method={receipt.method}
            discount={receipt.discount}
          />
        </div>
      )}

      <div className="print:hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment pending</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pending.length === 0 && (
                  <p className="text-sm text-muted-foreground">No unpaid visits waiting at the desk.</p>
                )}
                {pending.map((apt) => {
                  const total = Number(apt.invoice?.total ?? apt.consultation_fee);
                  const prepaid = apt.payment?.status === "completed";
                  return (
                    <div key={apt.id} className="space-y-3 rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{apt.patient?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {apt.token_number ?? "—"} · {apt.doctor?.profile?.full_name} ·{" "}
                            {clinicStatusLabel(apt.status)} · {formatTime(apt.scheduled_at)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(total)}</p>
                      </div>
                      {prepaid ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-emerald-700">
                            Already paid online. Confirm to close the visit without charging again.
                          </p>
                          <Button disabled={busyId === apt.id} onClick={() => void collect(apt)}>
                            {busyId === apt.id ? "Closing…" : "Confirm prepaid"}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Method</Label>
                            <select
                              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                              value={method[apt.id] ?? "cash"}
                              onChange={(e) =>
                                setMethod((m) => ({
                                  ...m,
                                  [apt.id]: e.target.value as ClinicPaymentMethod,
                                }))
                              }
                            >
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="online">Online</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label>Discount (PKR)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={discount[apt.id] ?? "0"}
                              onChange={(e) =>
                                setDiscount((d) => ({ ...d, [apt.id]: e.target.value }))
                              }
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              className="w-full"
                              disabled={busyId === apt.id}
                              onClick={() => void collect(apt)}
                            >
                              {busyId === apt.id ? "Collecting…" : "Collect payment"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Paid today</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayPaid.length === 0 && (
                  <p className="text-sm text-muted-foreground">No completed paid visits yet.</p>
                )}
                {todayPaid.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>
                      {apt.patient?.full_name} · {apt.token_number ?? "—"} ·{" "}
                      {apt.payment?.status === "completed"
                        ? "Online prepaid"
                        : apt.invoice?.invoice_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(
                          Number(apt.invoice?.total ?? apt.payment?.amount ?? apt.consultation_fee)
                        )}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setReceipt({
                            apt,
                            method:
                              apt.payment?.status === "completed"
                                ? "prepaid"
                                : apt.invoice?.payments?.[0]?.method ?? "cash",
                            discount: Number(apt.invoice?.discount ?? 0),
                          })
                        }
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
