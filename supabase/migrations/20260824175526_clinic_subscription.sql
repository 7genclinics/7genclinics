-- Clinic-wide subscription: manual proof, renewal reminders, grace, freeze.

CREATE OR REPLACE FUNCTION public.is_subscription_actor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('doctor', 'receptionist', 'admin', 'super_admin')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.clinic_pkt_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (timezone('Asia/Karachi', now()))::date;
$$;

CREATE TABLE IF NOT EXISTS public.clinic_subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  monthly_amount NUMERIC(12,2) NOT NULL CHECK (monthly_amount > 0),
  features TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.clinic_subscription_plans (id, name, description, monthly_amount, features, sort_order)
VALUES
  (
    'standard',
    'Clinic Standard',
    'Doctor and reception dashboards, queue, walk-in, and EMR for the clinic.',
    15000,
    ARRAY[
      'Doctor + reception access',
      'Queue, walk-in, and billing',
      'Prescriptions and patient records'
    ],
    1
  ),
  (
    'premium',
    'Clinic Premium',
    'Everything in Standard, with priority payment review and marketing eligibility.',
    25000,
    ARRAY[
      'Everything in Standard',
      'Priority subscription proof review',
      'Eligible for clinic marketing services'
    ],
    2
  )
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT 'default',
  plan_id TEXT NOT NULL REFERENCES public.clinic_subscription_plans(id),
  paid_through DATE NOT NULL,
  unfreeze_until TIMESTAMPTZ,
  last_reminder_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.clinic_subscriptions (slug, plan_id, paid_through)
SELECT
  'default',
  'standard',
  (date_trunc('month', timezone('Asia/Karachi', now()))::date + INTERVAL '1 month - 1 day')::date
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_subscriptions WHERE slug = 'default');

