-- Persist the seeded paid period as history, and return every payment on snapshot.

INSERT INTO public.clinic_subscription_payments (
  subscription_id,
  plan_id,
  billing_cycle,
  amount,
  proof_url,
  payment_method,
  notes,
  status,
  submitted_by,
  submitted_at,
  reviewed_by,
  reviewed_at
)
SELECT
  s.id,
  s.plan_id,
  to_char(gs.month_start, 'YYYY-MM'),
  p.monthly_amount,
  '',
  'opening',
  'Paid period recorded when subscription was activated.',
  'approved',
  actor.id,
  COALESCE(s.created_at, now()),
  actor.id,
  COALESCE(s.created_at, now())
FROM public.clinic_subscriptions s
JOIN public.clinic_subscription_plans p ON p.id = s.plan_id
JOIN LATERAL (
  SELECT pr.id
  FROM public.profiles pr
  WHERE pr.is_active = true
    AND pr.role IN ('admin', 'super_admin', 'doctor', 'receptionist')
  ORDER BY
    CASE pr.role
      WHEN 'super_admin' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'doctor' THEN 2
      ELSE 3
    END,
    pr.created_at
  LIMIT 1
) actor ON true
CROSS JOIN LATERAL generate_series(
  date_trunc('month', timezone('Asia/Karachi', s.created_at))::date,
  date_trunc('month', s.paid_through)::date,
  INTERVAL '1 month'
) AS gs(month_start)
WHERE s.slug = 'default'
  AND NOT EXISTS (
    SELECT 1
    FROM public.clinic_subscription_payments pay
    WHERE pay.subscription_id = s.id
      AND pay.billing_cycle = to_char(gs.month_start, 'YYYY-MM')
  );

CREATE OR REPLACE FUNCTION public.clinic_subscription_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := public.clinic_pkt_today();
  v_sub public.clinic_subscriptions%ROWTYPE;
  v_plan public.clinic_subscription_plans%ROWTYPE;
  v_next date;
  v_grace date;
  v_phase text;
  v_frozen boolean;
  v_override boolean;
  v_days int;
  v_pending jsonb;
  v_plans jsonb;
  v_payments jsonb;
BEGIN
  IF NOT public.is_subscription_actor() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO v_sub FROM public.clinic_subscriptions WHERE slug = 'default' LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic subscription is not configured';
  END IF;

  SELECT * INTO v_plan FROM public.clinic_subscription_plans WHERE id = v_sub.plan_id;

  v_next := v_sub.paid_through + 1;
  v_grace := (date_trunc('month', v_next)::date + 4);
  v_override := v_sub.unfreeze_until IS NOT NULL AND v_sub.unfreeze_until > now();

  IF v_today <= v_sub.paid_through THEN
    v_frozen := false;
    IF EXTRACT(DAY FROM v_today) >= 28 THEN
      v_phase := 'renewal';
      v_days := (v_sub.paid_through - v_today);
    ELSE
      v_phase := 'ok';
      v_days := NULL;
    END IF;
  ELSIF v_today <= v_grace THEN
    v_frozen := false;
    v_phase := 'grace';
    v_days := (v_grace - v_today);
  ELSE
    v_phase := 'frozen';
    v_frozen := NOT v_override;
    v_days := 0;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.sort_order), '[]'::jsonb)
  INTO v_plans
  FROM public.clinic_subscription_plans p
  WHERE p.is_active;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(x) ORDER BY x.submitted_at DESC),
    '[]'::jsonb
  )
  INTO v_payments
  FROM (
    SELECT
      pay.id,
      pay.subscription_id,
      pay.plan_id,
      pay.billing_cycle,
      pay.amount,
      pay.proof_url,
      pay.payment_method,
      pay.notes,
      pay.status,
      pay.submitted_by,
      pay.submitted_at,
      pay.reviewed_by,
      pay.reviewed_at,
      pay.rejection_reason,
      pay.created_at,
      pl.name AS plan_name
    FROM public.clinic_subscription_payments pay
    LEFT JOIN public.clinic_subscription_plans pl ON pl.id = pay.plan_id
    WHERE pay.subscription_id = v_sub.id
  ) x;

  SELECT to_jsonb(pay) INTO v_pending
  FROM public.clinic_subscription_payments pay
  WHERE pay.subscription_id = v_sub.id AND pay.status = 'pending'
  ORDER BY pay.submitted_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'frozen', v_frozen,
    'phase', v_phase,
    'days_remaining', v_days,
    'paid_through', v_sub.paid_through,
    'grace_until', v_grace,
    'unfreeze_until', v_sub.unfreeze_until,
    'override_active', v_override,
    'billing_cycle', to_char(v_next, 'YYYY-MM'),
    'plan', to_jsonb(v_plan),
    'plans', v_plans,
    'pending', v_pending,
    'payments', v_payments
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
