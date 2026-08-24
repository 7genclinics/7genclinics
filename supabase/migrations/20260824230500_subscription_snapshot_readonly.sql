-- Snapshot must be a cheap read. Writing notifications/last_reminder_on on every
-- page load locked the UI and made middleware wait on a mutating RPC.

CREATE OR REPLACE FUNCTION public.clinic_subscription_is_frozen()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := public.clinic_pkt_today();
  v_sub public.clinic_subscriptions%ROWTYPE;
  v_next date;
  v_grace date;
  v_override boolean;
BEGIN
  IF NOT public.is_subscription_actor() THEN
    RETURN false;
  END IF;

  SELECT * INTO v_sub FROM public.clinic_subscriptions WHERE slug = 'default' LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_next := v_sub.paid_through + 1;
  v_grace := (date_trunc('month', v_next)::date + 4);
  v_override := v_sub.unfreeze_until IS NOT NULL AND v_sub.unfreeze_until > now();

  IF v_today <= v_sub.paid_through OR v_today <= v_grace THEN
    RETURN false;
  END IF;

  RETURN NOT v_override;
END;
$$;

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
    'pending', v_pending
  );
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_subscription_is_frozen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_subscription_is_frozen() TO authenticated;

NOTIFY pgrst, 'reload schema';
