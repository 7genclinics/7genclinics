"use client";

import { BRAND } from "@/lib/brand/site";
import { formatCurrency, formatDate, formatTime } from "@/lib/doctor/mappers";
import type { ClinicAppointment } from "@/lib/clinic/types";
import type { ClinicPaymentMethod } from "@/types";

interface DeskReceiptProps {
  appointment: ClinicAppointment;
  method: ClinicPaymentMethod | "prepaid";
  discount?: number;
}

export function DeskReceipt({ appointment, method, discount = 0 }: DeskReceiptProps) {
  const subtotal = Number(
    appointment.invoice?.subtotal ?? appointment.consultation_fee ?? 0
  );
  const total = Number(
    appointment.invoice?.total ?? Math.max(0, subtotal - discount)
  );

  return (
    <div className="mx-auto max-w-md space-y-4 bg-white p-6 text-slate-900 print:max-w-none">
      <div className="border-b pb-4 text-center">
        <p className="font-display text-2xl font-bold tracking-tight">{BRAND.name}</p>
        <p className="text-xs text-slate-500">{BRAND.phone} · {BRAND.supportEmail}</p>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Payment receipt</p>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="text-slate-500">Invoice:</span>{" "}
          {appointment.invoice?.invoice_number ?? "PREPAID"}
        </p>
        <p>
          <span className="text-slate-500">Date:</span> {formatDate(new Date())}{" "}
          {formatTime(new Date().toISOString())}
        </p>
        <p>
          <span className="text-slate-500">Token:</span> {appointment.token_number ?? "—"}
        </p>
        <p>
          <span className="text-slate-500">Patient:</span>{" "}
          {appointment.patient?.full_name} ({appointment.patient?.patient_code})
        </p>
        <p>
          <span className="text-slate-500">Doctor:</span>{" "}
          {appointment.doctor?.profile?.full_name ?? "—"}
        </p>
        <p>
          <span className="text-slate-500">Service:</span>{" "}
          {appointment.service?.name ?? "Consultation"}
        </p>
      </div>

      <div className="space-y-2 border-y py-3 text-sm">
        <div className="flex justify-between">
          <span>Consultation</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Discount</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Method</span>
          <span className="capitalize">{method}</span>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">Thank you for visiting {BRAND.name}.</p>
    </div>
  );
}
