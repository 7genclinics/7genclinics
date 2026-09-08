-- Walk-in was failing because reception could see every clinic's active services.
-- Map a same-named service onto the doctor's clinic, and allow admins to delete catalog rows.

CREATE OR REPLACE FUNCTION public.clinic_create_walk_in(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_service_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_apt_id uuid;
  v_fee numeric(10,2);
  v_service_id uuid;
  v_token text;
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.doctor_profiles WHERE id = p_doctor_id AND status = 'approved';
  IF v_org IS NULL THEN RAISE EXCEPTION 'Doctor not found or not approved'; END IF;
  IF NOT private.is_organization_operator(v_org) THEN
    RAISE EXCEPTION 'Only reception or admin can create walk-ins';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_patient_id AND role = 'patient') THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  v_service_id := NULL;
  IF p_service_id IS NOT NULL THEN
    SELECT s.id INTO v_service_id
    FROM public.services s
    WHERE s.id = p_service_id AND s.organization_id = v_org
    LIMIT 1;

    IF v_service_id IS NULL THEN
      SELECT s2.id INTO v_service_id
      FROM public.services s1
      JOIN public.services s2
        ON lower(trim(s2.name)) = lower(trim(s1.name))
       AND s2.organization_id = v_org
       AND s2.is_active
      WHERE s1.id = p_service_id
      ORDER BY s2.created_at
      LIMIT 1;
    END IF;
  END IF;

  IF v_service_id IS NULL THEN
    SELECT id INTO v_service_id FROM public.services
    WHERE is_active AND organization_id = v_org ORDER BY created_at LIMIT 1;
  END IF;

  SELECT COALESCE(s.default_fee, dp.consultation_fee, 0) INTO v_fee
  FROM public.doctor_profiles dp
  LEFT JOIN public.services s ON s.id = v_service_id
  WHERE dp.id = p_doctor_id;
  v_token := public.clinic_next_token(p_doctor_id);
  INSERT INTO public.appointments (
    patient_id, doctor_id, appointment_type, status, scheduled_at,
    duration_minutes, patient_notes, consultation_fee, booking_source,
    token_number, checked_in_at, checked_in_by, queue_position, service_id, organization_id
  ) VALUES (
    p_patient_id, p_doctor_id, 'in_person', 'checked_in', now(), 30,
    NULLIF(trim(p_notes), ''), COALESCE(v_fee, 0), 'walk_in', v_token, now(), auth.uid(),
    (
      SELECT COALESCE(MAX(queue_position), 0) + 1 FROM public.appointments
      WHERE doctor_id = p_doctor_id AND organization_id = v_org
        AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date
    ),
    v_service_id,
    v_org
  ) RETURNING id INTO v_apt_id;
  PERFORM public.clinic_write_audit(
    'create_walk_in', 'appointment', v_apt_id,
    jsonb_build_object('token_number', v_token, 'doctor_id', p_doctor_id)
  );
  RETURN v_apt_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_delete_service(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.services WHERE id = p_service_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;
  IF NOT private.is_organization_operator(v_org) THEN
    RAISE EXCEPTION 'Not allowed to delete this service';
  END IF;

  UPDATE public.appointments SET service_id = NULL WHERE service_id = p_service_id;
  UPDATE public.invoice_items SET service_id = NULL WHERE service_id = p_service_id;
  DELETE FROM public.services WHERE id = p_service_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.clinic_delete_service(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_delete_service(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated read active services" ON public.services;
CREATE POLICY "Read own clinic or admin services"
  ON public.services FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR private.is_organization_operator(organization_id)
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.doctor_public_services dps
        WHERE dps.service_id = services.id AND dps.is_visible
      )
    )
  );
