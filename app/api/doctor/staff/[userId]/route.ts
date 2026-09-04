import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import {
  listDoctorClinicStaff,
  requireApprovedDoctor,
  setDoctorClinicStaffActive,
  setDoctorClinicStaffPermissions,
} from "@/lib/doctor/staff-server";
import {
  hasAnyReceptionModule,
  normalizeReceptionPermissions,
} from "@/lib/doctor/reception-permissions";

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
    const body = (await request.json()) as { isActive?: boolean; permissions?: unknown };

    if (typeof body.isActive !== "boolean" && body.permissions === undefined) {
      return NextResponse.json({ error: "isActive or permissions is required." }, { status: 400 });
    }

    if (typeof body.isActive === "boolean") {
      await setDoctorClinicStaffActive(userId, body.isActive);
    }

    if (body.permissions !== undefined) {
      const permissions = normalizeReceptionPermissions(body.permissions);
      if (permissions.access === "specific" && !hasAnyReceptionModule(permissions)) {
        return NextResponse.json(
          { error: "Choose at least one area for specific access." },
          { status: 400 }
        );
      }
      await setDoctorClinicStaffPermissions(userId, permissions);
    }
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
