"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { VitalsForm, VitalsSummary, vitalsBlockers } from "@/components/clinic/VitalsForm";
import { PrescriptionDetail } from "@/components/clinic/PrescriptionDetail";
import { VisitHistoryTimeline } from "@/components/clinic/VisitHistoryTimeline";
import {
  calcAgeYears,
  checkInAppointment,
  getConsultationByAppointment,
  getPatientById,
  getPatientClinicHistory,
  getPatientDocuments,
  getPatientEmrHistory,
  recordVisitVitals,
  updateClinicPatient,
  type ClinicPatientDocument,
} from "@/lib/clinic/api";
import {
  clinicStatusClass,
  clinicStatusLabel,
  emptyVitals,
  pktDayBounds,
  vitalsHaveValues,
  type ClinicAppointment,
  type ClinicEmrVisit,
  type ClinicVitals,
} from "@/lib/clinic/types";
import type { Gender, Profile } from "@/types";
import { formatCurrency, formatDate, formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "vitals" | "visits" | "prescriptions" | "invoices" | "documents";

interface ClinicPatientProfileProps {
  patientId: string;
  mode: "reception" | "doctor";
  visitAppointmentId?: string | null;
  initialTab?: Tab;
  className?: string;
}

export function ClinicPatientProfile({
  patientId,
  mode,
  visitAppointmentId,
  initialTab,
  className,
}: ClinicPatientProfileProps) {
  const [patient, setPatient] = useState<Profile | null>(null);
  const [visits, setVisits] = useState<ClinicAppointment[]>([]);
  const [emr, setEmr] = useState<ClinicEmrVisit[]>([]);
  const [docs, setDocs] = useState<ClinicPatientDocument[]>([]);
  const [tab, setTab] = useState<Tab>(initialTab ?? (mode === "reception" ? "vitals" : "overview"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string>(visitAppointmentId ?? "");
  const [vitals, setVitals] = useState<Omit<ClinicVitals, "id" | "consultation_id">>(emptyVitals());
  const [vitalsStamp, setVitalsStamp] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [details, setDetails] = useState({
    full_name: "",
    phone: "",
    city: "",
    gender: "" as Gender | "",
    date_of_birth: "",
  });

  const reload = async () => {
    const [profile, history, documents, records] = await Promise.all([
      getPatientById(patientId),
      getPatientClinicHistory(patientId),
      getPatientDocuments(patientId),
      getPatientEmrHistory(patientId),
    ]);
    setPatient(profile);
    setVisits(history);
    setDocs(documents);
    setEmr(records);
    if (profile) {
      setDetails({
        full_name: profile.full_name,
        phone: profile.phone ?? "",
        city: profile.city ?? "",
        gender: profile.gender ?? "",
        date_of_birth: profile.date_of_birth ?? "",
      });
    }
    return history;
  };

  useEffect(() => {
    setLoading(true);
    void reload()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const { day } = pktDayBounds();
  const todayVisits = useMemo(
    () =>
      visits.filter((v) => {
        if (v.appointment_type !== "in_person") return false;
        if (["cancelled", "no_show", "expired_no_show"].includes(v.status)) return false;
        const localDay = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Karachi",
        }).format(new Date(v.scheduled_at));
        return localDay === day;
      }),
    [visits, day]
  );

  useEffect(() => {
    if (visitAppointmentId) {
      setSelectedVisitId(visitAppointmentId);
      return;
    }
    if (!selectedVisitId && todayVisits[0]) setSelectedVisitId(todayVisits[0].id);
  }, [visitAppointmentId, todayVisits, selectedVisitId]);

  const selectedVisit = visits.find((v) => v.id === selectedVisitId) ?? null;

  useEffect(() => {
    if (!selectedVisitId) {
      setVitals(emptyVitals());
      setVitalsStamp(null);
      return;
    }
    void getConsultationByAppointment(selectedVisitId)
      .then((consult) => {
        if (consult?.vitals) {
          setVitals({
            blood_pressure: consult.vitals.blood_pressure ?? "",
            temperature: consult.vitals.temperature,
            pulse: consult.vitals.pulse,
            weight: consult.vitals.weight,
            height: consult.vitals.height,
            spo2: consult.vitals.spo2,
          });
          setVitalsStamp(consult.vitals.recorded_at ?? null);
        } else {
          setVitals(emptyVitals());
          setVitalsStamp(null);
        }
      })
      .catch(() => {
        setVitals(emptyVitals());
        setVitalsStamp(null);
      });
  }, [selectedVisitId]);

  const age = calcAgeYears(patient?.date_of_birth);
  const invoices = useMemo(
    () => visits.filter((v) => v.invoice || v.payment).slice(0, 30),
    [visits]
  );
  const prescriptions = useMemo(
    () => emr.filter((v) => (v.prescription?.items.length ?? 0) > 0 || v.treatment_notes),
    [emr]
  );

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "vitals", label: "Vitals", show: true },
    { id: "visits", label: "Visits", show: true },
    { id: "prescriptions", label: "Prescriptions", show: true },
    { id: "invoices", label: "Invoices", show: true },
    { id: "documents", label: "Documents", show: mode === "doctor" },
  ];

  const saveVitals = async () => {
    if (!selectedVisitId) {
      setError("Select today's visit first.");
      return;
    }
    const blockers = vitalsBlockers(vitals);
    if (blockers.length > 0) {
      setError(blockers[0]);
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await recordVisitVitals({ appointmentId: selectedVisitId, vitals });
      setVitalsStamp(new Date().toISOString());
      setMessage("Vitals saved for this visit.");
      await reload();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save vitals"));
    } finally {
      setSaving(false);
    }
  };

  const sendToQueue = async () => {
    if (!selectedVisitId) return;
    const blockers = vitalsHaveValues(vitals) ? vitalsBlockers(vitals) : [];
    if (blockers.length > 0) {
      setError(blockers[0]);
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (vitalsHaveValues(vitals)) {
        await recordVisitVitals({ appointmentId: selectedVisitId, vitals });
      }
      const result = await checkInAppointment(selectedVisitId);
      setMessage(`Added to doctor queue as ${result.token_number}.`);
      await reload();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add to queue"));
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = async () => {
    if (!patient) return;
    if (!details.full_name.trim()) {
      setError("Patient name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateClinicPatient({
        id: patient.id,
        full_name: details.full_name,
        phone: details.phone || null,
        city: details.city || null,
        gender: details.gender || null,
        date_of_birth: details.date_of_birth || null,
      });
      setPatient(updated);
      setEditingDetails(false);
      setMessage("Patient details updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not update patient"));
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingDetails((open) => !open)}>
              {editingDetails ? "Close details" : "Edit details"}
            </Button>
            <Link href="/reception/walk-in">
              <Button variant="outline">Register walk-in</Button>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      {mode === "reception" && editingDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit patient details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input
                value={details.full_name}
                onChange={(e) => setDetails((d) => ({ ...d, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={details.phone}
                onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input
                value={details.city}
                onChange={(e) => setDetails((d) => ({ ...d, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={details.gender}
                onChange={(e) => setDetails((d) => ({ ...d, gender: e.target.value as Gender | "" }))}
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={details.date_of_birth}
                onChange={(e) => setDetails((d) => ({ ...d, date_of_birth: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void saveDetails()}>
                Save details
              </Button>
            </div>
          </CardContent>
        </Card>
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

      {tab === "vitals" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {mode === "reception" ? "Visit vitals" : "Reception vitals"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {mode === "reception"
                  ? "No in-clinic visit for today. Register a walk-in first, then record vitals here."
                  : "No in-clinic visit for today. Previous vitals are listed below when available."}
              </p>
            ) : (
              <>
                <select
                  className="h-10 w-full max-w-lg rounded-lg border border-input bg-background px-3 text-sm"
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                >
                  {todayVisits.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.token_number ?? "No token"} · {apt.doctor?.profile?.full_name} ·{" "}
                      {clinicStatusLabel(apt.status)}
                    </option>
                  ))}
                </select>
                {vitalsStamp && (
                  <p className="text-xs text-muted-foreground">
                    Last recorded {formatDate(vitalsStamp)} {formatTime(vitalsStamp)}
                  </p>
                )}
                <VitalsForm
                  value={vitals}
                  onChange={mode === "reception" ? setVitals : undefined}
                  readOnly={mode === "doctor"}
                />
                {mode === "reception" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={saving} onClick={() => void saveVitals()}>
                      {saving ? "Saving…" : "Save vitals"}
                    </Button>
                    {selectedVisit &&
                      ["scheduled", "checked_in"].includes(selectedVisit.status) && (
                        <Button
                          variant="outline"
                          disabled={saving}
                          onClick={() => void sendToQueue()}
                        >
                          Add to doctor queue
                        </Button>
                      )}
                    {selectedVisit?.status === "waiting" && (
                      <p className="self-center text-sm text-muted-foreground">
                        Already in the doctor&apos;s waiting queue — you can still update vitals.
                      </p>
                    )}
                    {selectedVisit?.status === "payment_pending" && (
                      <Link href="/reception/billing">
                        <Button variant="outline">Collect payment</Button>
                      </Link>
                    )}
                  </div>
                )}
                {mode === "doctor" && selectedVisit && selectedVisit.appointment_type === "in_person" && (
                  <Link href={`/doctor/consultations/${selectedVisit.id}`}>
                    <Button>Open consultation</Button>
                  </Link>
                )}
              </>
            )}
            {emr.filter((v) => v.appointment_id !== selectedVisitId && v.vitals).length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Previous vitals</p>
                {emr
                  .filter((v) => v.appointment_id !== selectedVisitId && v.vitals)
                  .slice(0, 6)
                  .map((visit) => (
                    <div key={visit.id} className="rounded-md border px-3 py-2">
                      <p className="text-xs font-medium">
                        {formatDate(visit.scheduled_at)} · {visit.doctor_name}
                      </p>
                      <VitalsSummary value={visit.vitals ?? emptyVitals()} />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "visits" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {emr.length > 0 ? (
              <VisitHistoryTimeline visits={emr} />
            ) : (
              <div className="space-y-2">
                {visits.map((apt) => (
                  <VisitRow key={apt.id} apt={apt} mode={mode} showNotes={mode === "doctor"} />
                ))}
                {visits.length === 0 && (
                  <p className="text-sm text-muted-foreground">No visits yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "prescriptions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prescriptions.length === 0 && (
              <p className="text-sm text-muted-foreground">No prescriptions on file.</p>
            )}
            {prescriptions.map((visit) => (
              <div key={visit.id} className="space-y-1">
                {mode === "doctor" && (
                  <div className="flex justify-end">
                    <Link
                      href={`/doctor/consultations/${visit.appointment_id}`}
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                <PrescriptionDetail visit={visit} />
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
        {mode === "reception" && apt.appointment_type === "in_person" && (
          <Link
            href={`/reception/patients/${apt.patient_id}?visit=${apt.id}`}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Record
          </Link>
        )}
      </div>
    </div>
  );
}
