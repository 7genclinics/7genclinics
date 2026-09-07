import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/errors";
import { BRAND } from "@/lib/brand/site";
import { generateStaffPassword } from "@/lib/doctor/staff-server";
import { FULL_RECEPTION_PERMISSIONS, receptionPermissionsPayload } from "@/lib/doctor/reception-permissions";
import type { Json } from "@/types/database";
import type { OrganizationInvite, OrganizationInviteResult, OrganizationMemberRole } from "@/lib/org/types";
import {
  sendOrganizationAddedEmail,
  sendOrganizationJoinInviteEmail,
  sendStaffCredentialsEmail,
} from "@/lib/org/invite-email";

function asInviteResult(data: unknown): OrganizationInviteResult {
  return data as OrganizationInviteResult;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false as const, status: 401, message: "Not authenticated." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    ok: true as const,
    supabase,
    userId: user.id,
    name: (profile?.full_name as string | undefined) || "Clinic team",
  };
}

async function organizationName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !data?.name) throw new Error("Clinic not found");
  return data.name as string;
}

function displayNameFromEmail(email: string, fullName?: string) {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0] ?? "Colleague";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function loginPathForRole(role: OrganizationMemberRole | string) {
  if (role === "receptionist") return "/login?role=receptionist&redirect=/reception/dashboard";
  if (role === "doctor") return "/login?role=doctor&redirect=/doctor/dashboard";
  return "/login";
}

export async function inviteOrganizationMemberWithEmail(input: {
  organizationId: string;
  email: string;
  role: Exclude<OrganizationMemberRole, "owner">;
  fullName?: string;
  phone?: string;
}) {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const email = input.email.trim().toLowerCase();
  const orgName = await organizationName(auth.supabase, input.organizationId);

  if (input.role === "receptionist") {
    const provisioned = await tryProvisionReceptionist({
      supabase: auth.supabase,
      organizationId: input.organizationId,
      email,
      fullName: displayNameFromEmail(email, input.fullName),
      phone: input.phone,
      invitedByName: auth.name,
      organizationName: orgName,
    });
    if (provisioned) return { ok: true as const, ...provisioned };
  }

  const { data, error } = await auth.supabase.rpc("invite_organization_member", {
    p_organization_id: input.organizationId,
    p_email: email,
    p_member_role: input.role,
  });
  if (error) {
    return { ok: false as const, status: 400, message: getErrorMessage(error, "Could not send invite") };
  }

  const result = asInviteResult(data);
  const mailed = await emailInviteResult({
    result,
    organizationName: orgName,
    invitedByName: auth.name,
  });
  return { ok: true as const, ...result, ...mailed };
}

async function tryProvisionReceptionist(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  organizationId: string;
  email: string;
  fullName: string;
  phone?: string;
  invitedByName: string;
  organizationName: string;
}) {
  const password = generateStaffPassword();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (input.supabase as any).rpc("provision_organization_receptionist", {
    p_organization_id: input.organizationId,
    p_email: input.email,
    p_password: password,
    p_full_name: input.fullName,
    p_phone: input.phone?.trim() ?? "",
    p_permissions: receptionPermissionsPayload(FULL_RECEPTION_PERMISSIONS) as Json,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already exists")) return null;
    throw new Error(getErrorMessage(error, "Could not create reception login"));
  }

  const emailResult = await sendStaffCredentialsEmail({
    to: input.email,
    name: input.fullName,
    email: input.email,
    password,
    invitedByName: input.invitedByName,
    organizationName: input.organizationName,
    roleLabel: "reception / staff",
    loginPath: loginPathForRole("receptionist"),
    subject: `Your ${BRAND.name} reception login`,
    heading: "Reception desk access",
  });

  return {
    status: "added" as const,
    organization_id: input.organizationId,
    user_id: String(data ?? ""),
    member_role: "receptionist" as const,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? undefined : emailResult.reason,
    temporaryPassword: emailResult.sent ? undefined : password,
  };
}

async function emailInviteResult(input: {
  result: OrganizationInviteResult;
  organizationName: string;
  invitedByName: string;
}) {
  if (input.result.status === "added") {
    const { data: profile } = await (await createClient())
      .from("profiles")
      .select("email")
      .eq("id", input.result.user_id)
      .maybeSingle();
    const to = String(profile?.email ?? "");
    const emailResult = to
      ? await sendOrganizationAddedEmail({
          to,
          organizationName: input.organizationName,
          role: input.result.member_role,
        })
      : { sent: false, reason: "Member email missing" };
    return {
      emailSent: emailResult.sent,
      emailError: emailResult.sent ? undefined : emailResult.reason,
    };
  }

  const emailResult = await sendOrganizationJoinInviteEmail({
    to: input.result.email,
    organizationName: input.organizationName,
    role: input.result.member_role,
    token: input.result.token,
  });
  return {
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? undefined : emailResult.reason,
  };
}

export async function resendOrganizationInviteEmail(inviteId: string) {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabase as any)
    .from("organization_invites")
    .select("id, organization_id, email, member_role, token, status, expires_at")
    .eq("id", inviteId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false as const, status: 404, message: "Invite not found" };
  }

  const invite = data as OrganizationInvite & { token: string };
  if (invite.status !== "pending") {
    return { ok: false as const, status: 400, message: "This invite is no longer pending" };
  }

  const orgName = await organizationName(auth.supabase, invite.organization_id);

  if (invite.member_role === "receptionist") {
    const provisioned = await tryProvisionReceptionist({
      supabase: auth.supabase,
      organizationId: invite.organization_id,
      email: invite.email,
      fullName: displayNameFromEmail(invite.email),
      invitedByName: auth.name,
      organizationName: orgName,
    });
    if (provisioned) {
      return { ok: true as const, ...provisioned };
    }
  }

  const emailResult = await sendOrganizationJoinInviteEmail({
    to: invite.email,
    organizationName: orgName,
    role: invite.member_role,
    token: invite.token,
  });

  return {
    ok: true as const,
    status: "invited" as const,
    organization_id: invite.organization_id,
    invite_id: invite.id,
    token: invite.token,
    email: invite.email,
    member_role: invite.member_role,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? undefined : emailResult.reason,
  };
}
