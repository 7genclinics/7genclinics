export type OrganizationKind = "clinic" | "hospital" | "solo_practice";
export type OrganizationStatus = "pending" | "active" | "suspended" | "closed";
export type OrganizationMemberRole = "owner" | "admin" | "doctor" | "receptionist";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  kind: OrganizationKind;
  status: OrganizationStatus;
  is_publicly_listed: boolean;
  city: string | null;
  phone: string | null;
  address: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  member_role: OrganizationMemberRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  member_role: OrganizationMemberRole;
  token?: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  invited_by: string | null;
  created_at: string;
}

export interface OrganizationMemberRow extends OrganizationMember {
  full_name: string;
  email: string;
  profile_role: string;
}

export type OrganizationInviteResult =
  | {
      status: "added";
      organization_id: string;
      user_id: string;
      member_role: OrganizationMemberRole;
    }
  | {
      status: "invited";
      organization_id: string;
      invite_id: string;
      token: string;
      email: string;
      member_role: OrganizationMemberRole;
    };
