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
