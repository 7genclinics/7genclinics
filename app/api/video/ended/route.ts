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

    const { appointmentId, reason } = (await request.json()) as {
      appointmentId?: string;
      reason?: string;
    };
    if (!appointmentId) {
      return json({ error: "appointmentId is required" }, { status: 400 });
    }

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select(
        `
        id, status, patient_id, appointment_type, scheduled_at, duration_minutes,
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
      scheduled_at: string;
      duration_minutes: number;
      doctor: { user_id: string } | null;
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const isDoctor = row.doctor?.user_id === user.id;
    const isPatient = row.patient_id === user.id;
    const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

    const scheduledStart = new Date(row.scheduled_at).getTime();
    const duration = row.duration_minutes || 30;
    const scheduledEnd = scheduledStart + duration * 60_000;
    const isTimeExpired = Date.now() >= scheduledEnd || reason === "time_expired";

    // Doctor and admin can end at any time. Patient can end if scheduled slot has expired.
    if (!isDoctor && !isAdmin && !(isPatient && isTimeExpired)) {
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

    const endedBy = isTimeExpired ? "time_expired" : isDoctor ? "doctor" : "system";
    const patientMsg = isTimeExpired
      ? `Your ${duration}-minute scheduled consultation has concluded.`
      : "Your doctor has ended this video consultation. You can review the visit from Appointments.";

    try {
      const admin = createServiceRoleClient();
      await (admin as any).rpc("create_notification", {
        p_user_id: row.patient_id,
        p_title: "Consultation ended",
        p_message: patientMsg,
        p_type: "appointment",
        p_metadata: { appointment_id: appointmentId, ended_by: endedBy },
      });
      await sendSystemPushForNotification({
        userId: row.patient_id,
        title: "Consultation ended",
        message: patientMsg,
        type: "appointment",
        metadata: { appointment_id: appointmentId, ended_by: endedBy },
        url: `/patient/appointments?appointment=${appointmentId}`,
        tag: `appointment-ended-${appointmentId}`,
      });

      // If ended due to time expiration, also notify doctor
      if (isTimeExpired && row.doctor?.user_id) {
        const doctorMsg = `The ${duration}-minute scheduled consultation has concluded.`;
        await (admin as any).rpc("create_notification", {
          p_user_id: row.doctor.user_id,
          p_title: "Consultation ended",
          p_message: doctorMsg,
          p_type: "appointment",
          p_metadata: { appointment_id: appointmentId, ended_by: endedBy },
        });
      }
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
