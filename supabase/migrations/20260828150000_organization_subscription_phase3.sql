-- Phase 3: per-organization subscription and freeze.
-- Lookup by organization_id, not slug = 'default'.
-- Platform admins without a membership still manage the default (Wasl) org.

CREATE OR REPLACE FUNCTION private.clinic_organization_id_for_user()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT COALESCE(
    (
      SELECT m.organization_id
      FROM public.organization_members m
      WHERE m.user_id = auth.uid() AND m.is_active = true
      ORDER BY
        CASE m.member_role
          WHEN 'owner' THEN 0
          WHEN 'admin' THEN 1
          WHEN 'receptionist' THEN 2
          WHEN 'doctor' THEN 3
          ELSE 4
        END,
        m.created_at
      LIMIT 1
    ),
    (
      SELECT dp.organization_id
      FROM public.doctor_profiles dp
      WHERE dp.user_id = auth.uid()
      LIMIT 1
    ),
    CASE
      WHEN public.is_admin() THEN private.default_organization_id()
      ELSE NULL
    END
  );
$$;

REVOKE ALL ON FUNCTION private.clinic_organization_id_for_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.clinic_organization_id_for_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.clinic_organization_id_for_user()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public, private
AS $$
  SELECT private.clinic_organization_id_for_user();
$$;

REVOKE ALL ON FUNCTION public.clinic_organization_id_for_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_organization_id_for_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.clinic_subscription_is_frozen()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $fn$
DECLARE
  v_today date := public.clinic_pkt_today();
  v_sub public.clinic_subscriptions%ROWTYPE;
  v_org uuid;
  v_next date;
  v_grace date;
  v_override boolean;
BEGIN
  IF NOT public.is_subscription_actor() THEN
    RETURN false;
  END IF;

  v_org := private.clinic_organization_id_for_user();
  IF v_org IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_sub
  FROM public.clinic_subscriptions
  WHERE organization_id = v_org
  LIMIT 1;
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
$fn$;

