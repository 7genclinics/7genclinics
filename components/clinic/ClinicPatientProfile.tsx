"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  calcAgeYears,
  getPatientById,
  getPatientClinicHistory,
  getPatientDocuments,
  type ClinicPatientDocument,
} from "@/lib/clinic/api";
import {
  clinicStatusClass,
  clinicStatusLabel,
  type ClinicAppointment,
} from "@/lib/clinic/types";
import type { Profile } from "@/types";
import { formatCurrency, formatDate, formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "visits" | "prescriptions" | "invoices" | "documents";

interface ClinicPatientProfileProps {
  patientId: string;
  mode: "reception" | "doctor";
  className?: string;
}

export function ClinicPatientProfile({ patientId, mode, className }: ClinicPatientProfileProps) {
  const [patient, setPatient] = useState<Profile | null>(null);
  const [visits, setVisits] = useState<ClinicAppointment[]>([]);
  const [docs, setDocs] = useState<ClinicPatientDocument[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      getPatientById(patientId),
      getPatientClinicHistory(patientId),
      getPatientDocuments(patientId),
    ])
      .then(([profile, history, documents]) => {
        setPatient(profile);
        setVisits(history);
        setDocs(documents);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  const age = calcAgeYears(patient?.date_of_birth);
  const invoices = useMemo(
    () => visits.filter((v) => v.invoice || v.payment).slice(0, 30),
    [visits]
  );
  const prescriptions = useMemo(
    () =>
      visits.filter(
        (v) =>
          v.status === "completed" ||
          v.status === "payment_pending" ||
          v.status === "with_doctor"
      ),
    [visits]
  );

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "visits", label: "Visits", show: true },
    {
      id: "prescriptions",
      label: "Prescriptions",
      show: mode === "doctor",
    },
    { id: "invoices", label: "Invoices", show: true },
    {
      id: "documents",
      label: "Documents",
      show: mode === "doctor",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!patient) {
    return <p className="text-sm text-muted-foreground">Patient not found.</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{patient.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            {patient.patient_code} · {patient.phone ?? "no phone"} · {patient.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              age != null ? `Age ${age}` : null,
              patient.gender,
              patient.city,
              patient.date_of_birth ? `DOB ${patient.date_of_birth}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No demographics on file"}
          </p>
        </div>
        {mode === "reception" && (
          <Link href="/reception/walk-in">
            <Button variant="outline">Register walk-in</Button>
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-brand-500 text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total visits</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{visits.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {visits.filter((v) => v.status === "completed").length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Open balance</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {visits.filter((v) => v.status === "payment_pending").length}
            </CardContent>
          </Card>
          <Card className="sm:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Latest visits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visits.slice(0, 5).map((apt) => (
                <VisitRow key={apt.id} apt={apt} mode={mode} />
              ))}
              {visits.length === 0 && (
                <p className="text-sm text-muted-foreground">No visits yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "visits" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visits.map((apt) => (
              <VisitRow key={apt.id} apt={apt} mode={mode} showNotes={mode === "doctor"} />
            ))}
            {visits.length === 0 && (
              <p className="text-sm text-muted-foreground">No visits yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "prescriptions" && mode === "doctor" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prescriptions.length === 0 && (
              <p className="text-sm text-muted-foreground">No prescription visits yet.</p>
            )}
            {prescriptions.map((apt) => (
              <div key={apt.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {formatDate(apt.scheduled_at)} · {apt.doctor?.profile?.full_name ?? "Doctor"}
                  </p>
                  <Link
                    href={`/doctor/consultations/${apt.id}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {apt.doctor_notes?.trim() || "No notes on file for this visit."}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "invoices" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments & invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 && (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            )}
            {invoices.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatDate(apt.scheduled_at)} ·{" "}
                    {apt.invoice?.invoice_number ??
                      (apt.payment?.status === "completed" ? "Online prepaid" : "—")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clinicStatusLabel(apt.status)} ·{" "}
                    {(apt.booking_source ?? "online").replace("_", "-")}
                  </p>
                </div>
                <span className="font-semibold">
                  {formatCurrency(
                    Number(apt.invoice?.total ?? apt.payment?.amount ?? apt.consultation_fee)
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "documents" && mode === "doctor" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            )}
            {docs.map((doc) => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span>{doc.file_name}</span>
                <span className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VisitRow({
  apt,
  mode,
  showNotes,
}: {
  apt: ClinicAppointment;
  mode: "reception" | "doctor";
  showNotes?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium">
          {formatDate(apt.scheduled_at)} · {formatTime(apt.scheduled_at)}
        </p>
        <p className="text-xs text-muted-foreground">
          {apt.doctor?.profile?.full_name} · {(apt.booking_source ?? "online").replace("_", "-")} ·{" "}
          {apt.token_number ?? "no token"} · {apt.appointment_type.replace("_", " ")}
        </p>
        {showNotes && apt.doctor_notes && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{apt.doctor_notes}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs ${clinicStatusClass(apt.status)}`}>
          {clinicStatusLabel(apt.status)}
        </span>
        {mode === "doctor" && apt.appointment_type === "in_person" && (
          <Link
            href={`/doctor/consultations/${apt.id}`}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Open
          </Link>
        )}
        {mode === "reception" && apt.status === "payment_pending" && (
          <Link href="/reception/billing" className="text-xs font-medium text-brand-600 hover:underline">
            Billing
          </Link>
        )}
      </div>
    </div>
  );
}
