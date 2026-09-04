import { createClient } from "@/lib/supabase/client";
import type { ClinicPaymentMethod, Gender, Profile } from "@/types";
import type { Database } from "@/types/database";
import { getErrorMessage } from "@/lib/errors";
import {
  getFlexibleSearchWords,
  matchesAnyFlexibleText,
} from "@/lib/search/flexible-match";
import { pktDayBounds } from "./types";
import type {
  ClinicAppointment,
  ClinicConsultation,
  ClinicDoctorOption,
  ClinicEmrVisit,
  ClinicInvoice,
  ClinicPrescriptionItem,
  ClinicService,
  ClinicVitals,
  DoctorMedicine,
  MasterMedicine,
  WalkInInput,
} from "./types";

type TableName = keyof Database["public"]["Tables"];

function table(name: TableName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient().from(name) as any;
}

function rpc(name: string, args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (createClient() as any).rpc(name, args);
}

const CLINIC_APPOINTMENT_SELECT = `
  *,
  patient:profiles!appointments_patient_id_fkey (
    id, full_name, email, phone, city, date_of_birth, gender, avatar_url, patient_code
  ),
  doctor:doctor_profiles!appointments_doctor_id_fkey (
    id, user_id, specialization, consultation_fee, is_available,
    profile:profiles!doctor_profiles_user_id_fkey ( full_name, email, phone )
  ),
  service:services ( id, name, description, default_fee, is_active ),
  payments ( id, status, amount ),
  invoices (
    id, appointment_id, patient_id, doctor_id, invoice_number,
    subtotal, discount, total, status, notes,
    invoice_items ( id, invoice_id, service_id, description, quantity, unit_price, line_total ),
    clinic_payments ( id, invoice_id, appointment_id, amount, method, received_by, received_at, notes )
  )
`;

function asInvoice(raw: unknown): ClinicInvoice | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const inv = row as ClinicInvoice & {
    invoice_items?: ClinicInvoice["items"];
    clinic_payments?: ClinicInvoice["payments"];
  };
  return {
    ...inv,
    items: inv.invoice_items ?? inv.items ?? [],
    payments: inv.clinic_payments ?? inv.payments ?? [],
  };
}

function asPayment(raw: unknown): ClinicAppointment["payment"] {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  return row as ClinicAppointment["payment"];
}

export function normalizeClinicAppointment(row: Record<string, unknown>): ClinicAppointment {
  return {
    ...(row as unknown as ClinicAppointment),
    payment: asPayment(row.payments ?? row.payment),
    invoice: asInvoice(row.invoices ?? row.invoice),
  };
}

export async function getReceptionContext(): Promise<
  | { ok: true; data: { profile: Profile } }
  | { ok: false; message: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You are not signed in." };
  }

  const { data: profile, error } = await table("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!profile) return { ok: false, message: "Profile not found." };

  const typed = profile as Profile;
  if (
    typed.role !== "receptionist" &&
    typed.role !== "admin" &&
    typed.role !== "super_admin"
  ) {
    return { ok: false, message: "Reception access required." };
  }

  return { ok: true, data: { profile: typed } };
}

export async function getClinicServices(includeInactive = false): Promise<ClinicService[]> {
  let query = table("services").select("*").order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ClinicService[];
}

export async function upsertClinicService(input: {
  id?: string;
  name: string;
  description?: string | null;
  default_fee: number;
  is_active: boolean;
}): Promise<ClinicService> {
  if (input.id) {
    const { data, error } = await table("services")
      .update({
        name: input.name.trim(),
        description: input.description ?? null,
        default_fee: input.default_fee,
        is_active: input.is_active,
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as ClinicService;
  }

  const { data, error } = await table("services")
    .insert({
      name: input.name.trim(),
      description: input.description ?? null,
      default_fee: input.default_fee,
      is_active: input.is_active,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ClinicService;
}

export async function getClinicDoctors(): Promise<ClinicDoctorOption[]> {
  const { data, error } = await table("doctor_profiles")
    .select(
      `
      id, user_id, specialization, consultation_fee, is_available, status,
      profile:profiles!doctor_profiles_user_id_fkey ( full_name )
    `
    )
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    user_id: string;
    specialization: string;
    consultation_fee: number;
    is_available: boolean | null;
    profile: { full_name: string } | null;
  }>).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: row.profile?.full_name ?? "Doctor",
    specialization: row.specialization,
    consultation_fee: Number(row.consultation_fee ?? 0),
    is_available: Boolean(row.is_available),
  }));
}

