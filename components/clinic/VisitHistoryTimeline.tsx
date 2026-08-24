"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { ClinicEmrVisit } from "@/lib/clinic/types";
import { PrescriptionDetail } from "./PrescriptionDetail";
import { vitalsHaveValues } from "@/lib/clinic/types";

export function VisitHistoryTimeline({
  visits,
  excludeAppointmentId,
}: {
  visits: ClinicEmrVisit[];
  excludeAppointmentId?: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const filtered = useMemo(() => {
    return visits.filter((visit) => {
      if (excludeAppointmentId && visit.appointment_id === excludeAppointmentId) return false;
      const day = visit.scheduled_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (diagnosis.trim()) {
        const q = diagnosis.trim().toLowerCase();
        const hay = `${visit.diagnosis ?? ""} ${visit.chief_complaint ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visits, excludeAppointmentId, from, to, diagnosis]);

  const trend = useMemo(() => {
    return filtered
      .filter((v) => vitalsHaveValues(v.vitals))
      .slice()
      .reverse()
      .slice(-8);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Diagnosis</Label>
          <Input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Filter by diagnosis"
          />
        </div>
      </div>

      {trend.length > 1 && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vitals trend
          </p>
          <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            {trend.map((v) => (
              <div key={v.id} className="rounded-md bg-background px-2 py-1.5">
                <p className="font-medium">{v.scheduled_at.slice(0, 10)}</p>
                <p className="text-muted-foreground">
                  {[
                    v.vitals?.blood_pressure && `BP ${v.vitals.blood_pressure}`,
                    v.vitals?.weight != null && `${v.vitals.weight}kg`,
                    v.vitals?.pulse != null && `P ${v.vitals.pulse}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No visits match these filters.</p>
      ) : (
        <div className="relative space-y-3 border-l border-border pl-4">
          {filtered.map((visit) => (
            <div key={visit.id} className="relative">
              <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-brand-500" />
              <PrescriptionDetail visit={visit} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
