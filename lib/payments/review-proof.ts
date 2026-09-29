import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/api";
import { GRACE_MINUTES_AFTER_START } from "@/lib/appointments/session-timing";

type ReviewAction = "approve" | "reject";

async function loadOwnedPayment(paymentId: string, doctorProfileId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, status, proof_url, appointment_id, patient_id, amount, doctor_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Payment not found");
  if (data.doctor_id !== doctorProfileId) {
    throw new Error("This payment is not for your appointments");
  }
  if (data.status !== "pending") throw new Error("Only pending payments can be reviewed");
  if (!data.appointment_id || !data.patient_id) {
    throw new Error("Payment is missing appointment details");
  }
  return {
    supabase,
    payment: {
      id: data.id,
      status: data.status,
      proof_url: data.proof_url,
      appointment_id: data.appointment_id,
      patient_id: data.patient_id,
      amount: data.amount,
      doctor_id: data.doctor_id,
    },
  };
}

/** Doctor reviews a patient payment screenshot and confirms or rejects the booking. */
export async function reviewPatientPaymentAsDoctor(input: {
  paymentId: string;
  doctorProfileId: string;
  reviewerUserId: string;
  action: ReviewAction;
  reason?: string;
}) {
  const { supabase, payment } = await loadOwnedPayment(input.paymentId, input.doctorProfileId);

  const { data: aptData, error: aptFetchError } = await supabase
    .from("appointments")
    .select("scheduled_at, status, appointment_type, doctor_id")
    .eq("id", payment.appointment_id)
    .maybeSingle();
  if (aptFetchError) throw new Error(aptFetchError.message);
  if (!aptData) throw new Error("Appointment for this payment was not found");

  const amountLabel = `PKR ${Math.round(Number(payment.amount)).toLocaleString("en-PK")}`;
  const now = new Date().toISOString();

  if (input.action === "reject") {
    const graceEndMs =
      new Date(aptData.scheduled_at).getTime() + GRACE_MINUTES_AFTER_START * 60_000;
    const slotPassed = Date.now() > graceEndMs;
    const rejectionReason =
      input.reason?.trim() ||
      (slotPassed
        ? "This appointment time has passed, so the payment cannot be confirmed. Please book a new slot."
        : "Payment proof could not be verified. Please upload a valid screenshot.");

    const { error } = await supabase
      .from("payments")
      .update({
        status: slotPassed ? "failed" : "pending",
        proof_url: null,
        reviewed_by: input.reviewerUserId,
        reviewed_at: now,
        rejection_reason: rejectionReason,
      })
      .eq("id", payment.id);
    if (error) throw new Error(error.message);

    if (slotPassed && aptData.status === "pending_payment") {
      const { error: cancelError } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancellation_reason: rejectionReason,
          cancelled_by: input.reviewerUserId,
        })
        .eq("id", payment.appointment_id);
      if (cancelError) throw new Error(cancelError.message);
    }

    await createNotification(
      payment.patient_id,
      "Payment rejected",
      slotPassed
        ? `${rejectionReason}`
        : `${rejectionReason} You can upload a new screenshot from My Appointments.`,
      "payment",
      { payment_id: payment.id, appointment_id: payment.appointment_id, event: "payment_rejected" }
    );

    return { ok: true as const, status: "rejected" as const, slotPassed };
  }

  if (!payment.proof_url) throw new Error("No payment proof uploaded yet");
  if (aptData.status !== "pending_payment") {
    throw new Error("This appointment is no longer awaiting payment confirmation");
  }

  const graceEndMs =
    new Date(aptData.scheduled_at).getTime() + GRACE_MINUTES_AFTER_START * 60_000;
  if (Date.now() > graceEndMs) {
    throw new Error(
      "This appointment's scheduled time has already passed, so it cannot be confirmed. Reject the proof so the patient can re-book."
    );
  }

  const txnId = `TXN-${payment.id.slice(0, 8).toUpperCase()}`;
  const { error: payError } = await supabase
    .from("payments")
    .update({
      status: "completed",
      transaction_id: txnId,
      reviewed_by: input.reviewerUserId,
      reviewed_at: now,
      rejection_reason: null,
      platform_fee: 0,
      doctor_earning: Number(payment.amount),
      payout_status: "paid",
      paid_at: now,
      paid_by: input.reviewerUserId,
    })
    .eq("id", payment.id);
  if (payError) throw new Error(payError.message);

  const { error: aptError } = await supabase
    .from("appointments")
    .update({ status: "scheduled" })
    .eq("id", payment.appointment_id);
  if (aptError) throw new Error(aptError.message);

  const when = new Date(aptData.scheduled_at).toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  });

  await createNotification(
    payment.patient_id,
    "Payment approved",
    `Your payment of ${amountLabel} was approved. Your appointment on ${when} is now confirmed.`,
    "payment",
    { payment_id: payment.id, appointment_id: payment.appointment_id, event: "payment_approved" }
  );

  return { ok: true as const, status: "approved" as const };
}