export async function getTodayClinicAppointments(doctorId?: string): Promise<ClinicAppointment[]> {
  const { start, end } = pktDayBounds();
  let query = table("appointments")
    .select(CLINIC_APPOINTMENT_SELECT)
    .eq("appointment_type", "in_person")
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .order("queue_position", { ascending: true, nullsFirst: false })
    .order("scheduled_at", { ascending: true });

  if (doctorId) query = query.eq("doctor_id", doctorId);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeClinicAppointment);
}

export async function searchClinicAppointments(queryText: string): Promise<ClinicAppointment[]> {
  const rows = await getTodayClinicAppointments();
  if (!queryText.trim()) return rows;
  return rows.filter((apt) =>
    matchesAnyFlexibleText(
      [
        apt.patient?.full_name,
        apt.patient?.phone,
        apt.patient?.patient_code,
        apt.token_number,
      ],
      queryText,
    ),
  );
}

export async function searchPatients(queryText: string): Promise<Profile[]> {
  const q = queryText.trim();
  if (q.length < 2) return [];

  const words = getFlexibleSearchWords(q);
  const searchWords = words.length > 0 ? words : [q.toLowerCase()];
  const escape = (value: string) => value.replace(/[%_\\]/g, "\\$&");
  const orFilter = searchWords
    .flatMap((word) => [
      `full_name.ilike.%${escape(word)}%`,
      `phone.ilike.%${escape(word)}%`,
      `email.ilike.%${escape(word)}%`,
      `patient_code.ilike.%${escape(word)}%`,
    ])
    .join(",");

  const { data, error } = await table("profiles")
    .select("*")
    .eq("role", "patient")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data ?? []) as Profile[])
    .filter((profile) =>
      matchesAnyFlexibleText(
        [profile.full_name, profile.phone, profile.email, profile.patient_code],
        q,
      ),
    )
    .slice(0, 20);
}

