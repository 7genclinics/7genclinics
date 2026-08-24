import type {
  Appointment,
  AppointmentStatus,
  BookingSource,
  ClinicPaymentMethod,
  Gender,
  InvoiceStatus,
  Profile,
} from "@/types";

export const CLINIC_STATUSES: AppointmentStatus[] = [
  "checked_in",
  "waiting",
  "with_doctor",
  "payment_pending",
];

export const PHYSICAL_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "checked_in",
  "waiting",
  "with_doctor",
  "payment_pending",
  "completed",
  "cancelled",
  "no_show",
];

export function clinicStatusLabel(status: AppointmentStatus | string): string {
  const labels: Record<string, string> = {
    pending_payment: "Pending Payment",
    scheduled: "Scheduled",
    checked_in: "Checked In",
    waiting: "Waiting",
    with_doctor: "With Doctor",
    payment_pending: "Payment Pending",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
    expired_no_show: "Expired / No Show",
  };
  return labels[status] ?? status;
}

export function clinicStatusClass(status: AppointmentStatus | string): string {
  const map: Record<string, string> = {
    scheduled: "bg-cone-blue/10 text-cone-blue border-cone-blue/25",
    checked_in: "bg-cone-deep/10 text-cone-deep border-cone-deep/25",
    waiting: "bg-cone-teal/10 text-cone-steel border-cone-teal/30",
    with_doctor: "bg-cone-muted/15 text-cone-navy border-cone-muted/40",
    payment_pending: "bg-cone-steel/10 text-cone-steel border-cone-steel/25",
    completed: "bg-cone-teal/15 text-cone-navy border-cone-teal/30",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
    no_show: "bg-rose-50 text-rose-700 border-rose-200",
    pending_payment: "bg-cone-muted/15 text-cone-steel border-cone-muted/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
}

export function pktDayBounds(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const start = new Date(`${parts}T00:00:00+05:00`);
  const end = new Date(`${parts}T23:59:59.999+05:00`);
  return { day: parts, start: start.toISOString(), end: end.toISOString() };
}

export interface ClinicService {
  id: string;
  name: string;
  description: string | null;
  default_fee: number;
  is_active: boolean;
}

export interface ClinicDoctorOption {
  id: string;
  user_id: string;
  full_name: string;
  specialization: string;
  consultation_fee: number;
  is_available: boolean;
}

export interface ClinicAppointment extends Appointment {
  booking_source: BookingSource;
  token_number: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  called_at: string | null;
  queue_position: number | null;
  service_id: string | null;
  patient: Profile | null;
  doctor: {
    id: string;
    user_id: string;
    specialization: string;
    consultation_fee: number;
    profile: { full_name: string; email: string; phone: string | null } | null;
  } | null;
  service: ClinicService | null;
  payment?: { id: string; status: string; amount: number } | null;
  invoice?: ClinicInvoice | null;
}

export interface ClinicInvoice {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  notes: string | null;
  items?: ClinicInvoiceItem[];
  payments?: ClinicDeskPayment[];
}

export interface ClinicInvoiceItem {
  id: string;
  invoice_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ClinicDeskPayment {
  id: string;
  invoice_id: string;
  appointment_id: string;
  amount: number;
  method: ClinicPaymentMethod;
  received_by: string | null;
  received_at: string;
  notes: string | null;
}

export interface ClinicVitals {
  id?: string;
  consultation_id: string;
  blood_pressure: string | null;
  temperature: number | null;
  pulse: number | null;
  weight: number | null;
  height: number | null;
  spo2: number | null;
  recorded_at?: string;
  recorded_by?: string | null;
}

export interface ClinicPrescriptionItem {
  id?: string;
  medicine_name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
  sort_order: number;
}

export interface ClinicConsultation {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  chief_complaint: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment_notes: string | null;
  follow_up_date: string | null;
  completed_at: string | null;
  created_at: string;
  vitals?: ClinicVitals | null;
  prescription?: {
    id: string;
    instructions: string | null;
    items: ClinicPrescriptionItem[];
  } | null;
}

export const MEDICINE_CATEGORIES = [
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "drops",
  "ointment",
  "inhaler",
  "sachet",
  "other",
] as const;

export type MedicineCategory = (typeof MEDICINE_CATEGORIES)[number];

export interface MasterMedicine {
  id: string;
  name: string;
  category: string;
  dosage_options: string[];
  is_active: boolean;
}

export interface DoctorMedicine {
  id: string;
  doctor_id: string;
  master_medicine_id: string | null;
  name: string;
  category: string;
  dosage_options: string[];
  notes: string | null;
  is_active: boolean;
}

export interface ClinicEmrVisit {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  specialization: string | null;
  scheduled_at: string;
  token_number: string | null;
  appointment_type: string;
  status: string;
  chief_complaint: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment_notes: string | null;
  follow_up_date: string | null;
  completed_at: string | null;
  created_at: string;
  vitals: ClinicVitals | null;
  prescription: {
    id: string;
    instructions: string | null;
    items: ClinicPrescriptionItem[];
  } | null;
}

export function emptyVitals(): Omit<ClinicVitals, "id" | "consultation_id"> {
  return {
    blood_pressure: "",
    temperature: null,
    pulse: null,
    weight: null,
    height: null,
    spo2: null,
  };
}

export function vitalsHaveValues(vitals: Omit<ClinicVitals, "id" | "consultation_id"> | null | undefined) {
  if (!vitals) return false;
  return Boolean(
    vitals.blood_pressure?.trim() ||
      vitals.temperature != null ||
      vitals.pulse != null ||
      vitals.weight != null ||
      vitals.height != null ||
      vitals.spo2 != null
  );
}

export function calcBmi(weightKg: number | null | undefined, heightCm: number | null | undefined) {
  if (
    weightKg == null ||
    heightCm == null ||
    heightCm < 50 ||
    heightCm > 250 ||
    weightKg < 2 ||
    weightKg > 400
  ) {
    return null;
  }
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function bmiLabel(bmi: number | null) {
  if (bmi == null) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function cmToFeetInches(cm: number) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) return { feet: feet + 1, inches: 0 };
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number) {
  return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
}

export function validateVitals(vitals: Omit<ClinicVitals, "id" | "consultation_id">) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bp = vitals.blood_pressure?.trim() ?? "";
  if (bp && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(bp)) {
    errors.push("Blood pressure must look like 120/80.");
  }
  if (vitals.temperature != null && (vitals.temperature < 34 || vitals.temperature > 43)) {
    errors.push("Temperature must be between 34°C and 43°C.");
  } else if (vitals.temperature != null && (vitals.temperature < 35.5 || vitals.temperature > 38.5)) {
    warnings.push("Temperature is outside the usual range.");
  }
  if (vitals.pulse != null && (vitals.pulse < 30 || vitals.pulse > 220)) {
    errors.push("Pulse must be between 30 and 220.");
  }
  if (vitals.weight != null && (vitals.weight < 2 || vitals.weight > 400)) {
    errors.push("Weight must be between 2 kg and 400 kg.");
  }
  if (vitals.height != null && vitals.height < 50) {
    errors.push("Height looks too small for centimetres. Use cm, or switch to feet + inches (e.g. 5 ft 8 in).");
  } else if (vitals.height != null && vitals.height > 250) {
    errors.push("Height must be 250 cm or less.");
  }
  if (vitals.spo2 != null && (vitals.spo2 < 50 || vitals.spo2 > 100)) {
    errors.push("SpO2 must be between 50% and 100%.");
  }
  return { errors, warnings };
}

export interface WalkInInput {
  existingPatientId?: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  city?: string | null;
  doctorId: string;
  serviceId?: string | null;
  notes?: string;
}
