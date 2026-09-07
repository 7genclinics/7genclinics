import { getErrorMessage } from "@/lib/errors";
import type { OrganizationInviteResult, OrganizationMemberRole } from "./types";

export type OrganizationInviteResponse = OrganizationInviteResult & {
  emailSent: boolean;
  emailError?: string;
  temporaryPassword?: string;
};

export async function sendOrganizationInvite(input: {
  organizationId: string;
  email: string;
  role: Exclude<OrganizationMemberRole, "owner">;
  fullName?: string;
  phone?: string;
}): Promise<OrganizationInviteResponse> {
  const response = await fetch("/api/org/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as OrganizationInviteResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not send invite");
  }
  return payload;
}

export async function resendOrganizationInvite(inviteId: string): Promise<OrganizationInviteResponse> {
  const response = await fetch("/api/org/invite/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteId }),
  });
  const payload = (await response.json()) as OrganizationInviteResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? getErrorMessage(payload, "Could not resend invite"));
  }
  return payload;
}
