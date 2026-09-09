import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendSystemPushForNotification } from "@/lib/notifications/server-push";
import { getErrorMessage } from "@/lib/errors";

/**
 * Record that the assigned doctor ended the video consultation, even if the
 * booked slot still has time remaining. Patient hangup must not complete the visit.
 */
export async function POST(request: Request) {
  const { supabase, json } = await createRouteHandlerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentId } = (await request.json()) as {
      appointmentId?: string;
    };
    if (!appointmentId) {
      return json({ error: "appointmentId is required" }, { status: 400 });
    }

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select(
        `
        id, status, patient_id, appointment_type,
        doctor:doctor_profiles!appointments_doctor_id_fkey ( user_id )
      `
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (fetchError) {
      return json({ error: fetchError.message }, { status: 500 });
    }
    if (!appointment) {
      return json({ error: "Appointment not found" }, { status: 404 });
    }

    const row = appointment as unknown as {
      id: string;
      status: string;
      patient_id: string;
      appointment_type: string;
      doctor: { user_id: string } | null;
    };
    if (row.doctor?.user_id !== user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (["cancelled", "no_show", "expired_no_show"].includes(row.status)) {
      return json({ error: "This appointment cannot be completed." }, { status: 409 });
    }
    if (row.status === "completed") {
      return json({ ok: true, status: "completed", alreadyCompleted: true });
    }
    if (!["scheduled", "ongoing"].includes(row.status)) {
      return json({ error: "This appointment cannot be completed." }, { status: 409 });
    }

    const completedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("appointments")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        status: "completed",
        completed_at: completedAt,
        video_room_url: null,
      } as any)
      .eq("id", appointmentId)
      .in("status", ["scheduled", "ongoing"]);

    if (updateError) {
      return json({ error: updateError.message }, { status: 500 });
    }

    try {
      const admin = createServiceRoleClient();
      await (admin as any).rpc("create_notification", {
        p_user_id: row.patient_id,
        p_title: "Consultation ended",
        p_message:
          "Your video consultation has ended. You can review this visit from Appointments.",
        p_type: "appointment",
        p_metadata: { appointment_id: appointmentId, ended_early: true },
      });
      await sendSystemPushForNotification({
        userId: row.patient_id,
        title: "Consultation ended",
        message:
          "Your video consultation has ended. You can review this visit from Appointments.",
        type: "appointment",
        metadata: { appointment_id: appointmentId, ended_early: true },
        url: `/patient/appointments?appointment=${appointmentId}`,
        tag: `appointment-ended-${appointmentId}`,
      });
    } catch {
      /* appointment is already recorded; notification is best-effort */
    }

    return json({ ok: true, status: "completed", completedAt });
  } catch (err) {
    return json(
      { error: getErrorMessage(err, "Internal error") },
      { status: 500 }
    );
  }
}
