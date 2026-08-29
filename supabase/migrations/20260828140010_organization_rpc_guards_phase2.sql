-- Phase 2b: SECURITY DEFINER clinic RPCs must check the resource org.

CREATE OR REPLACE FUNCTION public.clinic_check_in(p_appointment_id uuid)
RETURNS TABLE (token_number text, status appointment_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_apt public.appointments%ROWTYPE;
  v_token text;
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
  IF v_apt.token_number IS NULL THEN v_token := public.clinic_next_token(v_apt.doctor_id); ELSE v_token := v_apt.token_number; END IF;
  UPDATE public.appointments SET
    token_number = v_token,
    checked_in_at = COALESCE(checked_in_at, now()),
    checked_in_by = COALESCE(checked_in_by, auth.uid()),
    status = 'waiting',
    queue_position = COALESCE(queue_position, (
      SELECT COALESCE(MAX(queue_position), 0) + 1 FROM public.appointments q
      WHERE q.doctor_id = v_apt.doctor_id
        AND q.organization_id = v_apt.organization_id
        AND (q.scheduled_at AT TIME ZONE 'Asia/Karachi')::date = (v_apt.scheduled_at AT TIME ZONE 'Asia/Karachi')::date
        AND q.token_number IS NOT NULL
    ))
  WHERE id = p_appointment_id
  RETURNING appointments.token_number, appointments.status INTO token_number, status;
  PERFORM public.clinic_write_audit('check_in', 'appointment', p_appointment_id, jsonb_build_object('token_number', token_number));
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
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_call_next(p_doctor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_apt_id uuid;
  v_token text;
  v_patient_name text;
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.doctor_profiles WHERE id = p_doctor_id;
  IF NOT (
    private.is_organization_operator(v_org)
    OR EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = p_doctor_id AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not allowed to call the next patient';
  END IF;
  SELECT id INTO v_apt_id FROM public.appointments
  WHERE doctor_id = p_doctor_id AND appointment_type = 'in_person' AND status = 'waiting'
    AND organization_id = v_org
    AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date
  ORDER BY queue_position NULLS LAST, checked_in_at NULLS LAST, scheduled_at
  LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_apt_id IS NULL THEN RAISE EXCEPTION 'No waiting patients'; END IF;
  UPDATE public.appointments SET status = 'with_doctor', called_at = now()
  WHERE id = v_apt_id RETURNING appointments.token_number INTO v_token;
  INSERT INTO public.consultations (appointment_id, patient_id, doctor_id)
  SELECT a.id, a.patient_id, a.doctor_id FROM public.appointments a WHERE a.id = v_apt_id
  ON CONFLICT (appointment_id) DO NOTHING;
  PERFORM public.clinic_write_audit('call_next', 'appointment', v_apt_id, jsonb_build_object('token_number', v_token));
  SELECT p.full_name INTO v_patient_name
  FROM public.appointments a JOIN public.profiles p ON p.id = a.patient_id WHERE a.id = v_apt_id;
  PERFORM public.create_notification(
    r.id, 'Patient called',
    format('%s (%s) is with the doctor.', COALESCE(v_patient_name, 'Patient'), COALESCE(v_token, '—')),
    'appointment', jsonb_build_object('appointment_id', v_apt_id, 'token_number', v_token)
  )
  FROM public.profiles r WHERE r.role = 'receptionist' AND r.is_active = true;
  RETURN v_apt_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_open_consultation(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT (
    private.is_organization_operator_for_appointment(p_appointment_id)
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN RAISE EXCEPTION 'Not allowed to open this consultation'; END IF;
  INSERT INTO public.consultations (appointment_id, patient_id, doctor_id)
  SELECT a.id, a.patient_id, a.doctor_id FROM public.appointments a WHERE a.id = p_appointment_id
  ON CONFLICT (appointment_id) DO UPDATE SET updated_at = now() RETURNING id INTO v_id;
  UPDATE public.appointments SET status = 'with_doctor', called_at = COALESCE(called_at, now())
  WHERE id = p_appointment_id AND status IN ('waiting', 'checked_in', 'scheduled');
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_ensure_consultation(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT (
    private.is_organization_operator_for_appointment(p_appointment_id)
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN RAISE EXCEPTION 'Not allowed to open this consultation'; END IF;
  INSERT INTO public.consultations (appointment_id, patient_id, doctor_id)
  SELECT a.id, a.patient_id, a.doctor_id FROM public.appointments a WHERE a.id = p_appointment_id
  ON CONFLICT (appointment_id) DO UPDATE SET updated_at = now() RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_record_vitals(
  p_appointment_id uuid,
  p_blood_pressure text DEFAULT NULL,
  p_temperature numeric DEFAULT NULL,
  p_pulse integer DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_height numeric DEFAULT NULL,
  p_spo2 numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE v_consult_id uuid; v_vitals_id uuid;
BEGIN
  IF NOT (
    private.is_organization_operator_for_appointment(p_appointment_id)
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN RAISE EXCEPTION 'Not allowed to record vitals'; END IF;
  v_consult_id := public.clinic_ensure_consultation(p_appointment_id);
  INSERT INTO public.vitals (
    consultation_id, blood_pressure, temperature, pulse, weight, height, spo2, recorded_at, recorded_by
  ) VALUES (
    v_consult_id, NULLIF(trim(p_blood_pressure), ''), p_temperature, p_pulse, p_weight, p_height, p_spo2, now(), auth.uid()
  )
  ON CONFLICT (consultation_id) DO UPDATE SET
    blood_pressure = EXCLUDED.blood_pressure, temperature = EXCLUDED.temperature, pulse = EXCLUDED.pulse,
    weight = EXCLUDED.weight, height = EXCLUDED.height, spo2 = EXCLUDED.spo2, recorded_at = now(), recorded_by = auth.uid()
  RETURNING id INTO v_vitals_id;
  PERFORM public.clinic_write_audit('record_vitals', 'appointment', p_appointment_id, jsonb_build_object('consultation_id', v_consult_id));
  RETURN v_vitals_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_ensure_invoice(p_appointment_id uuid, p_discount numeric DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_apt public.appointments%ROWTYPE;
  v_invoice_id uuid;
  v_number text;
  v_fee numeric(10,2);
  v_discount numeric(10,2);
  v_desc text;
BEGIN
  IF NOT (
    private.is_organization_operator_for_appointment(p_appointment_id)
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN RAISE EXCEPTION 'Not allowed to manage this invoice'; END IF;
  SELECT * INTO v_apt FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  SELECT id INTO v_invoice_id FROM public.invoices WHERE appointment_id = p_appointment_id;
  IF v_invoice_id IS NOT NULL THEN RETURN v_invoice_id; END IF;
  SELECT COALESCE(s.default_fee, v_apt.consultation_fee, 0), COALESCE(s.name, 'Consultation')
  INTO v_fee, v_desc FROM (SELECT 1) dummy LEFT JOIN public.services s ON s.id = v_apt.service_id;
  v_discount := GREATEST(0, COALESCE(p_discount, 0));
  IF v_discount > v_fee THEN v_discount := v_fee; END IF;
  v_number := 'INV-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYYYMMDD')
    || '-' || LPAD(nextval('public.patient_code_seq')::text, 4, '0');
  INSERT INTO public.invoices (
    appointment_id, patient_id, doctor_id, invoice_number, subtotal, discount, total, status, created_by
  ) VALUES (
    p_appointment_id, v_apt.patient_id, v_apt.doctor_id, v_number, v_fee, v_discount, v_fee - v_discount, 'issued', auth.uid()
  ) RETURNING id INTO v_invoice_id;
  INSERT INTO public.invoice_items (invoice_id, service_id, description, quantity, unit_price, line_total)
  VALUES (v_invoice_id, v_apt.service_id, v_desc, 1, v_fee, v_fee);
  RETURN v_invoice_id;
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
         ELSE format('Payment pending for %s (%s).', COALESCE(v_patient_name, 'patient'), COALESCE(v_token, '—')) END,
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
DECLARE v_invoice_id uuid; v_payment_id uuid; v_total numeric(10,2);
BEGIN
  IF NOT private.is_organization_operator_for_appointment(p_appointment_id) THEN
    RAISE EXCEPTION 'Only reception or admin can collect payment';
  END IF;
  IF public.clinic_is_prepaid(p_appointment_id) THEN
    UPDATE public.appointments SET status = 'completed', completed_at = COALESCE(completed_at, now()) WHERE id = p_appointment_id;
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
  UPDATE public.appointments SET status = 'completed', completed_at = COALESCE(completed_at, now()) WHERE id = p_appointment_id;
  PERFORM public.clinic_write_audit('collect_payment', 'invoice', v_invoice_id, jsonb_build_object('method', p_method, 'amount', v_total, 'appointment_id', p_appointment_id));
  RETURN v_payment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_reassign_doctor(p_appointment_id uuid, p_doctor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE v_org uuid;
BEGIN
  IF NOT private.is_organization_operator_for_appointment(p_appointment_id) THEN
    RAISE EXCEPTION 'Only reception or admin can reassign doctors';
  END IF;
  SELECT organization_id INTO v_org FROM public.appointments WHERE id = p_appointment_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_profiles
    WHERE id = p_doctor_id AND status = 'approved' AND organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'Doctor not found or not in this clinic';
  END IF;
  UPDATE public.appointments SET doctor_id = p_doctor_id
  WHERE id = p_appointment_id AND status IN ('scheduled', 'checked_in', 'waiting', 'payment_pending');
  UPDATE public.consultations SET doctor_id = p_doctor_id
  WHERE appointment_id = p_appointment_id AND completed_at IS NULL;
  PERFORM public.clinic_write_audit('reassign_doctor', 'appointment', p_appointment_id, jsonb_build_object('doctor_id', p_doctor_id));
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_update_status(
  p_appointment_id uuid,
  p_status appointment_status,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
BEGIN
  IF NOT private.is_organization_operator_for_appointment(p_appointment_id) THEN
    RAISE EXCEPTION 'Only reception or admin can update clinic status';
  END IF;
  IF p_status NOT IN ('cancelled', 'no_show', 'scheduled', 'waiting', 'completed') THEN
    RAISE EXCEPTION 'Unsupported status change';
  END IF;
  UPDATE public.appointments SET
    status = p_status,
    cancellation_reason = CASE
      WHEN p_status IN ('cancelled', 'no_show') THEN COALESCE(NULLIF(trim(p_reason), ''), cancellation_reason)
      ELSE cancellation_reason
    END,
    cancelled_by = CASE WHEN p_status IN ('cancelled', 'no_show') THEN auth.uid() ELSE cancelled_by END,
    completed_at = CASE WHEN p_status = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE id = p_appointment_id;
  PERFORM public.clinic_write_audit('update_status', 'appointment', p_appointment_id, jsonb_build_object('status', p_status, 'reason', p_reason));
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
BEGIN
  SELECT organization_id INTO v_org FROM public.doctor_profiles WHERE id = p_doctor_id AND status = 'approved';
  IF v_org IS NULL THEN RAISE EXCEPTION 'Doctor not found or not approved'; END IF;
  IF NOT private.is_organization_operator(v_org) THEN
    RAISE EXCEPTION 'Only reception or admin can create walk-ins';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_patient_id AND role = 'patient') THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;
  v_service_id := p_service_id;
  IF v_service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.services WHERE id = v_service_id AND organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'Service is not in this clinic';
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

CREATE OR REPLACE FUNCTION public.clinic_desk_import_master_medicines(p_doctor_id uuid, p_medicine_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE v_count int;
BEGIN
  IF NOT private.is_organization_operator_for_doctor(p_doctor_id) THEN
    RAISE EXCEPTION 'Only clinic staff can add medicines for a doctor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = p_doctor_id) THEN
    RAISE EXCEPTION 'Doctor not found';
  END IF;
  INSERT INTO public.doctor_medicines (doctor_id, master_medicine_id, name, category, dosage_options)
  SELECT p_doctor_id, m.id, m.name, m.category, m.dosage_options
  FROM public.master_medicines m
  WHERE m.id = ANY (p_medicine_ids) AND m.is_active
  ON CONFLICT (doctor_id, name) DO UPDATE SET
    master_medicine_id = COALESCE(public.doctor_medicines.master_medicine_id, EXCLUDED.master_medicine_id),
    category = EXCLUDED.category,
    dosage_options = CASE
      WHEN COALESCE(array_length(public.doctor_medicines.dosage_options, 1), 0) = 0 THEN EXCLUDED.dosage_options
      ELSE public.doctor_medicines.dosage_options
    END,
    is_active = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.provision_walk_in_patient(
  p_full_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_gender gender DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, private
AS $function$
DECLARE
  v_user_id uuid;
  v_email text;
  v_phone text;
  v_instance_id uuid;
  v_password text;
  v_existing uuid;
BEGIN
  IF NOT private.is_any_organization_operator() THEN
    RAISE EXCEPTION 'Only reception or admin can register walk-in patients';
  END IF;
  v_phone := NULLIF(trim(p_phone), '');
  IF v_phone IS NULL THEN RAISE EXCEPTION 'Phone is required'; END IF;
  IF NULLIF(trim(p_full_name), '') IS NULL THEN RAISE EXCEPTION 'Full name is required'; END IF;
  SELECT p.id INTO v_existing
  FROM public.profiles p
  WHERE p.role = 'patient' AND p.phone = v_phone AND private.can_operate_profile(p.id)
  ORDER BY p.created_at
  LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  v_email := lower(NULLIF(trim(p_email), ''));
  IF v_email IS NULL THEN
    v_email := 'walkin.' || regexp_replace(v_phone, '[^0-9]', '', 'g') || '.'
      || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) || '@clinic.local';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;
  SELECT COALESCE((SELECT instance_id FROM auth.users LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid)
  INTO v_instance_id;
  v_user_id := gen_random_uuid();
  v_password := crypt(encode(gen_random_bytes(12), 'hex'), gen_salt('bf'));
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at,
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, v_user_id, 'authenticated', 'authenticated', v_email, v_password,
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', trim(p_full_name), 'role', 'patient', 'phone', v_phone, 'walk_in_provision', 'true', 'email', v_email),
    now(), now(), '', '', '', ''
  );
  UPDATE public.profiles SET
    full_name = trim(p_full_name), phone = v_phone, gender = p_gender, date_of_birth = p_date_of_birth,
    city = NULLIF(trim(p_city), ''), role = 'patient', account_status = 'approved', is_active = true,
    approved_by = auth.uid(), approved_at = now()
  WHERE id = v_user_id;
  PERFORM public.clinic_write_audit('register_walk_in_patient', 'patient', v_user_id, jsonb_build_object('phone', v_phone));
  RETURN v_user_id;
END;
$function$;
