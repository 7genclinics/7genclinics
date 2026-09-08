import { createNotification } from "@/lib/notifications/api";

export type RescheduleActor = "patient" | "doctor" | "admin";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  });
}

async function safeNotify(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.warn("Reschedule notification skipped:", err);
  }
}

export async function notifyAppointmentRescheduled(params: {
  appointmentId: string;
  patientId: string;
  doctorUserId?: string | null;
  previousScheduledAt: string;
  scheduledAt: string;
  rescheduledBy: RescheduleActor;
  notifyPatient?: boolean;
  notifyDoctor?: boolean;
}): Promise<void> {
  const previousWhen = formatWhen(params.previousScheduledAt);
  const newWhen = formatWhen(params.scheduledAt);

  const patientTitle =
    params.rescheduledBy === "doctor"
      ? "Appointment rescheduled by your doctor"
      : params.rescheduledBy === "admin"
        ? "Appointment rescheduled by admin"
        : "Appointment rescheduled";

  const patientMessage =
    params.rescheduledBy === "doctor"
      ? `Your appointment moved from ${previousWhen} to ${newWhen}. Please check My Appointments.`
      : params.rescheduledBy === "admin"
        ? `An administrator moved your appointment from ${previousWhen} to ${newWhen}.`
        : `Your appointment is now on ${newWhen} (was ${previousWhen}).`;

  if (params.notifyPatient !== false) {
    await safeNotify(() =>
      createNotification(params.patientId, patientTitle, patientMessage, "appointment", {
        appointment_id: params.appointmentId,
        event: "rescheduled",
        rescheduled_by: params.rescheduledBy,
      }),
    );
  }

  if (params.notifyDoctor && params.doctorUserId) {
    await safeNotify(() =>
      createNotification(
        params.doctorUserId!,
        "Appointment rescheduled",
        `A visit moved from ${previousWhen} to ${newWhen}.`,
        "appointment",
        {
          appointment_id: params.appointmentId,
          event: "rescheduled",
          rescheduled_by: params.rescheduledBy,
        },
      ),
    );
  }

  await fetch("/api/appointments/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "rescheduled",
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      scheduledAt: params.scheduledAt,
      previousScheduledAt: params.previousScheduledAt,
      rescheduledBy: params.rescheduledBy,
    }),
  }).catch(() => {});
}
