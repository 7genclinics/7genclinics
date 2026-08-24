import type { ClinicStaffMember } from "./staff-server";

export async function getDoctorClinicStaff(): Promise<ClinicStaffMember[]> {
  const response = await fetch("/api/doctor/staff");
  const payload = (await response.json()) as { staff?: ClinicStaffMember[]; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load staff");
  }
  return payload.staff ?? [];
}

export async function createDoctorClinicStaffAccount(input: {
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
}) {
  const response = await fetch("/api/doctor/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as {
    staff?: ClinicStaffMember | null;
    emailSent?: boolean;
    emailError?: string;
    temporaryPassword?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create staff member");
  }
  return payload;
}

export async function setDoctorClinicStaffAccountActive(userId: string, isActive: boolean) {
  const response = await fetch(`/api/doctor/staff/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  const payload = (await response.json()) as { staff?: ClinicStaffMember | null; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to update staff member");
  }
  return payload.staff;
}
