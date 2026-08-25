import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import { BRAND } from "@/lib/brand/site";

export type ClinicStaffMember = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string | null;
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
  return (data ?? []) as ClinicStaffMember[];
}

export async function createDoctorClinicStaff(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("provision_clinic_staff", {
    p_email: input.email.trim().toLowerCase(),
    p_password: input.password,
    p_full_name: input.fullName.trim(),
    p_phone: input.phone?.trim() ?? "",
    p_role: "receptionist",
    p_permissions: {},
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

export async function sendClinicStaffInviteEmail(input: {
  to: string;
  staffName: string;
  doctorName: string;
  email: string;
  password: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://apnaclinic.pk").replace(/\/$/, "");
  const loginUrl = `${siteUrl}/login?role=receptionist&redirect=/reception/dashboard`;
  const from =
    process.env.RESEND_FROM ?? "Apna Clinic <noreply@stresssaviors.pk>";

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#0d9488,#0284c7);padding:28px 32px">
        <p style="margin:0;color:#fff;font-size:13px;letter-spacing:.12em;text-transform:uppercase">${BRAND.name}</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:22px">Reception desk access</h1>
      </div>
      <div style="padding:28px 32px;color:#334155;line-height:1.6">
        <p>Hi ${escapeHtml(input.staffName)},</p>
        <p>
          <strong>${escapeHtml(input.doctorName)}</strong> created a reception / staff login for you
          on ${BRAND.name}. Use these details to sign in to the front desk.
        </p>
        <div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
          <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
          <p style="margin:0"><strong>Temporary password:</strong> ${escapeHtml(input.password)}</p>
        </div>
        <p>Please change this password after your first login if your clinic requires it.</p>
        <a href="${loginUrl}"
           style="display:inline-block;margin-top:8px;padding:12px 24px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Open reception login
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">${BRAND.name} · Front desk access</p>
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Your ${BRAND.name} reception login`,
      html,
    }),
  });

  if (!res.ok) {
    const reason = await res.text();
    return { sent: false, reason };
  }

  return { sent: true };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
