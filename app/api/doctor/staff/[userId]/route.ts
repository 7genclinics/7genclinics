import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import {
  listDoctorClinicStaff,
  requireApprovedDoctor,
  setDoctorClinicStaffActive,
} from "@/lib/doctor/staff-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireApprovedDoctor();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { userId } = await params;
    const body = (await request.json()) as { isActive?: boolean };

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive is required." }, { status: 400 });
    }

    await setDoctorClinicStaffActive(userId, body.isActive);
    const staff = await listDoctorClinicStaff();
    const updated = staff.find((member) => member.id === userId) ?? null;

    return NextResponse.json({ staff: updated });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update staff member") },
      { status: 500 }
    );
  }
}
