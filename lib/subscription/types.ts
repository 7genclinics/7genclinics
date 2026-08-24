export type SubscriptionPhase = "ok" | "renewal" | "grace" | "frozen";
export type SubscriptionPaymentStatus = "pending" | "approved" | "rejected";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_amount: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  plan_id: string;
  billing_cycle: string;
  amount: number;
  proof_url: string;
  payment_method: string | null;
  notes: string | null;
  status: SubscriptionPaymentStatus;
  submitted_by: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  plan_name?: string | null;
}

export interface SubscriptionSnapshot {
  frozen: boolean;
  phase: SubscriptionPhase;
  days_remaining: number | null;
  paid_through: string;
  grace_until: string;
  unfreeze_until: string | null;
  override_active: boolean;
  billing_cycle: string;
  plan: SubscriptionPlan;
  plans: SubscriptionPlan[];
  pending: SubscriptionPayment | null;
  payments: SubscriptionPayment[];
}

export function formatBillingCycle(cycle: string): string {
  const [year, month] = cycle.split("-").map(Number);
  if (!year || !month) return cycle;
  return new Date(year, month - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

export function formatPkr(amount: number): string {
  return `PKR ${Math.round(Number(amount)).toLocaleString("en-PK")}`;
}

export function subscriptionStatusLabel(status: SubscriptionPaymentStatus): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending review";
}
