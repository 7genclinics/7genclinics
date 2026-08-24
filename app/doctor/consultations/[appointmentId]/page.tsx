"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useDoctor } from "@/contexts/DoctorContext";
import { VitalsForm } from "@/components/clinic/VitalsForm";
import { VisitHistoryTimeline } from "@/components/clinic/VisitHistoryTimeline";
import { MedicinePicker } from "@/components/clinic/MedicinePicker";
import { PrescriptionPad } from "@/components/clinic/PrescriptionPad";
import {
  calcAgeYears,
  completeConsultation,
  getClinicAppointment,
  getConsultationByAppointment,
  getDoctorMedicines,
  getPatientDocuments,
  getPatientEmrHistory,
  openConsultation,
  saveConsultationDraft,
  uploadPatientDocument,
  type ClinicPatientDocument,
} from "@/lib/clinic/api";
import { downloadPrescriptionPdf } from "@/lib/clinic/prescription-pdf";
import {
  emptyVitals,
  vitalsHaveValues,
  type ClinicAppointment,
  type ClinicEmrVisit,
  type ClinicPrescriptionItem,
  type ClinicVitals,
  type DoctorMedicine,
} from "@/lib/clinic/types";
import { formatClinicalNotes } from "@/lib/doctor/notes";
import { updateAppointment } from "@/lib/doctor/api";
import { formatDate, formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { FileDown, Loader2, Plus, Printer, Trash2, Upload } from "lucide-react";

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
  const [history, setHistory] = useState<ClinicEmrVisit[]>([]);
  const [docs, setDocs] = useState<ClinicPatientDocument[]>([]);
  const [medicines, setMedicines] = useState<DoctorMedicine[]>([]);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [vitals, setVitals] = useState<Omit<ClinicVitals, "id" | "consultation_id">>(emptyVitals());
  const [vitalsStamp, setVitalsStamp] = useState<string | null>(null);
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
          setVitalsStamp(existing.vitals.recorded_at ?? null);
        }
        setRxInstructions(existing.prescription?.instructions ?? "");
        if (existing.prescription?.items?.length) {
          setItems(existing.prescription.items);
        }
      }
      if (apt?.patient_id) {
        const [records, documents, meds] = await Promise.all([
          getPatientEmrHistory(apt.patient_id),
          getPatientDocuments(apt.patient_id),
          getDoctorMedicines(doctorProfile.id),
        ]);
        setHistory(records);
        setDocs(documents);
        setMedicines(meds);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to open consultation"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, doctorProfile.id]);

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

  const padProps = useMemo(() => {
    if (!appointment) return null;
    return {
      doctorName: profile.full_name,
      specialization: doctorProfile.specialization,
      pmdcNumber: doctorProfile.pmdc_number,
      patientName: appointment.patient?.full_name ?? "Patient",
      patientCode: appointment.patient?.patient_code,
      age: calcAgeYears(appointment.patient?.date_of_birth),
      gender: appointment.patient?.gender,
      dateLabel: formatDate(new Date()),
      token: appointment.token_number,
      diagnosis,
      items,
      instructions: rxInstructions,
      followUp: followUpDate ? formatDate(followUpDate) : null,
      notes: treatmentNotes,
    };
  }, [
    appointment,
    profile.full_name,
    doctorProfile.specialization,
    doctorProfile.pmdc_number,
    diagnosis,
    items,
    rxInstructions,
    followUpDate,
    treatmentNotes,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!appointment || !padProps) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }

  const age = calcAgeYears(appointment.patient?.date_of_birth);
  const doseOptionsFor = (name: string) =>
    medicines.find((m) => m.name.toLowerCase() === name.trim().toLowerCase())?.dosage_options ?? [];

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
          <Link href="/doctor/patients" className="mt-1 inline-block text-xs text-brand-600 hover:underline">
            Patient registry
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Rx
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadPrescriptionPdf(
                padProps,
                `prescription-${appointment.patient?.patient_code ?? appointment.id}.pdf`
              )
            }
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF
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

      <div className="hidden print:block">
        <PrescriptionPad {...padProps} />
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
            <CardTitle className="text-base">This visit vitals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vitalsStamp && vitalsHaveValues(vitals) && (
              <p className="text-xs text-muted-foreground">
                Recorded by reception {formatDate(vitalsStamp)} {formatTime(vitalsStamp)}
              </p>
            )}
            <VitalsForm value={vitals} onChange={setVitals} />
          </CardContent>
        </Card>
      </div>

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Prescription</CardTitle>
            <p className="text-xs text-muted-foreground">
              Select from your medicine list, then pick dosage.{" "}
              <Link href="/doctor/medicines" className="text-brand-600 hover:underline">
                Manage list
              </Link>
            </p>
          </div>
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
          {items.map((item, index) => {
            const options = doseOptionsFor(item.medicine_name);
            return (
              <div key={index} className="grid gap-2 sm:grid-cols-12">
                <MedicinePicker
                  medicines={medicines}
                  value={item.medicine_name}
                  onSelect={(med) =>
                    setItems((rows) =>
                      rows.map((r, i) =>
                        i === index
                          ? {
                              ...r,
                              medicine_name: med.name,
                              dose: "dosage_options" in med && med.dosage_options[0] && !r.dose
                                ? med.dosage_options[0]
                                : r.dose,
                            }
                          : r
                      )
                    )
                  }
                />
                {options.length > 0 ? (
                  <select
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm sm:col-span-2"
                    value={item.dose}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, dose: e.target.value } : r))
                      )
                    }
                  >
                    <option value="">Dose</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    {item.dose && !options.includes(item.dose) ? (
                      <option value={item.dose}>{item.dose}</option>
                    ) : null}
                  </select>
                ) : (
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
                )}
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
            );
          })}
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
        <CardHeader>
          <CardTitle className="text-base">Prescription pad preview</CardTitle>
        </CardHeader>
        <CardContent className="rounded-xl border bg-muted/20 p-4">
          <PrescriptionPad {...padProps} />
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
          <CardTitle className="text-base">Full visit history</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitHistoryTimeline visits={history} excludeAppointmentId={appointmentId} />
        </CardContent>
      </Card>
    </div>
  );
}
