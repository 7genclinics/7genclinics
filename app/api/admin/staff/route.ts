import { NextResponse } from "next/server";
import {
  createStaffMember,
  listStaffMembers,
  requireAdmin,
  requireSuperAdmin,
} from "@/lib/admin/staff-server";
import type { AdminPermissions } from "@/types";
import type { StaffAccessPreset } from "@/lib/admin/staff-permissions";
import { generateStaffPassword } from "@/lib/doctor/staff-server";
import { BRAND } from "@/lib/brand/site";
import { sendStaffCredentialsEmail } from "@/lib/org/invite-email";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const staff = await listStaffMembers();
    return NextResponse.json({ staff, canManage: auth.profile.role === "super_admin" });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load staff") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: "admin" | "super_admin" | "receptionist";
      accessPreset?: StaffAccessPreset;
      permissions?: Partial<AdminPermissions>;
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
    const role =
      body.role === "super_admin" ? "super_admin" : body.role === "receptionist" ? "receptionist" : "admin";
    const loginPath =
      role === "receptionist"
        ? "/login?role=receptionist&redirect=/reception/dashboard"
        : "/login?role=admin&redirect=/admin/dashboard";

    const userId = await createStaffMember({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      password,
      role,
      accessPreset: body.accessPreset ?? "operations",
      permissions: body.permissions,
      createdBy: auth.userId,
    });

    const emailResult = await sendStaffCredentialsEmail({
      to: body.email.trim().toLowerCase(),
      name: body.fullName.trim(),
      email: body.email.trim().toLowerCase(),
      password,
      invitedByName: auth.profile.full_name,
      roleLabel: role === "receptionist" ? "reception" : role === "super_admin" ? "super admin" : "admin",
      loginPath,
      subject: `Your ${BRAND.name} staff login`,
      heading: "Staff access",
    });

    const staff = await listStaffMembers();
    const created = staff.find((member) => member.id === userId);

    return NextResponse.json(
      {
        staff: created ?? null,
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
