import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import type { SubscriptionPayment, SubscriptionSnapshot } from "./types";

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

function asSnapshot(raw: unknown): SubscriptionSnapshot {
  const row = (raw ?? {}) as Record<string, unknown>;
  const plan = (row.plan ?? {}) as Record<string, unknown>;
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
    pending: (row.pending as SubscriptionPayment | null) ?? null,
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
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(getErrorMessage(error, "Could not load payment history"));
  return (data ?? []) as SubscriptionPayment[];
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
