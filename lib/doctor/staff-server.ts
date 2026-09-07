import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import type { Json } from "@/types/database";
import { BRAND } from "@/lib/brand/site";
import { sendStaffCredentialsEmail } from "@/lib/org/invite-email";
import {
  normalizeReceptionPermissions,
  receptionPermissionsPayload,
  type ReceptionPermissions,
} from "@/lib/doctor/reception-permissions";

export type ClinicStaffMember = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string | null;
  permissions: ReceptionPermissions;
};

export async function requireApprovedDoctor() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401, message: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false as const, status: 403, message: "Doctor profile not found." };
  }

  const typed = profile as Profile;
  if (typed.role !== "doctor" || !typed.is_active || typed.account_status !== "approved") {
    return { ok: false as const, status: 403, message: "Approved doctor access required." };
  }

  return { ok: true as const, profile: typed, userId: user.id };
}

export function generateStaffPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function listDoctorClinicStaff(): Promise<ClinicStaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_doctor_clinic_staff");
  if (error) throw error;
  return ((data ?? []) as Array<Omit<ClinicStaffMember, "permissions"> & { permissions?: unknown }>).map(
    (row) => ({
      ...row,
      permissions: normalizeReceptionPermissions(row.permissions),
    })
  );
}

export async function createDoctorClinicStaff(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  permissions: ReceptionPermissions;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("provision_clinic_staff", {
    p_email: input.email.trim().toLowerCase(),
    p_password: input.password,
    p_full_name: input.fullName.trim(),
    p_phone: input.phone?.trim() ?? "",
    p_role: "receptionist",
    p_permissions: receptionPermissionsPayload(input.permissions) as Json,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create staff member.");
  return data as string;
}

export async function setDoctorClinicStaffActive(userId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_doctor_clinic_staff_active", {
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) throw new Error(error.message);
}

export async function setDoctorClinicStaffPermissions(
  userId: string,
  permissions: ReceptionPermissions
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_doctor_clinic_staff_permissions", {
    p_user_id: userId,
    p_permissions: receptionPermissionsPayload(permissions) as Json,
  });
  if (error) throw new Error(error.message);
}

export async function sendClinicStaffInviteEmail(input: {
  to: string;
  staffName: string;
  doctorName: string;
  email: string;
  password: string;
}): Promise<{ sent: boolean; reason?: string }> {
  return sendStaffCredentialsEmail({
    to: input.to,
    name: input.staffName,
    email: input.email,
    password: input.password,
    invitedByName: input.doctorName,
    roleLabel: "reception / staff",
    loginPath: "/login?role=receptionist&redirect=/reception/dashboard",
    subject: `Your ${BRAND.name} reception login`,
    heading: "Reception desk access",
  });
}
