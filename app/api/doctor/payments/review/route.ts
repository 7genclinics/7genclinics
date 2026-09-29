import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { reviewPatientPaymentAsDoctor } from "@/lib/payments/review-proof";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: Request) {
  const { supabase, json } = await createRouteHandlerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "doctor") {
      return json({ error: "Only the assigned doctor can review this payment." }, { status: 403 });
    }

    const { data: doctor } = await supabase
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!doctor) return json({ error: "Doctor profile not found" }, { status: 403 });

    const body = (await request.json()) as {
      paymentId?: string;
      action?: "approve" | "reject";
      reason?: string;
    };

    if (!body.paymentId || (body.action !== "approve" && body.action !== "reject")) {
      return json({ error: "paymentId and action are required" }, { status: 400 });
    }

    const result = await reviewPatientPaymentAsDoctor({
      paymentId: body.paymentId,
      doctorProfileId: doctor.id,
      reviewerUserId: user.id,
      action: body.action,
      reason: body.reason,
    });

    return json(result);
  } catch (error) {
    return json({ error: getErrorMessage(error, "Could not review payment") }, { status: 400 });
  }
}