CREATE OR REPLACE FUNCTION public.clinic_subscription_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $fn$
DECLARE
  v_today date := public.clinic_pkt_today();
  v_sub public.clinic_subscriptions%ROWTYPE;
  v_plan public.clinic_subscription_plans%ROWTYPE;
  v_org uuid;
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

  v_org := private.clinic_organization_id_for_user();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No clinic organization for this account';
  END IF;

  SELECT * INTO v_sub
  FROM public.clinic_subscriptions
  WHERE organization_id = v_org
  LIMIT 1;
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

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.submitted_at DESC), '[]'::jsonb)
  INTO v_payments
  FROM (
    SELECT
      pay.id, pay.subscription_id, pay.plan_id, pay.billing_cycle, pay.amount,
      pay.proof_url, pay.payment_method, pay.notes, pay.status, pay.submitted_by,
      pay.submitted_at, pay.reviewed_by, pay.reviewed_at, pay.rejection_reason,
      pay.created_at, pl.name AS plan_name
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
    'organization_id', v_org,
    'plan', to_jsonb(v_plan),
    'plans', v_plans,
    'pending', v_pending,
    'payments', v_payments
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.clinic_subscription_submit_payment(
  p_plan_id text,
  p_proof_url text,
  p_payment_method text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $fn$
DECLARE
  v_sub public.clinic_subscriptions%ROWTYPE;
  v_plan public.clinic_subscription_plans%ROWTYPE;
  v_id uuid;
  v_cycle text;
  v_snap jsonb;
  v_org uuid;
BEGIN
  v_org := private.clinic_organization_id_for_user();
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = auth.uid()
      AND m.organization_id = v_org
      AND m.is_active = true
      AND m.member_role IN ('owner', 'admin', 'doctor', 'receptionist')
  ) THEN
    RAISE EXCEPTION 'Only clinic staff can submit subscription payment';
  END IF;

  IF p_proof_url IS NULL OR length(trim(p_proof_url)) < 8 THEN
    RAISE EXCEPTION 'Payment proof is required';
  END IF;

  SELECT * INTO v_sub FROM public.clinic_subscriptions WHERE organization_id = v_org;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic subscription is not configured';
  END IF;

  SELECT * INTO v_plan FROM public.clinic_subscription_plans
  WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid subscription plan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clinic_subscription_payments
    WHERE subscription_id = v_sub.id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A payment proof is already pending review';
  END IF;

  v_snap := public.clinic_subscription_snapshot();
  v_cycle := v_snap->>'billing_cycle';

  INSERT INTO public.clinic_subscription_payments (
    subscription_id, plan_id, billing_cycle, amount, proof_url,
    payment_method, notes, submitted_by, organization_id
  ) VALUES (
    v_sub.id, v_plan.id, v_cycle, v_plan.monthly_amount, trim(p_proof_url),
    NULLIF(trim(p_payment_method), ''), NULLIF(trim(p_notes), ''), auth.uid(), v_org
  )
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT
    p.id,
    'New subscription payment proof',
    format('A clinic subscription proof was submitted for %s (%s). Review it in Subscription.', v_plan.name, v_cycle),
    'subscription',
    jsonb_build_object('payment_id', v_id, 'kind', 'proof_submitted', 'organization_id', v_org)
  FROM public.profiles p
  WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true;

  RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.clinic_subscription_review_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $fn$
DECLARE
  v_pay public.clinic_subscription_payments%ROWTYPE;
  v_org uuid;
  v_cycle_date date;
  v_cycle_end date;
  v_title text;
  v_message text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can review subscription payments';
  END IF;

  SELECT * INTO v_pay FROM public.clinic_subscription_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  IF v_pay.status <> 'pending' THEN
    RAISE EXCEPTION 'This payment has already been reviewed';
  END IF;

  v_org := v_pay.organization_id;

  IF p_approve THEN
    v_cycle_date := to_date(v_pay.billing_cycle || '-01', 'YYYY-MM-DD');
    v_cycle_end := (date_trunc('month', v_cycle_date)::date + INTERVAL '1 month - 1 day')::date;

    UPDATE public.clinic_subscription_payments
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = NULL
    WHERE id = p_payment_id;

    UPDATE public.clinic_subscriptions
    SET
      plan_id = v_pay.plan_id,
      paid_through = GREATEST(paid_through, v_cycle_end),
      unfreeze_until = NULL,
      updated_at = now()
    WHERE id = v_pay.subscription_id;

    v_title := 'Subscription approved';
    v_message := format('Clinic subscription is active through %s. Access is restored.', v_cycle_end);
  ELSE
    IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) < 3 THEN
      RAISE EXCEPTION 'A rejection reason is required';
    END IF;

    UPDATE public.clinic_subscription_payments
    SET
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = trim(p_rejection_reason)
    WHERE id = p_payment_id;

    v_title := 'Subscription payment rejected';
    v_message := format('Payment proof for %s was rejected: %s', v_pay.billing_cycle, trim(p_rejection_reason));
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT
    m.user_id,
    v_title,
    v_message,
    'subscription',
    jsonb_build_object('payment_id', p_payment_id, 'kind', CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, 'organization_id', v_org)
  FROM public.organization_members m
  WHERE m.organization_id = v_org AND m.is_active = true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.clinic_subscription_unfreeze(p_days int)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $fn$
DECLARE
  v_until timestamptz;
  v_org uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can unfreeze the clinic';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 30 THEN
    RAISE EXCEPTION 'Unfreeze days must be between 1 and 30';
  END IF;

  v_org := private.clinic_organization_id_for_user();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No clinic organization for this account';
  END IF;

  v_until := now() + make_interval(days => p_days);

  UPDATE public.clinic_subscriptions
  SET unfreeze_until = v_until, updated_at = now()
  WHERE organization_id = v_org;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT
    m.user_id,
    'Temporary clinic access',
    format('Admin unfroze clinic access for %s day%s. Submit subscription payment before it expires.', p_days, CASE WHEN p_days = 1 THEN '' ELSE 's' END),
    'subscription',
    jsonb_build_object('kind', 'unfreeze', 'until', v_until, 'organization_id', v_org)
  FROM public.organization_members m
  WHERE m.organization_id = v_org AND m.is_active = true;

  RETURN v_until;
END;
$fn$;

DROP POLICY IF EXISTS "Subscription actors read clinic subscription" ON public.clinic_subscriptions;
CREATE POLICY "Subscription actors read clinic subscription"
  ON public.clinic_subscriptions FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR organization_id = private.clinic_organization_id_for_user()
  );

DROP POLICY IF EXISTS "Admins update clinic subscription" ON public.clinic_subscriptions;
CREATE POLICY "Admins update clinic subscription"
  ON public.clinic_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Subscription actors read payments" ON public.clinic_subscription_payments;
CREATE POLICY "Subscription actors read payments"
  ON public.clinic_subscription_payments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR organization_id = private.clinic_organization_id_for_user()
  );

NOTIFY pgrst, 'reload schema';
