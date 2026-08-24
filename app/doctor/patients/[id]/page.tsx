"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ClinicPatientProfile } from "@/components/clinic/ClinicPatientProfile";
import { Button } from "@/components/ui/Button";
import { useDoctor } from "@/contexts/DoctorContext";
import {
  getConsultationByAppointment,
  getTodayClinicAppointments,
  openConsultation,
} from "@/lib/clinic/api";
import {
  clinicStatusClass,
  clinicStatusLabel,
  emptyVitals,
  vitalsHaveValues,
  type ClinicAppointment,
  type ClinicVitals,
} from "@/lib/clinic/types";
import { VitalsSummary } from "@/components/clinic/VitalsForm";
import { getErrorMessage } from "@/lib/errors";
import { useClinicQueueRealtime } from "@/lib/realtime/useClinicQueueRealtime";

type ProfileTab = "overview" | "vitals" | "visits" | "prescriptions" | "invoices" | "documents";

function DoctorPatientRecordInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { doctorProfile } = useDoctor();
  const [todayVisit, setTodayVisit] = useState<ClinicAppointment | null>(null);
  const [vitals, setVitals] = useState<Omit<ClinicVitals, "id" | "consultation_id"> | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabParam = search.get("tab");
  const requestedTab: ProfileTab | null =
    tabParam === "overview" ||
    tabParam === "vitals" ||
    tabParam === "visits" ||
    tabParam === "prescriptions" ||
    tabParam === "invoices" ||
    tabParam === "documents"
      ? tabParam
      : null;

  const loadVisit = useCallback(async () => {
    if (!params.id) return;
    const rows = await getTodayClinicAppointments(doctorProfile.id);
    const visit =
      rows.find(
        (row) =>
          row.patient_id === params.id &&
          ["waiting", "with_doctor", "checked_in", "scheduled"].includes(row.status)
      ) ?? null;
    setTodayVisit(visit);
    if (!visit) {
      setVitals(null);
      return;
    }
    const consult = await getConsultationByAppointment(visit.id);
    setVitals(consult?.vitals ?? null);
  }, [params.id, doctorProfile.id]);

  useEffect(() => {
    void loadVisit().catch((err) => setError(getErrorMessage(err)));
  }, [loadVisit]);

  useClinicQueueRealtime({
    onChange: () => {
      void loadVisit().catch((err) => setError(getErrorMessage(err)));
    },
    doctorId: doctorProfile.id,
  });

  const openConsult = async () => {
    if (!todayVisit) return;
    setOpening(true);
    setError(null);
    try {
      await openConsultation(todayVisit.id);
      router.push(`/doctor/consultations/${todayVisit.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not open consultation"));
      setOpening(false);
    }
  };

  const initialTab: ProfileTab = requestedTab ?? (todayVisit ? "vitals" : "visits");

  return (
    <div className="space-y-4">
      <Link href="/doctor/patients" className="text-sm text-muted-foreground hover:underline">
        ← Back to registry
      </Link>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {todayVisit && (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-900">
              In clinic today · {todayVisit.token_number ?? "no token"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span
                className={`mr-2 inline-flex rounded-full border px-2 py-0.5 ${clinicStatusClass(todayVisit.status)}`}
              >
                {clinicStatusLabel(todayVisit.status)}
              </span>
              Reception{" "}
              {vitalsHaveValues(vitals)
                ? "has recorded vitals for this visit."
                : "has not recorded vitals yet."}
            </p>
            {vitalsHaveValues(vitals) && (
              <div className="mt-2">
                <VitalsSummary value={vitals ?? emptyVitals()} />
              </div>
            )}
          </div>
          <Button disabled={opening} onClick={() => void openConsult()}>
            {opening ? "Opening…" : "Open consultation"}
          </Button>
        </div>
      )}

      {params.id ? (
        <ClinicPatientProfile
          patientId={params.id}
          mode="doctor"
          visitAppointmentId={todayVisit?.id}
          initialTab={initialTab}
        />
      ) : null}
    </div>
  );
}

export default function DoctorPatientRecordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading patient…</p>}>
      <DoctorPatientRecordInner />
    </Suspense>
  );
}
