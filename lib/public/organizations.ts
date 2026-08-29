import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/org/types";
import type { DoctorWithProfile } from "@/lib/patient/types";
import {
  BASE_DOCTOR_SELECT,
  DOCTOR_SELECT_WITH_TAXONOMY,
  resolveDoctorRows,
} from "@/lib/public/doctor-select";

export async function getListedOrganizationsServer(): Promise<Organization[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("status", "active")
    .eq("is_publicly_listed", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Organization[];
}

export async function getListedOrganizationBySlugServer(slug: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .eq("is_publicly_listed", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Organization | null) ?? null;
}

export async function getApprovedDoctorsForOrganizationServer(
  organizationId: string,
): Promise<DoctorWithProfile[]> {
  const supabase = await createClient();
  return resolveDoctorRows(
    await supabase
      .from("doctor_profiles")
      .select(DOCTOR_SELECT_WITH_TAXONOMY)
      .eq("status", "approved")
      .eq("organization_id", organizationId)
      .order("rating", { ascending: false }),
    async () =>
      await supabase
        .from("doctor_profiles")
        .select(BASE_DOCTOR_SELECT)
        .eq("status", "approved")
        .eq("organization_id", organizationId)
        .order("rating", { ascending: false }),
  );
}
