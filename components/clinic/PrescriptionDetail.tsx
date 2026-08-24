"use client";

import type { ClinicEmrVisit } from "@/lib/clinic/types";
import { formatDate, formatTime } from "@/lib/doctor/mappers";
import { vitalsHaveValues } from "@/lib/clinic/types";

export function PrescriptionDetail({ visit }: { visit: ClinicEmrVisit }) {
  const items = visit.prescription?.items ?? [];
  const notes = [visit.treatment_notes, visit.prescription?.instructions]
    .map((v) => v?.trim())
    .filter(Boolean);

  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {formatDate(visit.scheduled_at)} · {formatTime(visit.scheduled_at)}
        </p>
        <p className="text-xs text-muted-foreground">
          {visit.doctor_name}
          {visit.token_number ? ` · ${visit.token_number}` : ""}
        </p>
      </div>
      {visit.diagnosis && (
        <p className="mt-1 text-xs">
          <span className="font-semibold">Diagnosis:</span> {visit.diagnosis}
        </p>
      )}
      {items.length > 0 ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {items
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item, i) => (
              <li key={item.id ?? `${item.medicine_name}-${i}`}>
                <span className="font-medium">{item.medicine_name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  {[item.dose, item.frequency, item.duration].filter(Boolean).join(" · ")}
                </span>
                {item.instructions ? (
                  <span className="block text-xs text-muted-foreground">{item.instructions}</span>
                ) : null}
              </li>
            ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No medicines on this visit.</p>
      )}
      {notes.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Notes:</span> {notes.join(" — ")}
        </p>
      )}
      {vitalsHaveValues(visit.vitals) && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Vitals:{" "}
          {[
            visit.vitals?.blood_pressure && `BP ${visit.vitals.blood_pressure}`,
            visit.vitals?.temperature != null && `${visit.vitals.temperature}°C`,
            visit.vitals?.pulse != null && `P ${visit.vitals.pulse}`,
            visit.vitals?.weight != null && `${visit.vitals.weight} kg`,
            visit.vitals?.height != null && `${visit.vitals.height} cm`,
            visit.vitals?.spo2 != null && `SpO2 ${visit.vitals.spo2}%`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
