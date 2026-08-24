import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import type { SubscriptionPayment, SubscriptionSnapshot } from "./types";

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

function asPayment(raw: unknown): SubscriptionPayment | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const status = String(row.status ?? "pending");
  if (status !== "pending" && status !== "approved" && status !== "rejected") return null;
  return {
    id: String(row.id ?? ""),
    subscription_id: String(row.subscription_id ?? ""),
    plan_id: String(row.plan_id ?? ""),
    billing_cycle: String(row.billing_cycle ?? ""),
    amount: Number(row.amount ?? 0),
    proof_url: String(row.proof_url ?? ""),
    payment_method: row.payment_method ? String(row.payment_method) : null,
    notes: row.notes ? String(row.notes) : null,
    status,
    submitted_by: String(row.submitted_by ?? ""),
    submitted_at: String(row.submitted_at ?? ""),
    reviewed_by: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    rejection_reason: row.rejection_reason ? String(row.rejection_reason) : null,
    created_at: String(row.created_at ?? row.submitted_at ?? ""),
    plan_name: row.plan_name ? String(row.plan_name) : null,
  };
}

function asSnapshot(raw: unknown): SubscriptionSnapshot {
  const row = (raw ?? {}) as Record<string, unknown>;
  const plan = (row.plan ?? {}) as Record<string, unknown>;
  const payments = Array.isArray(row.payments)
    ? row.payments.map(asPayment).filter((p): p is SubscriptionPayment => Boolean(p?.id))
    : [];
  return {
    frozen: Boolean(row.frozen),
    phase: (row.phase as SubscriptionSnapshot["phase"]) ?? "ok",
    days_remaining: row.days_remaining == null ? null : Number(row.days_remaining),
    paid_through: String(row.paid_through ?? ""),
    grace_until: String(row.grace_until ?? ""),
    unfreeze_until: row.unfreeze_until ? String(row.unfreeze_until) : null,
    override_active: Boolean(row.override_active),
    billing_cycle: String(row.billing_cycle ?? ""),
    plan: {
      id: String(plan.id ?? "standard"),
      name: String(plan.name ?? "Clinic Standard"),
      description: String(plan.description ?? ""),
      monthly_amount: Number(plan.monthly_amount ?? 0),
      features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
      is_active: plan.is_active !== false,
      sort_order: Number(plan.sort_order ?? 0),
    },
    plans: Array.isArray(row.plans)
      ? (row.plans as Array<Record<string, unknown>>).map((p) => ({
          id: String(p.id),
          name: String(p.name),
          description: String(p.description ?? ""),
          monthly_amount: Number(p.monthly_amount ?? 0),
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
          is_active: p.is_active !== false,
          sort_order: Number(p.sort_order ?? 0),
        }))
      : [],
    pending: asPayment(row.pending) ?? payments.find((p) => p.status === "pending") ?? null,
    payments,
  };
}

export async function getSubscriptionSnapshot(): Promise<SubscriptionSnapshot> {
  const { data, error } = await db().rpc("clinic_subscription_snapshot");
  if (error) throw new Error(getErrorMessage(error, "Could not load subscription"));
  return asSnapshot(data);
}

export async function getSubscriptionPayments(): Promise<SubscriptionPayment[]> {
  const { data, error } = await db()
    .from("clinic_subscription_payments")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(getErrorMessage(error, "Could not load payment history"));
  return ((data ?? []) as unknown[])
    .map(asPayment)
    .filter((p): p is SubscriptionPayment => Boolean(p?.id));
}

export async function submitSubscriptionPayment(input: {
  planId: string;
  proofUrl: string;
  paymentMethod?: string;
  notes?: string;
}): Promise<string> {
  const { data, error } = await db().rpc("clinic_subscription_submit_payment", {
    p_plan_id: input.planId,
    p_proof_url: input.proofUrl,
    p_payment_method: input.paymentMethod || null,
    p_notes: input.notes || null,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not submit payment proof"));
  return String(data);
}

export async function reviewSubscriptionPayment(input: {
  paymentId: string;
  approve: boolean;
  rejectionReason?: string;
}): Promise<void> {
  const { error } = await db().rpc("clinic_subscription_review_payment", {
    p_payment_id: input.paymentId,
    p_approve: input.approve,
    p_rejection_reason: input.rejectionReason || null,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not review payment"));
}

export async function unfreezeSubscription(days: number): Promise<string> {
  const { data, error } = await db().rpc("clinic_subscription_unfreeze", {
    p_days: days,
  });
  if (error) throw new Error(getErrorMessage(error, "Could not unfreeze clinic"));
  return String(data);
}

export async function updateSubscriptionPlan(input: {
  id: string;
  name: string;
  description: string;
  monthly_amount: number;
  features: string[];
}): Promise<void> {
  const { error } = await db()
    .from("clinic_subscription_plans")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      monthly_amount: input.monthly_amount,
      features: input.features.map((f) => f.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw new Error(getErrorMessage(error, "Could not update plan"));
}
