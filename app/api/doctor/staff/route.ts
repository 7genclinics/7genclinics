import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import {
  createDoctorClinicStaff,
  generateStaffPassword,
  listDoctorClinicStaff,
  requireApprovedDoctor,
  sendClinicStaffInviteEmail,
} from "@/lib/doctor/staff-server";

export async function GET() {
  try {
    const auth = await requireApprovedDoctor();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const staff = await listDoctorClinicStaff();
    return NextResponse.json({ staff });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load staff") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedDoctor();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!body.fullName?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { error: "Full name and email are required." },
        { status: 400 }
      );
    }

    const password =
      body.password && body.password.length >= 6
        ? body.password
        : generateStaffPassword();

    const userId = await createDoctorClinicStaff({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      password,
    });

    const emailResult = await sendClinicStaffInviteEmail({
      to: body.email.trim().toLowerCase(),
      staffName: body.fullName.trim(),
      doctorName: auth.profile.full_name,
      email: body.email.trim().toLowerCase(),
      password,
    });

    const staff = await listDoctorClinicStaff();
    const created = staff.find((member) => member.id === userId) ?? null;

    return NextResponse.json(
      {
        staff: created,
        emailSent: emailResult.sent,
        emailError: emailResult.sent ? undefined : emailResult.reason,
        temporaryPassword: emailResult.sent ? undefined : password,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create staff member") },
      { status: 500 }
    );
  }
}
