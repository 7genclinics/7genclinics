"use client";

import { BRAND } from "@/lib/brand/site";
import type { ClinicPrescriptionItem } from "@/lib/clinic/types";

export function PrescriptionPad({
  doctorName,
  specialization,
  pmdcNumber,
  patientName,
  patientCode,
  age,
  gender,
  dateLabel,
  token,
  diagnosis,
  items,
  instructions,
  followUp,
  notes,
}: {
  doctorName: string;
  specialization?: string | null;
  pmdcNumber?: string | null;
  patientName: string;
  patientCode?: string | null;
  age?: number | null;
  gender?: string | null;
  dateLabel: string;
  token?: string | null;
  diagnosis?: string | null;
  items: ClinicPrescriptionItem[];
  instructions?: string | null;
  followUp?: string | null;
  notes?: string | null;
}) {
  const meds = items.filter((i) => i.medicine_name.trim());

  return (
    <div className="rx-pad mx-auto max-w-[210mm] bg-white text-slate-900 print:max-w-none">
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight">{BRAND.name}</p>
            <p className="text-sm font-semibold">{doctorName}</p>
            <p className="text-xs text-slate-600">
              {[specialization, pmdcNumber ? `PMDC ${pmdcNumber}` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>{BRAND.phone}</p>
            <p>{BRAND.supportEmail}</p>
            <p>{BRAND.citiesLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <p>
          <strong>Patient:</strong> {patientName}
          {patientCode ? ` (${patientCode})` : ""}
        </p>
        <p>
          <strong>Date:</strong> {dateLabel}
        </p>
        <p>
          <strong>Age / Gender:</strong> {age ?? "—"} / {gender ?? "—"}
        </p>
        <p>
          <strong>Token:</strong> {token ?? "—"}
        </p>
      </div>

      {diagnosis ? (
        <p className="mt-3 text-sm">
          <strong>Diagnosis:</strong> {diagnosis}
        </p>
      ) : null}

      <div className="mt-5">
        <p className="font-serif text-3xl leading-none">℞</p>
        <ol className="mt-3 list-decimal space-y-3 pl-6 text-sm">
          {meds.map((item, i) => (
            <li key={item.id ?? `${item.medicine_name}-${i}`}>
              <span className="font-semibold">{item.medicine_name}</span>
              <div className="text-slate-700">
                {[item.dose, item.frequency, item.duration].filter(Boolean).join(" · ")}
              </div>
              {item.instructions ? <div className="text-xs text-slate-600">{item.instructions}</div> : null}
            </li>
          ))}
        </ol>
        {meds.length === 0 && <p className="mt-3 text-sm text-slate-500">No medicines listed.</p>}
      </div>

      {instructions ? (
        <p className="mt-5 text-sm">
          <strong>Instructions:</strong> {instructions}
        </p>
      ) : null}
      {notes ? (
        <p className="mt-2 text-sm">
          <strong>Notes:</strong> {notes}
        </p>
      ) : null}
      {followUp ? (
        <p className="mt-2 text-sm">
          <strong>Follow-up:</strong> {followUp}
        </p>
      ) : null}

      <div className="mt-16 flex justify-end">
        <div className="w-56 border-t border-slate-400 pt-1 text-center text-xs text-slate-600">
          Doctor signature
        </div>
      </div>
    </div>
  );
}
