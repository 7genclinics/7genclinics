import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getErrorMessage } from "@/lib/errors";

/** Mark a consultation ongoing only after the assigned doctor joins Jitsi. */
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
        id, status,
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
      doctor: { user_id: string } | null;
    };
    if (row.doctor?.user_id !== user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (["cancelled", "completed", "no_show", "expired_no_show"].includes(row.status)) {
      return json({ error: "This appointment cannot be started." }, { status: 409 });
    }

    if (row.status === "scheduled") {
      const { error: updateError } = await supabase
        .from("appointments")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ status: "ongoing" } as any)
        .eq("id", appointmentId)
        .eq("status", "scheduled");
      if (updateError) {
        return json({ error: updateError.message }, { status: 500 });
      }
    }

    return json({ ok: true, status: "ongoing" });
  } catch (err) {
    return json(
      { error: getErrorMessage(err, "Internal error") },
      { status: 500 }
    );
  }
}