export async function getPatientById(patientId: string): Promise<Profile | null> {
  const { data, error } = await table("profiles")
    .select("*")
    .eq("id", patientId)
    .eq("role", "patient")
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateClinicPatient(input: {
  id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
}): Promise<Profile> {
  const { data, error } = await table("profiles")
    .update({
      full_name: input.full_name.trim(),
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      gender: input.gender,
      date_of_birth: input.date_of_birth || null,
    })
    .eq("id", input.id)
    .eq("role", "patient")
    .select("*")
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getPatientClinicHistory(patientId: string): Promise<ClinicAppointment[]> {
  const { data, error } = await table("appointments")
    .select(CLINIC_APPOINTMENT_SELECT)
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeClinicAppointment);
}

export async function getClinicAppointment(id: string): Promise<ClinicAppointment | null> {
  const { data, error } = await table("appointments")
    .select(CLINIC_APPOINTMENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeClinicAppointment(data as Record<string, unknown>);
}

export async function checkInAppointment(appointmentId: string) {
  const { data, error } = await rpc("clinic_check_in", { p_appointment_id: appointmentId });
  if (error) throw new Error(getErrorMessage(error, "Check-in failed"));
  const row = Array.isArray(data) ? data[0] : data;
  return row as { token_number: string; status: string };
}

export async function createWalkIn(input: WalkInInput): Promise<string> {
  let patientId = input.existingPatientId;
  if (!patientId) {
    const { data, error } = await rpc("provision_walk_in_patient", {
      p_full_name: input.fullName,
      p_phone: input.phone,
      p_email: input.email || null,
      p_gender: input.gender ?? null,
      p_date_of_birth: input.dateOfBirth || null,
      p_city: input.city || null,
    });
    if (error) throw new Error(getErrorMessage(error, "Could not register patient"));
    patientId = data as string;
  }

  const { data, error } = await rpc("clinic_create_walk_in", {
    p_patient_id: patientId,
    p_doctor_id: input.doctorId,
    p_service_id: input.serviceId ?? null,
    p_notes: input.notes || null,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not create walk-in"));
  return data as string;
}

export async function callNextPatient(doctorId: string): Promise<string> {
  const { data, error } = await rpc("clinic_call_next", { p_doctor_id: doctorId });
  if (error) throw new Error(getErrorMessage(error, "No waiting patients"));
  return data as string;
}

export async function openConsultation(appointmentId: string): Promise<string> {
  const { data, error } = await rpc("clinic_open_consultation", {
    p_appointment_id: appointmentId,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not open consultation"));
  return data as string;
}

export async function completeConsultation(appointmentId: string): Promise<string> {
  const { data, error } = await rpc("clinic_complete_consultation", {
    p_appointment_id: appointmentId,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not complete consultation"));
  return data as string;
}

export async function collectDeskPayment(input: {
  appointmentId: string;
  method: ClinicPaymentMethod;
  discount?: number;
  notes?: string;
}): Promise<string | null> {
  const { data, error } = await rpc("clinic_collect_payment", {
    p_appointment_id: input.appointmentId,
    p_method: input.method,
    p_discount: input.discount ?? 0,
    p_notes: input.notes || null,
  });
  if (error) throw new Error(getErrorMessage(error, "Payment collection failed"));
  return (data as string | null) ?? null;
}

export async function updateClinicStatus(
  appointmentId: string,
  status: "cancelled" | "no_show" | "scheduled" | "waiting" | "completed",
  reason?: string
) {
  const { error } = await rpc("clinic_update_status", {
    p_appointment_id: appointmentId,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) throw new Error(getErrorMessage(error, "Status update failed"));
}

export async function reassignClinicDoctor(appointmentId: string, doctorId: string) {
  const { error } = await rpc("clinic_reassign_doctor", {
    p_appointment_id: appointmentId,
    p_doctor_id: doctorId,
  });
  if (error) throw new Error(getErrorMessage(error, "Reassign failed"));
}

export async function getConsultationByAppointment(
  appointmentId: string
): Promise<ClinicConsultation | null> {
  const { data, error } = await table("consultations")
    .select(
      `
      *,
      vitals (*),
      prescriptions (
        id, instructions,
        prescription_items (*)
      )
    `
    )
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const vitalsRaw = row.vitals;
  const rxRaw = row.prescriptions;
  const rx = Array.isArray(rxRaw) ? rxRaw[0] : rxRaw;
  const vitals = Array.isArray(vitalsRaw) ? vitalsRaw[0] : vitalsRaw;

  return {
    ...(row as unknown as ClinicConsultation),
    vitals: (vitals as ClinicVitals) ?? null,
    prescription: rx
      ? {
          id: (rx as { id: string }).id,
          instructions: (rx as { instructions: string | null }).instructions,
          items: ((rx as { prescription_items?: ClinicPrescriptionItem[] }).prescription_items ??
            []) as ClinicPrescriptionItem[],
        }
      : null,
  };
}

export async function saveConsultationDraft(input: {
  consultationId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  treatmentNotes: string;
  followUpDate: string | null;
  vitals: Omit<ClinicVitals, "id" | "consultation_id">;
  prescriptionInstructions: string;
  items: ClinicPrescriptionItem[];
  recordedBy: string;
}): Promise<void> {
  const { error: consultError } = await table("consultations")
    .update({
      chief_complaint: input.chiefComplaint || null,
      symptoms: input.symptoms || null,
      diagnosis: input.diagnosis || null,
      treatment_notes: input.treatmentNotes || null,
      follow_up_date: input.followUpDate || null,
    })
    .eq("id", input.consultationId);
  if (consultError) throw consultError;

  const { data: existingVitals } = await table("vitals")
    .select("id")
    .eq("consultation_id", input.consultationId)
    .maybeSingle();

  const vitalsPayload = {
    consultation_id: input.consultationId,
    blood_pressure: input.vitals.blood_pressure || null,
    temperature: input.vitals.temperature,
    pulse: input.vitals.pulse,
    weight: input.vitals.weight,
    height: input.vitals.height,
    spo2: input.vitals.spo2,
  };

  if (existingVitals?.id) {
    const { error } = await table("vitals").update(vitalsPayload).eq("id", existingVitals.id);
    if (error) throw error;
  } else {
    const { error } = await table("vitals").insert({
      ...vitalsPayload,
      recorded_by: input.recordedBy,
    });
    if (error) throw error;
  }

  const { data: existingRx } = await table("prescriptions")
    .select("id")
    .eq("consultation_id", input.consultationId)
    .maybeSingle();

  let prescriptionId = existingRx?.id as string | undefined;
  if (prescriptionId) {
    const { error } = await table("prescriptions")
      .update({ instructions: input.prescriptionInstructions || null })
      .eq("id", prescriptionId);
    if (error) throw error;
    const { error: delError } = await table("prescription_items")
      .delete()
      .eq("prescription_id", prescriptionId);
    if (delError) throw delError;
  } else {
    const { data, error } = await table("prescriptions")
      .insert({
        consultation_id: input.consultationId,
        appointment_id: input.appointmentId,
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        instructions: input.prescriptionInstructions || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    prescriptionId = data.id as string;
  }

  const items = input.items
    .filter((item) => item.medicine_name.trim())
    .map((item, index) => ({
      prescription_id: prescriptionId,
      medicine_name: item.medicine_name.trim(),
      dose: item.dose || null,
      frequency: item.frequency || null,
      duration: item.duration || null,
      instructions: item.instructions || null,
      sort_order: index,
    }));

  if (items.length > 0) {
    const { error } = await table("prescription_items").insert(items);
    if (error) throw error;
  }
}

export async function getPendingInvoices(): Promise<ClinicAppointment[]> {
  const { data, error } = await table("appointments")
    .select(CLINIC_APPOINTMENT_SELECT)
    .eq("status", "payment_pending")
    .eq("appointment_type", "in_person")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeClinicAppointment);
}

export interface ClinicPatientDocument {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  consultation_id: string | null;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export async function getPatientDocuments(patientId: string): Promise<ClinicPatientDocument[]> {
  const supabase = createClient();
  const { data, error } = await table("patient_documents")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const rows = (data ?? []) as ClinicPatientDocument[];
  return Promise.all(
    rows.map(async (row) => {
      // Stored as storage path (preferred) or legacy public URL
      if (row.file_url.startsWith("http")) return row;
      const { data: signed } = await supabase.storage
        .from("patient-documents")
        .createSignedUrl(row.file_url, 60 * 60);
      return { ...row, file_url: signed?.signedUrl ?? row.file_url };
    })
  );
}

export async function uploadPatientDocument(input: {
  patientId: string;
  appointmentId?: string | null;
  consultationId?: string | null;
  file: File;
  uploadedBy: string;
}): Promise<ClinicPatientDocument> {
  const supabase = createClient();
  const ext = input.file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${input.patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("patient-documents")
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type || undefined,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await table("patient_documents")
    .insert({
      patient_id: input.patientId,
      appointment_id: input.appointmentId ?? null,
      consultation_id: input.consultationId ?? null,
      file_url: path,
      file_name: input.file.name,
      mime_type: input.file.type || null,
      uploaded_by: input.uploadedBy,
    })
    .select("*")
    .single();
  if (error) throw error;

  const doc = data as ClinicPatientDocument;
  const { data: signed } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(path, 60 * 60);
  return { ...doc, file_url: signed?.signedUrl ?? path };
}

export async function getDeskPayments(limit = 200): Promise<
  Array<{
    id: string;
    appointment_id: string;
    amount: number;
    method: string;
    received_at: string;
    invoice_id: string;
  }>
> {
  const { data, error } = await table("clinic_payments")
    .select("id, appointment_id, amount, method, received_at, invoice_id")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    appointment_id: string;
    amount: number;
    method: string;
    received_at: string;
    invoice_id: string;
  }>;
}

export async function ensureConsultation(appointmentId: string): Promise<string> {
  const { data, error } = await rpc("clinic_ensure_consultation", {
    p_appointment_id: appointmentId,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not open the visit record"));
  return data as string;
}

export async function recordVisitVitals(input: {
  appointmentId: string;
  vitals: Omit<ClinicVitals, "id" | "consultation_id">;
}): Promise<string> {
  const { data, error } = await rpc("clinic_record_vitals", {
    p_appointment_id: input.appointmentId,
    p_blood_pressure: input.vitals.blood_pressure || null,
    p_temperature: input.vitals.temperature,
    p_pulse: input.vitals.pulse,
    p_weight: input.vitals.weight,
    p_height: input.vitals.height,
    p_spo2: input.vitals.spo2,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not save vitals"));
  return data as string;
}

function mapEmrVisit(row: Record<string, unknown>): ClinicEmrVisit {
  const vitalsRaw = row.vitals;
  const rxRaw = row.prescriptions;
  const rx = Array.isArray(rxRaw) ? rxRaw[0] : rxRaw;
  const vitals = Array.isArray(vitalsRaw) ? vitalsRaw[0] : vitalsRaw;
  const doctor = row.doctor as
    | { specialization?: string; profile?: { full_name?: string } | { full_name?: string }[] }
    | null;
  const doctorProfile = Array.isArray(doctor?.profile) ? doctor?.profile[0] : doctor?.profile;
  const appointment = Array.isArray(row.appointment) ? row.appointment[0] : row.appointment;
  const apt = (appointment ?? {}) as {
    scheduled_at?: string;
    status?: string;
    token_number?: string | null;
    appointment_type?: string;
  };

  return {
    id: row.id as string,
    appointment_id: row.appointment_id as string,
    patient_id: row.patient_id as string,
    doctor_id: row.doctor_id as string,
    doctor_name: doctorProfile?.full_name ?? "Doctor",
    specialization: doctor?.specialization ?? null,
    scheduled_at: apt.scheduled_at ?? (row.created_at as string),
    token_number: apt.token_number ?? null,
    appointment_type: apt.appointment_type ?? "in_person",
    status: apt.status ?? "",
    chief_complaint: (row.chief_complaint as string | null) ?? null,
    symptoms: (row.symptoms as string | null) ?? null,
    diagnosis: (row.diagnosis as string | null) ?? null,
    treatment_notes: (row.treatment_notes as string | null) ?? null,
    follow_up_date: (row.follow_up_date as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    created_at: row.created_at as string,
    vitals: (vitals as ClinicVitals) ?? null,
    prescription: rx
      ? {
          id: (rx as { id: string }).id,
          instructions: (rx as { instructions: string | null }).instructions,
          items: ((rx as { prescription_items?: ClinicPrescriptionItem[] }).prescription_items ??
            []) as ClinicPrescriptionItem[],
        }
      : null,
  };
}

const EMR_SELECT = `
  *,
  vitals (*),
  prescriptions (
    id, instructions, appointment_id, created_at,
    prescription_items (*)
  ),
  doctor:doctor_profiles!consultations_doctor_id_fkey (
    id, specialization,
    profile:profiles!doctor_profiles_user_id_fkey ( full_name )
  ),
  appointment:appointments!consultations_appointment_id_fkey (
    id, scheduled_at, status, token_number, appointment_type
  )
`;

export async function getPatientEmrHistory(patientId: string): Promise<ClinicEmrVisit[]> {
  const { data, error } = await table("consultations")
    .select(EMR_SELECT)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapEmrVisit);
}

export async function getMasterMedicines(includeInactive = false): Promise<MasterMedicine[]> {
  let query = table("master_medicines").select("*").order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MasterMedicine[];
}

export async function upsertMasterMedicine(input: {
  id?: string;
  name: string;
  category: string;
  dosage_options: string[];
  is_active: boolean;
}): Promise<MasterMedicine> {
  const payload = {
    name: input.name.trim(),
    category: input.category,
    dosage_options: input.dosage_options.filter((d) => d.trim()),
    is_active: input.is_active,
  };
  if (input.id) {
    const { data, error } = await table("master_medicines")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as MasterMedicine;
  }
  const { data, error } = await table("master_medicines").insert(payload).select("*").single();
  if (error) throw error;
  return data as MasterMedicine;
}

export async function getDoctorMedicines(doctorId: string): Promise<DoctorMedicine[]> {
  const { data, error } = await table("doctor_medicines")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as DoctorMedicine[];
}

export async function getDoctorMedicinesAll(doctorId: string): Promise<DoctorMedicine[]> {
  const { data, error } = await table("doctor_medicines")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as DoctorMedicine[];
}

export async function upsertDoctorMedicine(input: {
  id?: string;
  doctor_id: string;
  name: string;
  category: string;
  dosage_options: string[];
  notes?: string | null;
  is_active?: boolean;
}): Promise<DoctorMedicine> {
  const payload = {
    doctor_id: input.doctor_id,
    name: input.name.trim(),
    category: input.category,
    dosage_options: input.dosage_options.filter((d) => d.trim()),
    notes: input.notes || null,
    is_active: input.is_active ?? true,
  };
  if (input.id) {
    const { data, error } = await table("doctor_medicines")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DoctorMedicine;
  }
  const { data, error } = await table("doctor_medicines").insert(payload).select("*").single();
  if (error) throw error;
  return data as DoctorMedicine;
}

export async function importMasterMedicines(ids: string[]): Promise<number> {
  const { data, error } = await rpc("clinic_import_master_medicines", {
    p_medicine_ids: ids,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not import medicines"));
  return Number(data ?? 0);
}

export async function importMasterMedicinesForDoctor(
  doctorId: string,
  ids: string[]
): Promise<number> {
  const { data, error } = await rpc("clinic_desk_import_master_medicines", {
    p_doctor_id: doctorId,
    p_medicine_ids: ids,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not import medicines for doctor"));
  return Number(data ?? 0);
}

export function calcAgeYears(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export type { Gender };