CREATE TABLE IF NOT EXISTS public.clinic_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.clinic_subscriptions(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.clinic_subscription_plans(id),
  billing_cycle TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  proof_url TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_sub_payments_status
  ON public.clinic_subscription_payments (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinic_sub_payments_cycle
  ON public.clinic_subscription_payments (billing_cycle);

ALTER TABLE public.clinic_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscription actors read plans" ON public.clinic_subscription_plans;
CREATE POLICY "Subscription actors read plans"
  ON public.clinic_subscription_plans FOR SELECT
  TO authenticated
  USING (public.is_subscription_actor());

DROP POLICY IF EXISTS "Admins manage subscription plans" ON public.clinic_subscription_plans;
CREATE POLICY "Admins manage subscription plans"
  ON public.clinic_subscription_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Subscription actors read clinic subscription" ON public.clinic_subscriptions;
CREATE POLICY "Subscription actors read clinic subscription"
  ON public.clinic_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_subscription_actor());

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
  USING (public.is_subscription_actor());

GRANT SELECT ON public.clinic_subscription_plans TO authenticated;
GRANT SELECT, UPDATE ON public.clinic_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.clinic_subscription_payments TO authenticated;

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
  v_title text;
  v_message text;
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

  IF v_phase IN ('renewal', 'grace', 'frozen')
     AND (v_sub.last_reminder_on IS DISTINCT FROM v_today) THEN
    IF v_phase = 'renewal' THEN
      v_title := 'Subscription renewal';
      v_message := format(
        'Clinic subscription renews in %s day%s. Submit payment proof to keep doctor and reception access.',
        v_days,
        CASE WHEN v_days = 1 THEN '' ELSE 's' END
      );
    ELSIF v_phase = 'grace' THEN
      v_title := 'Subscription grace period';
      v_message := format(
        'Payment is overdue. Grace period ends in %s day%s (by the 5th). Submit proof to avoid a clinic freeze.',
        v_days,
        CASE WHEN v_days = 1 THEN '' ELSE 's' END
      );
    ELSE
      v_title := 'Clinic access frozen';
      v_message := 'Subscription payment was not received. Doctor and reception dashboards are frozen until admin approves proof.';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    SELECT p.id, v_title, v_message, 'subscription', jsonb_build_object('kind', v_phase)
    FROM public.profiles p
    WHERE p.role IN ('doctor', 'receptionist')
      AND p.is_active = true;

    UPDATE public.clinic_subscriptions
    SET last_reminder_on = v_today, updated_at = now()
    WHERE id = v_sub.id;
  END IF;

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

CREATE OR REPLACE FUNCTION public.clinic_subscription_submit_payment(
  p_plan_id text,
  p_proof_url text,
  p_payment_method text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_sub public.clinic_subscriptions%ROWTYPE;
  v_plan public.clinic_subscription_plans%ROWTYPE;
  v_id uuid;
  v_cycle text;
  v_snap jsonb;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('doctor', 'receptionist') THEN
    RAISE EXCEPTION 'Only clinic staff can submit subscription payment';
  END IF;

  IF p_proof_url IS NULL OR length(trim(p_proof_url)) < 8 THEN
    RAISE EXCEPTION 'Payment proof is required';
  END IF;

  SELECT * INTO v_sub FROM public.clinic_subscriptions WHERE slug = 'default';
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
    payment_method, notes, submitted_by
  ) VALUES (
    v_sub.id, v_plan.id, v_cycle, v_plan.monthly_amount, trim(p_proof_url),
    NULLIF(trim(p_payment_method), ''), NULLIF(trim(p_notes), ''), auth.uid()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT
    p.id,
    'New subscription payment proof',
    format('A clinic subscription proof was submitted for %s (%s). Review it in Subscription.', v_plan.name, v_cycle),
    'subscription',
    jsonb_build_object('payment_id', v_id, 'kind', 'proof_submitted')
  FROM public.profiles p
  WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_subscription_review_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.clinic_subscription_payments%ROWTYPE;
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

  IF p_approve THEN
    v_cycle_date := to_date(v_pay.billing_cycle || '-01', 'YYYY-MM-DD');
    v_cycle_end := (date_trunc('month', v_cycle_date)::date + INTERVAL '1 month - 1 day')::date;

    UPDATE public.clinic_subscription_payments
    SET
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = NULL
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
    p.id,
    v_title,
    v_message,
    'subscription',
    jsonb_build_object('payment_id', p_payment_id, 'kind', CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END)
  FROM public.profiles p
  WHERE p.role IN ('doctor', 'receptionist') AND p.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_subscription_unfreeze(p_days int)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_until timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can unfreeze the clinic';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 30 THEN
    RAISE EXCEPTION 'Unfreeze days must be between 1 and 30';
  END IF;

  v_until := now() + make_interval(days => p_days);

  UPDATE public.clinic_subscriptions
  SET unfreeze_until = v_until, updated_at = now()
  WHERE slug = 'default';

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT
    p.id,
    'Temporary clinic access',
    format('Admin unfroze clinic access for %s day%s. Submit subscription payment before it expires.', p_days, CASE WHEN p_days = 1 THEN '' ELSE 's' END),
    'subscription',
    jsonb_build_object('kind', 'unfreeze', 'until', v_until)
  FROM public.profiles p
  WHERE p.role IN ('doctor', 'receptionist') AND p.is_active = true;

  RETURN v_until;
END;
$$;

REVOKE ALL ON FUNCTION public.is_subscription_actor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_pkt_today() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_subscription_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_subscription_submit_payment(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_subscription_review_payment(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_subscription_unfreeze(int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_subscription_actor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_subscription_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_subscription_submit_payment(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_subscription_review_payment(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_subscription_unfreeze(int) TO authenticated;

ALTER TABLE public.clinic_subscription_payments REPLICA IDENTITY FULL;
ALTER TABLE public.clinic_subscriptions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clinic_subscription_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_subscription_payments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clinic_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_subscriptions;
  END IF;
END $$;
