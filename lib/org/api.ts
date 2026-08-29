import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import type {
  Organization,
  OrganizationInvite,
  OrganizationInviteResult,
  OrganizationKind,
  OrganizationMemberRole,
  OrganizationMemberRow,
} from "./types";

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await db()
    .from("organizations")
    .select("*")
    .order("name");
  if (error) throw new Error(getErrorMessage(error, "Could not load clinics"));
  return (data ?? []) as Organization[];
}

export async function listMyMemberships(): Promise<
  Array<{ organization_id: string; member_role: OrganizationMemberRole }>
> {
  const { data, error } = await db()
    .from("organization_members")
    .select("organization_id, member_role")
    .eq("is_active", true);
  if (error) throw new Error(getErrorMessage(error, "Could not load memberships"));
  return (data ?? []) as Array<{ organization_id: string; member_role: OrganizationMemberRole }>;
}

export async function listMyOrganizations(): Promise<Organization[]> {
  const supabase = db();
  const { data: memberships, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("is_active", true);
  if (memberError) throw new Error(getErrorMessage(memberError, "Could not load memberships"));
  const ids = [...new Set((memberships ?? []).map((row: { organization_id: string }) => row.organization_id))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .in("id", ids)
    .order("name");
  if (error) throw new Error(getErrorMessage(error, "Could not load clinics"));
  return (data ?? []) as Organization[];
}

export async function updateOrganization(input: {
  id: string;
  name?: string;
  city?: string | null;
  phone?: string | null;
  address?: string | null;
  listed?: boolean;
}): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = input.name.trim();
  if (input.city !== undefined) patch.city = input.city?.trim() || null;
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.address !== undefined) patch.address = input.address?.trim() || null;
  if (input.listed !== undefined) patch.is_publicly_listed = input.listed;
  const { error } = await db().from("organizations").update(patch).eq("id", input.id);
  if (error) throw new Error(getErrorMessage(error, "Could not update clinic"));
}

export async function createOrganization(input: {
  name: string;
  kind?: OrganizationKind;
  city?: string;
  phone?: string;
  address?: string;
  listed?: boolean;
}): Promise<string> {
  const { data, error } = await db().rpc("create_organization", {
    p_name: input.name.trim(),
    p_kind: input.kind ?? "clinic",
    p_city: input.city?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_address: input.address?.trim() || null,
    p_is_publicly_listed: Boolean(input.listed),
  });
  if (error) throw new Error(getErrorMessage(error, "Could not create clinic"));
  return String(data);
}

export async function listOrganizationMembers(organizationId: string): Promise<OrganizationMemberRow[]> {
  const { data, error } = await db()
    .from("organization_members")
    .select("id, organization_id, user_id, member_role, is_active, created_at, updated_at, profiles(full_name, email, role)")
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw new Error(getErrorMessage(error, "Could not load members"));
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const profile = (row.profiles ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id),
      organization_id: String(row.organization_id),
      user_id: String(row.user_id),
      member_role: row.member_role as OrganizationMemberRole,
      is_active: Boolean(row.is_active),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at ?? row.created_at),
      full_name: String(profile.full_name ?? ""),
      email: String(profile.email ?? ""),
      profile_role: String(profile.role ?? ""),
    };
  });
}

export async function listPendingInvites(organizationId: string): Promise<OrganizationInvite[]> {
  const { data, error } = await db()
    .from("organization_invites")
    .select("id, organization_id, email, member_role, status, expires_at, invited_by, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(getErrorMessage(error, "Could not load invites"));
  return (data ?? []) as OrganizationInvite[];
}

export async function inviteOrganizationMember(input: {
  organizationId: string;
  email: string;
  role: Exclude<OrganizationMemberRole, "owner">;
}): Promise<OrganizationInviteResult> {
  const { data, error } = await db().rpc("invite_organization_member", {
    p_organization_id: input.organizationId,
    p_email: input.email.trim().toLowerCase(),
    p_member_role: input.role,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not send invite"));
  return data as OrganizationInviteResult;
}

export async function revokeOrganizationInvite(inviteId: string): Promise<void> {
  const { error } = await db().rpc("revoke_organization_invite", { p_invite_id: inviteId });
  if (error) throw new Error(getErrorMessage(error, "Could not revoke invite"));
}

export async function acceptOrganizationInvite(token: string): Promise<string> {
  const { data, error } = await db().rpc("accept_organization_invite", { p_token: token });
  if (error) throw new Error(getErrorMessage(error, "Could not accept invite"));
  return String(data);
}

export function inviteJoinPath(token: string): string {
  return `/join/${token}`;
}
