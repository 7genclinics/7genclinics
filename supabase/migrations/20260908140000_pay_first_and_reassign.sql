-- Desk fee is collected when the patient arrives, then they join the doctor queue.
-- Completing a consult no longer sends them back to payment (unless they skipped the desk).

CREATE OR REPLACE FUNCTION public.clinic_check_in(p_appointment_id uuid)
RETURNS TABLE (token_number text, status appointment_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_apt public.appointments%ROWTYPE;
  v_token text;
  v_next appointment_status;
  v_prepaid boolean;
  v_doctor_user uuid;
  v_patient_name text;
BEGIN
  SELECT * INTO v_apt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF NOT private.is_organization_operator(v_apt.organization_id) THEN
    RAISE EXCEPTION 'Only reception or admin can check in patients';
  END IF;
  IF v_apt.appointment_type <> 'in_person' THEN RAISE EXCEPTION 'Only in-person appointments can be checked in'; END IF;
  IF v_apt.status IN ('cancelled', 'no_show', 'expired_no_show', 'completed') THEN
    RAISE EXCEPTION 'This appointment cannot be checked in';
  END IF;

  v_prepaid := public.clinic_is_prepaid(p_appointment_id);
  IF v_prepaid OR COALESCE(v_apt.consultation_fee, 0) <= 0 THEN
    v_next := 'waiting';
  ELSE
    v_next := 'payment_pending';
  END IF;

  IF v_apt.token_number IS NULL THEN v_token := public.clinic_next_token(v_apt.doctor_id); ELSE v_token := v_apt.token_number; END IF;
  UPDATE public.appointments SET
    token_number = v_token,
    checked_in_at = COALESCE(checked_in_at, now()),
    checked_in_by = COALESCE(checked_in_by, auth.uid()),
    status = v_next,
    queue_position = COALESCE(queue_position, (
      SELECT COALESCE(MAX(queue_position), 0) + 1 FROM public.appointments q
      WHERE q.doctor_id = v_apt.doctor_id
        AND q.organization_id = v_apt.organization_id
        AND (q.scheduled_at AT TIME ZONE 'Asia/Karachi')::date = (v_apt.scheduled_at AT TIME ZONE 'Asia/Karachi')::date
        AND q.token_number IS NOT NULL
    ))
  WHERE id = p_appointment_id
  RETURNING appointments.token_number, appointments.status INTO token_number, status;
  PERFORM public.clinic_write_audit('check_in', 'appointment', p_appointment_id, jsonb_build_object('token_number', token_number, 'status', status));

  IF v_next = 'waiting' THEN
    SELECT dp.user_id, p.full_name INTO v_doctor_user, v_patient_name
    FROM public.appointments a
    JOIN public.doctor_profiles dp ON dp.id = a.doctor_id
    JOIN public.profiles p ON p.id = a.patient_id
    WHERE a.id = p_appointment_id;
    IF v_doctor_user IS NOT NULL THEN
      PERFORM public.create_notification(
        v_doctor_user, 'Patient ready',
        format('Patient %s (%s) is ready.', COALESCE(v_patient_name, 'Unknown'), token_number),
        'appointment', jsonb_build_object('appointment_id', p_appointment_id, 'token_number', token_number)
      );
    END IF;
  END IF;
  RETURN NEXT;
END;
$function$;

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
  v_status appointment_status;
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
  v_status := CASE WHEN COALESCE(v_fee, 0) <= 0 THEN 'waiting'::appointment_status ELSE 'payment_pending'::appointment_status END;

  INSERT INTO public.appointments (
    patient_id, doctor_id, appointment_type, status, scheduled_at,
    duration_minutes, patient_notes, consultation_fee, booking_source,
    token_number, checked_in_at, checked_in_by, queue_position, service_id, organization_id
  ) VALUES (
    p_patient_id, p_doctor_id, 'in_person', v_status, now(), 30,
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
    jsonb_build_object('token_number', v_token, 'doctor_id', p_doctor_id, 'status', v_status)
  );
  RETURN v_apt_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_open_consultation(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE v_id uuid; v_status appointment_status;
BEGIN
  IF NOT (
    private.is_organization_operator_for_appointment(p_appointment_id)
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN RAISE EXCEPTION 'Not allowed to open this consultation'; END IF;

  SELECT status INTO v_status FROM public.appointments WHERE id = p_appointment_id;
  IF v_status = 'payment_pending' THEN
    RAISE EXCEPTION 'Collect desk payment before sending this patient to the doctor';
  END IF;

  INSERT INTO public.consultations (appointment_id, patient_id, doctor_id)
  SELECT a.id, a.patient_id, a.doctor_id FROM public.appointments a WHERE a.id = p_appointment_id
  ON CONFLICT (appointment_id) DO UPDATE SET updated_at = now() RETURNING id INTO v_id;
  UPDATE public.appointments SET status = 'with_doctor', called_at = COALESCE(called_at, now())
  WHERE id = p_appointment_id AND status IN ('waiting', 'checked_in', 'scheduled');
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_complete_consultation(p_appointment_id uuid)
RETURNS appointment_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE v_status appointment_status; v_prepaid boolean; v_token text; v_patient_name text;
BEGIN
  IF NOT (
    private.is_organization_operator_for_appointment(p_appointment_id)
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN RAISE EXCEPTION 'Not allowed to complete this consultation'; END IF;
  v_prepaid := public.clinic_is_prepaid(p_appointment_id);
  UPDATE public.consultations SET completed_at = COALESCE(completed_at, now()) WHERE appointment_id = p_appointment_id;
  IF v_prepaid THEN
    UPDATE public.appointments SET status = 'completed', completed_at = COALESCE(completed_at, now())
    WHERE id = p_appointment_id RETURNING appointments.status, appointments.token_number INTO v_status, v_token;
  ELSE
    PERFORM public.clinic_ensure_invoice(p_appointment_id, 0);
    UPDATE public.appointments SET status = 'payment_pending'
    WHERE id = p_appointment_id RETURNING appointments.status, appointments.token_number INTO v_status, v_token;
  END IF;
  PERFORM public.clinic_write_audit('complete_consultation', 'appointment', p_appointment_id, jsonb_build_object('status', v_status));
  SELECT p.full_name INTO v_patient_name FROM public.appointments a JOIN public.profiles p ON p.id = a.patient_id WHERE a.id = p_appointment_id;
  PERFORM public.create_notification(
    r.id,
    CASE WHEN v_prepaid THEN 'Consultation completed' ELSE 'Payment pending' END,
    CASE WHEN v_prepaid THEN format('Consultation completed for %s (%s).', COALESCE(v_patient_name, 'patient'), COALESCE(v_token, '—'))
         ELSE format('Payment still due for %s (%s).', COALESCE(v_patient_name, 'patient'), COALESCE(v_token, '—')) END,
    CASE WHEN v_prepaid THEN 'appointment' ELSE 'payment' END,
    jsonb_build_object('appointment_id', p_appointment_id, 'token_number', v_token)
  )
  FROM public.profiles r WHERE r.role IN ('receptionist', 'admin', 'super_admin') AND r.is_active = true;
  RETURN v_status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_collect_payment(
  p_appointment_id uuid,
  p_method clinic_payment_method,
  p_discount numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_invoice_id uuid;
  v_payment_id uuid;
  v_total numeric(10,2);
  v_consulted boolean;
  v_token text;
  v_patient_name text;
  v_doctor_user uuid;
  v_next appointment_status;
BEGIN
  IF NOT private.is_organization_operator_for_appointment(p_appointment_id) THEN
    RAISE EXCEPTION 'Only reception or admin can collect payment';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.appointment_id = p_appointment_id AND c.completed_at IS NOT NULL
  ) INTO v_consulted;

  v_next := CASE WHEN v_consulted THEN 'completed'::appointment_status ELSE 'waiting'::appointment_status END;

  IF public.clinic_is_prepaid(p_appointment_id) THEN
    UPDATE public.appointments
    SET status = v_next,
        completed_at = CASE WHEN v_next = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END
    WHERE id = p_appointment_id;
    RETURN NULL;
  END IF;

  v_invoice_id := public.clinic_ensure_invoice(p_appointment_id, p_discount);
  UPDATE public.invoices SET
    discount = GREATEST(0, COALESCE(p_discount, discount)),
    total = GREATEST(0, subtotal - GREATEST(0, COALESCE(p_discount, discount))),
    status = 'paid',
    notes = COALESCE(NULLIF(trim(p_notes), ''), notes)
  WHERE id = v_invoice_id RETURNING total INTO v_total;
  INSERT INTO public.clinic_payments (invoice_id, appointment_id, amount, method, received_by, notes)
  VALUES (v_invoice_id, p_appointment_id, v_total, p_method, auth.uid(), NULLIF(trim(p_notes), ''))
  RETURNING id INTO v_payment_id;
  UPDATE public.appointments
  SET status = v_next,
      completed_at = CASE WHEN v_next = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE id = p_appointment_id
  RETURNING appointments.token_number INTO v_token;
  PERFORM public.clinic_write_audit('collect_payment', 'invoice', v_invoice_id, jsonb_build_object('method', p_method, 'amount', v_total, 'appointment_id', p_appointment_id, 'next_status', v_next));

  IF v_next = 'waiting' THEN
    SELECT dp.user_id, p.full_name INTO v_doctor_user, v_patient_name
    FROM public.appointments a
    JOIN public.doctor_profiles dp ON dp.id = a.doctor_id
    JOIN public.profiles p ON p.id = a.patient_id
    WHERE a.id = p_appointment_id;
    IF v_doctor_user IS NOT NULL THEN
      PERFORM public.create_notification(
        v_doctor_user, 'Patient ready',
        format('Patient %s (%s) paid at the desk and is waiting.', COALESCE(v_patient_name, 'Unknown'), COALESCE(v_token, '—')),
        'appointment', jsonb_build_object('appointment_id', p_appointment_id, 'token_number', v_token)
      );
    END IF;
  END IF;

  RETURN v_payment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_reassign_doctor(p_appointment_id uuid, p_doctor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_org uuid;
  v_status appointment_status;
  v_updated int;
BEGIN
  IF NOT private.is_organization_operator_for_appointment(p_appointment_id) THEN
    RAISE EXCEPTION 'Only reception or admin can reassign doctors';
  END IF;
  SELECT organization_id, status INTO v_org, v_status FROM public.appointments WHERE id = p_appointment_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF v_status NOT IN ('scheduled', 'checked_in', 'waiting', 'payment_pending') THEN
    RAISE EXCEPTION 'Cannot reassign while the patient is with the doctor or the visit is closed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_profiles
    WHERE id = p_doctor_id AND status = 'approved' AND organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'Doctor not found or not in this clinic';
  END IF;
  UPDATE public.appointments SET doctor_id = p_doctor_id
  WHERE id = p_appointment_id AND status IN ('scheduled', 'checked_in', 'waiting', 'payment_pending');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Could not reassign this visit';
  END IF;
  UPDATE public.consultations SET doctor_id = p_doctor_id
  WHERE appointment_id = p_appointment_id AND completed_at IS NULL;
  PERFORM public.clinic_write_audit('reassign_doctor', 'appointment', p_appointment_id, jsonb_build_object('doctor_id', p_doctor_id));
END;
$function$;

-- Patients already waiting unpaid (not yet called) move to the desk payment stage.
UPDATE public.appointments a
SET status = 'payment_pending'
WHERE a.appointment_type = 'in_person'
  AND a.status IN ('checked_in', 'waiting')
  AND a.called_at IS NULL
  AND COALESCE(a.consultation_fee, 0) > 0
  AND NOT public.clinic_is_prepaid(a.id)
  AND (a.scheduled_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date;
