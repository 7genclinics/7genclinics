import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { resendOrganizationInviteEmail } from "@/lib/org/invite-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { inviteId?: string };
    if (!body.inviteId) {
      return NextResponse.json({ error: "Invite id is required." }, { status: 400 });
    }

    const result = await resendOrganizationInviteEmail(body.inviteId);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    const { ok: _ok, ...payload } = result;
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Could not resend invite") },
      { status: 500 },
    );
  }
}
