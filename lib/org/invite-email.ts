import { BRAND } from "@/lib/brand/site";
import {
  appPublicUrl,
  brandedEmailHtml,
  escapeEmailHtml,
  sendResendEmail,
} from "@/lib/email/resend";
import type { OrganizationMemberRole } from "@/lib/org/types";

function roleLabel(role: OrganizationMemberRole | string) {
  if (role === "receptionist") return "receptionist";
  if (role === "doctor") return "doctor";
  if (role === "admin") return "clinic admin";
  if (role === "owner") return "clinic owner";
  return role;
}

export async function sendOrganizationAddedEmail(input: {
  to: string;
  organizationName: string;
  role: OrganizationMemberRole | string;
}): Promise<{ sent: boolean; reason?: string }> {
  const loginUrl = `${appPublicUrl()}/login`;
  const html = brandedEmailHtml(
    "Added to a clinic",
    `
      <p>You were added to <strong>${escapeEmailHtml(input.organizationName)}</strong> as ${escapeEmailHtml(roleLabel(input.role))} on ${escapeEmailHtml(BRAND.name)}.</p>
      <p>Sign in with this email to open the clinic workspace.</p>
      <a href="${loginUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a>
    `,
  );
  return sendResendEmail({
    to: input.to,
    subject: `You were added to ${input.organizationName}`,
    html,
  });
}

export async function sendOrganizationJoinInviteEmail(input: {
  to: string;
  organizationName: string;
  role: OrganizationMemberRole | string;
  token: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const joinUrl = `${appPublicUrl()}/join/${encodeURIComponent(input.token)}`;
  const registerUrl =
    input.role === "doctor" || input.role === "admin"
      ? `${appPublicUrl()}/register?role=doctor&email=${encodeURIComponent(input.to)}&redirect=${encodeURIComponent(`/join/${input.token}`)}`
      : joinUrl;
  const extra =
    input.role === "doctor" || input.role === "admin"
      ? `<p>If you do not have an account yet, create a doctor account first, then open the join link.</p>
         <a href="${registerUrl}" style="display:inline-block;margin:8px 12px 0 0;padding:12px 24px;background:#0284c7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Create doctor account</a>`
      : "";

  const html = brandedEmailHtml(
    "Clinic invite",
    `
      <p>You were invited to join <strong>${escapeEmailHtml(input.organizationName)}</strong> as ${escapeEmailHtml(roleLabel(input.role))} on ${escapeEmailHtml(BRAND.name)}.</p>
      <p>Use this email address: <strong>${escapeEmailHtml(input.to)}</strong></p>
      ${extra}
      <a href="${joinUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Accept invite</a>
      <p style="font-size:12px;color:#64748b;margin-top:20px">This link expires in 14 days.</p>
    `,
  );
  return sendResendEmail({
    to: input.to,
    subject: `Join ${input.organizationName} on ${BRAND.name}`,
    html,
  });
}

export async function sendStaffCredentialsEmail(input: {
  to: string;
  name: string;
  email: string;
  password: string;
  invitedByName: string;
  organizationName?: string;
  roleLabel: string;
  loginPath: string;
  subject: string;
  heading: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const loginUrl = `${appPublicUrl()}${input.loginPath}`;
  const clinicLine = input.organizationName
    ? `<p><strong>${escapeEmailHtml(input.invitedByName)}</strong> created a ${escapeEmailHtml(input.roleLabel)} login for you at <strong>${escapeEmailHtml(input.organizationName)}</strong>.</p>`
    : `<p><strong>${escapeEmailHtml(input.invitedByName)}</strong> created a ${escapeEmailHtml(input.roleLabel)} login for you on ${escapeEmailHtml(BRAND.name)}.</p>`;

  const html = brandedEmailHtml(
    input.heading,
    `
      <p>Hi ${escapeEmailHtml(input.name)},</p>
      ${clinicLine}
      <div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
        <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeEmailHtml(input.email)}</p>
        <p style="margin:0"><strong>Temporary password:</strong> ${escapeEmailHtml(input.password)}</p>
      </div>
      <p>Change this password after your first login if your clinic requires it.</p>
      <a href="${loginUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Open login</a>
    `,
  );
  return sendResendEmail({
    to: input.to,
    subject: input.subject,
    html,
  });
}
