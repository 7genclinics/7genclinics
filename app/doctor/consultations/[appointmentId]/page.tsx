"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useDoctor } from "@/contexts/DoctorContext";
import {
  calcAgeYears,
  completeConsultation,
  getClinicAppointment,
  getConsultationByAppointment,
  getPatientClinicHistory,
  getPatientDocuments,
  openConsultation,
  saveConsultationDraft,
  uploadPatientDocument,
  type ClinicPatientDocument,
} from "@/lib/clinic/api";
import type { ClinicAppointment, ClinicPrescriptionItem, ClinicVitals } from "@/lib/clinic/types";
import { formatClinicalNotes } from "@/lib/doctor/notes";
import { updateAppointment } from "@/lib/doctor/api";
import { formatDate, formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { BRAND } from "@/lib/brand/site";
import { Loader2, Plus, Printer, Trash2, Upload } from "lucide-react";

const emptyItem = (sort_order: number): ClinicPrescriptionItem => ({
  medicine_name: "",
  dose: "",
  frequency: "",
  duration: "",
  instructions: "",
  sort_order,
});

export default function DoctorConsultationPage() {
  const params = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const { profile, doctorProfile } = useDoctor();
  const appointmentId = params.appointmentId;
  const fileRef = useRef<HTMLInputElement>(null);

  const [appointment, setAppointment] = useState<ClinicAppointment | null>(null);
  const [history, setHistory] = useState<ClinicAppointment[]>([]);
  const [docs, setDocs] = useState<ClinicPatientDocument[]>([]);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [vitals, setVitals] = useState<Omit<ClinicVitals, "id" | "consultation_id">>({
    blood_pressure: "",
    temperature: null,
    pulse: null,
    weight: null,
    height: null,
    spo2: null,
  });
  const [rxInstructions, setRxInstructions] = useState("");
  const [items, setItems] = useState<ClinicPrescriptionItem[]>([emptyItem(0)]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setError(null);
    try {
      const apt = await getClinicAppointment(appointmentId);
      setAppointment(apt);
      if (apt?.patient_id) {
        const [visits, documents] = await Promise.all([
          getPatientClinicHistory(apt.patient_id),
          getPatientDocuments(apt.patient_id),
        ]);
        setHistory(visits.filter((v) => v.id !== appointmentId).slice(0, 8));
        setDocs(documents);
      }
      const consultId = await openConsultation(appointmentId);
      setConsultationId(consultId);
      const existing = await getConsultationByAppointment(appointmentId);
      if (existing) {
        setChiefComplaint(existing.chief_complaint ?? "");
        setSymptoms(existing.symptoms ?? "");
        setDiagnosis(existing.diagnosis ?? "");
        setTreatmentNotes(existing.treatment_notes ?? "");
        setFollowUpDate(existing.follow_up_date ?? "");
        if (existing.vitals) {
          setVitals({
            blood_pressure: existing.vitals.blood_pressure ?? "",
            temperature: existing.vitals.temperature,
            pulse: existing.vitals.pulse,
            weight: existing.vitals.weight,
            height: existing.vitals.height,
            spo2: existing.vitals.spo2,
          });
        }
        setRxInstructions(existing.prescription?.instructions ?? "");
        if (existing.prescription?.items?.length) {
          setItems(existing.prescription.items);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to open consultation"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async () => {
    if (!consultationId || !appointment) throw new Error("Consultation not ready");
    await saveConsultationDraft({
      consultationId,
      appointmentId,
      patientId: appointment.patient_id,
      doctorId: doctorProfile.id,
      chiefComplaint,
      symptoms,
      diagnosis,
      treatmentNotes,
      followUpDate: followUpDate || null,
      vitals,
      prescriptionInstructions: rxInstructions,
      items,
      recordedBy: profile.id,
    });

    const meds = items.filter((i) => i.medicine_name.trim());
    const notes = formatClinicalNotes(
      [chiefComplaint, diagnosis, treatmentNotes].filter(Boolean).join("\n"),
      meds[0]
        ? {
            medication: meds.map((i) => i.medicine_name).join(", "),
            dosage: meds
              .map((i) => [i.dose, i.frequency, i.duration].filter(Boolean).join(" "))
              .join("; "),
          }
        : null
    );
    await updateAppointment(appointmentId, { doctor_notes: notes });
  };

  const saveDraft = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await persist();
      setMessage("Draft saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await persist();
      const status = await completeConsultation(appointmentId);
      setMessage(
        status === "payment_pending"
          ? "Consultation completed. Patient should pay at reception."
          : "Consultation completed."
      );
      router.push("/doctor/queue");
    } catch (err) {
      setError(getErrorMessage(err, "Could not complete consultation"));
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file: File | null) => {
    if (!file || !appointment || !consultationId) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPatientDocument({
        patientId: appointment.patient_id,
        appointmentId,
        consultationId,
        file,
        uploadedBy: profile.id,
      });
      setDocs(await getPatientDocuments(appointment.patient_id));
      setMessage("Document attached.");
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!appointment) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }

  const age = calcAgeYears(appointment.patient?.date_of_birth);
  const meds = items.filter((i) => i.medicine_name.trim());

  return (
    <div className="space-y-6 print:space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-semibold">
            {appointment.token_number ?? "Consult"} · {appointment.patient?.full_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {appointment.patient?.patient_code} · {appointment.patient?.phone} ·{" "}
            {age != null ? `Age ${age}` : "Age —"} · {appointment.patient?.gender ?? "—"} ·{" "}
            {formatTime(appointment.scheduled_at)}
          </p>
          <Link
            href={`/doctor/patients`}
            className="mt-1 inline-block text-xs text-brand-600 hover:underline"
          >
            Patient registry
          </Link>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Rx
          </Button>
          <Button variant="outline" disabled={saving} onClick={() => void saveDraft()}>
            Save draft
          </Button>
          <Button
            className="bg-brand-500 text-white hover:bg-brand-600"
            disabled={saving}
            onClick={() => void finish()}
          >
            Complete visit
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">
          {message}
        </p>
      )}

      {/* Professional printable prescription */}
      <div className="hidden print:block space-y-4 text-slate-900">
        <div className="border-b pb-3">
          <p className="text-2xl font-bold tracking-tight">{BRAND.name}</p>
          <p className="text-sm">
            {profile.full_name}
            {doctorProfile.specialization ? ` · ${doctorProfile.specialization}` : ""}
          </p>
          <p className="text-xs text-slate-600">
            {BRAND.phone} · {BRAND.supportEmail}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>
            <strong>Patient:</strong> {appointment.patient?.full_name} (
            {appointment.patient?.patient_code})
          </p>
          <p>
            <strong>Date:</strong> {formatDate(new Date())}
          </p>
          <p>
            <strong>Age / Gender:</strong> {age ?? "—"} / {appointment.patient?.gender ?? "—"}
          </p>
          <p>
            <strong>Token:</strong> {appointment.token_number ?? "—"}
          </p>
        </div>
        {diagnosis && (
          <p className="text-sm">
            <strong>Diagnosis:</strong> {diagnosis}
          </p>
        )}
        <div>
          <p className="mb-2 text-lg font-semibold">Rx</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {meds.map((item, i) => (
              <li key={i}>
                <span className="font-medium">{item.medicine_name}</span>
                <br />
                {[item.dose, item.frequency, item.duration].filter(Boolean).join(" · ")}
                {item.instructions ? ` — ${item.instructions}` : ""}
              </li>
            ))}
          </ol>
          {meds.length === 0 && <p className="text-sm text-slate-500">No medicines listed.</p>}
        </div>
        {rxInstructions && (
          <p className="text-sm">
            <strong>Instructions:</strong> {rxInstructions}
          </p>
        )}
        {followUpDate && (
          <p className="text-sm">
            <strong>Follow-up:</strong> {formatDate(followUpDate)}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 print:hidden">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Clinical notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Chief complaint</Label>
              <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Symptoms</Label>
              <textarea
                className="min-h-[70px] w-full rounded-lg border border-input px-3 py-2 text-sm"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Diagnosis</Label>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Treatment notes</Label>
              <textarea
                className="min-h-[90px] w-full rounded-lg border border-input px-3 py-2 text-sm"
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up date</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vitals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>BP</Label>
              <Input
                value={vitals.blood_pressure ?? ""}
                onChange={(e) => setVitals((v) => ({ ...v, blood_pressure: e.target.value }))}
                placeholder="120/80"
              />
            </div>
            <div className="space-y-1">
              <Label>Temp °C</Label>
              <Input
                type="number"
                value={vitals.temperature ?? ""}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    temperature: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Pulse</Label>
              <Input
                type="number"
                value={vitals.pulse ?? ""}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    pulse: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Weight kg</Label>
              <Input
                type="number"
                value={vitals.weight ?? ""}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    weight: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Height cm</Label>
              <Input
                type="number"
                value={vitals.height ?? ""}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    height: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>SpO2 %</Label>
              <Input
                type="number"
                value={vitals.spo2 ?? ""}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    spo2: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Prescription</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setItems((prev) => [...prev, emptyItem(prev.length)])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Medicine
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-12">
              <Input
                className="sm:col-span-3"
                placeholder="Medicine"
                value={item.medicine_name}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, medicine_name: e.target.value } : r))
                  )
                }
              />
              <Input
                className="sm:col-span-2"
                placeholder="Dose"
                value={item.dose}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, dose: e.target.value } : r))
                  )
                }
              />
              <Input
                className="sm:col-span-2"
                placeholder="Frequency"
                value={item.frequency}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, frequency: e.target.value } : r))
                  )
                }
              />
              <Input
                className="sm:col-span-2"
                placeholder="Duration"
                value={item.duration}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, duration: e.target.value } : r))
                  )
                }
              />
              <div className="flex gap-2 sm:col-span-3">
                <Input
                  placeholder="Instructions"
                  value={item.instructions ?? ""}
                  onChange={(e) =>
                    setItems((rows) =>
                      rows.map((r, i) =>
                        i === index ? { ...r, instructions: e.target.value } : r
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setItems((rows) =>
                      rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, sort_order: i }))
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="space-y-1">
            <Label>General instructions</Label>
            <textarea
              className="min-h-[70px] w-full rounded-lg border border-input px-3 py-2 text-sm"
              value={rxInstructions}
              onChange={(e) => setRxInstructions(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Documents</CardTitle>
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" />
              {uploading ? "Uploading…" : "Attach"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 && (
            <p className="text-sm text-muted-foreground">No documents for this patient yet.</p>
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

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Previous visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">No earlier visits.</p>
          )}
          {history.map((visit) => (
            <div key={visit.id} className="rounded-lg border px-3 py-2 text-sm">
              {formatDate(visit.scheduled_at)} · {visit.appointment_type.replace("_", " ")} ·{" "}
              {visit.status}
              {visit.doctor_notes ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{visit.doctor_notes}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
