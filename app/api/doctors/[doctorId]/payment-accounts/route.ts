import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  doctorReceivingAccounts,
  parseDoctorReceivingSettings,
} from "@/lib/payments/doctor-accounts";
import type { DoctorDocuments } from "@/lib/doctor/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ doctorId: string }> }
) {
  const { doctorId } = await context.params;
  if (!doctorId) {
    return Response.json({ error: "Doctor is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select("documents, profile:profiles!doctor_profiles_user_id_fkey ( full_name )")
    .eq("id", doctorId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!data) return Response.json({ accounts: [] });

  const documents = (data.documents ?? {}) as DoctorDocuments;
  const profile = data.profile as { full_name?: string } | { full_name?: string }[] | null;
  const doctorName = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
  const accounts = doctorReceivingAccounts(
    parseDoctorReceivingSettings(documents.payout_settings),
    doctorName ?? "Doctor"
  );

  return Response.json({ accounts });
}
