import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { inviteOrganizationMemberWithEmail } from "@/lib/org/invite-server";
import type { OrganizationMemberRole } from "@/lib/org/types";

const ROLES: Array<Exclude<OrganizationMemberRole, "owner">> = ["doctor", "receptionist", "admin"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      organizationId?: string;
      email?: string;
      role?: Exclude<OrganizationMemberRole, "owner">;
      fullName?: string;
      phone?: string;
    };

    if (!body.organizationId || !body.email?.trim()) {
      return NextResponse.json({ error: "Clinic and email are required." }, { status: 400 });
    }
    if (!body.role || !ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invite role must be doctor, receptionist, or clinic admin." }, { status: 400 });
    }

    const result = await inviteOrganizationMemberWithEmail({
      organizationId: body.organizationId,
      email: body.email,
      role: body.role,
      fullName: body.fullName,
      phone: body.phone,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    const { ok: _ok, ...payload } = result;
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Could not send invite") },
      { status: 500 },
    );
  }
}
