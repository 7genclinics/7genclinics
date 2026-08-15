-- Physical clinic schema: extend existing appointments, add visit/billing tables,
-- receptionist role helpers, and atomic clinic RPCs.

CREATE TYPE public.booking_source AS ENUM ('online', 'walk_in');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'void');
CREATE TYPE public.clinic_payment_method AS ENUM ('cash', 'card', 'online');

-- ---------------------------------------------------------------------------
-- Patient codes
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.patient_code_seq START 1;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS patient_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_patient_code
  ON public.profiles (patient_code)
  WHERE patient_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_patient_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'patient' AND NEW.patient_code IS NULL THEN
    NEW.patient_code := 'PT-' || LPAD(nextval('public.patient_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_patient_code ON public.profiles;
CREATE TRIGGER trg_assign_patient_code
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_patient_code();

UPDATE public.profiles
SET patient_code = 'PT-' || LPAD(nextval('public.patient_code_seq')::text, 6, '0')
WHERE role = 'patient' AND patient_code IS NULL;

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.services (name, description, default_fee, is_active)
VALUES ('General Consultation', 'Standard in-clinic consultation', 2000, true);

-- ---------------------------------------------------------------------------
-- Appointments: physical clinic columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booking_source public.booking_source NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS token_number TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS queue_position INT,
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id);

CREATE INDEX IF NOT EXISTS idx_appointments_booking_source
  ON public.appointments (booking_source);
CREATE INDEX IF NOT EXISTS idx_appointments_token_number
  ON public.appointments (token_number);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_queue
  ON public.appointments (doctor_id, scheduled_at)
  WHERE appointment_type = 'in_person'
    AND status IN ('checked_in', 'waiting', 'with_doctor', 'payment_pending');

DROP INDEX IF EXISTS uq_appointments_doctor_slot;
CREATE UNIQUE INDEX uq_appointments_doctor_slot
  ON public.appointments (doctor_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show', 'expired_no_show')
    AND booking_source = 'online';

-- ---------------------------------------------------------------------------
-- Clinical records
-- ---------------------------------------------------------------------------
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id),
  chief_complaint TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  treatment_notes TEXT,
  follow_up_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON public.consultations (patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON public.consultations (doctor_id);

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES public.consultations(id) ON DELETE CASCADE,
  blood_pressure TEXT,
  temperature NUMERIC(4,1),
  pulse INT,
  weight NUMERIC(6,2),
  height NUMERIC(5,2),
  spo2 NUMERIC(5,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES public.consultations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id),
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON public.prescriptions (appointment_id);

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  duration TEXT,
  instructions TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id
  ON public.prescription_items (prescription_id);

-- ---------------------------------------------------------------------------
-- Billing (desk) — does not replace public.payments
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id),
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id),
  invoice_number TEXT NOT NULL UNIQUE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'issued',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices (patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);

CREATE TABLE public.clinic_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id),
  amount NUMERIC(10,2) NOT NULL,
  method public.clinic_payment_method NOT NULL,
  received_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_clinic_payments_invoice_id ON public.clinic_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_clinic_payments_appointment_id ON public.clinic_payments (appointment_id);

CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON public.patient_documents (patient_id);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

INSERT INTO public.platform_settings (key, value)
VALUES ('clinic_name', '"7Gen Clinic"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_receptionist()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'receptionist'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_admin() OR public.is_receptionist();
$$;

CREATE OR REPLACE FUNCTION public.is_appointment_doctor(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctor_profiles dp ON dp.id = a.doctor_id
    WHERE a.id = p_appointment_id
      AND dp.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_receptionist() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinic_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_appointment_doctor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_receptionist() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_appointment_doctor(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinic_write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_write_audit(text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_write_audit(text, text, uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Token + check-in
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinic_next_token(p_doctor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
  v_n int;
BEGIN
  v_day := (now() AT TIME ZONE 'Asia/Karachi')::date;
  SELECT COUNT(*)::int + 1 INTO v_n
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND token_number IS NOT NULL
    AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::date = v_day;
  RETURN 'A-' || LPAD(v_n::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_check_in(p_appointment_id uuid)
RETURNS TABLE (token_number text, status appointment_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt public.appointments%ROWTYPE;
  v_token text;
  v_doctor_user uuid;
  v_patient_name text;
BEGIN
  IF NOT public.is_clinic_staff() THEN
    RAISE EXCEPTION 'Only reception or admin can check in patients';
  END IF;

  SELECT * INTO v_apt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF v_apt.appointment_type <> 'in_person' THEN
    RAISE EXCEPTION 'Only in-person appointments can be checked in';
  END IF;

  IF v_apt.status IN ('cancelled', 'no_show', 'expired_no_show', 'completed') THEN
    RAISE EXCEPTION 'This appointment cannot be checked in';
  END IF;

  IF v_apt.token_number IS NULL THEN
    v_token := public.clinic_next_token(v_apt.doctor_id);
  ELSE
    v_token := v_apt.token_number;
  END IF;

  UPDATE public.appointments
  SET
    token_number = v_token,
    checked_in_at = COALESCE(checked_in_at, now()),
    checked_in_by = COALESCE(checked_in_by, auth.uid()),
    status = 'waiting',
    queue_position = COALESCE(queue_position, (
      SELECT COALESCE(MAX(queue_position), 0) + 1
      FROM public.appointments q
      WHERE q.doctor_id = v_apt.doctor_id
        AND (q.scheduled_at AT TIME ZONE 'Asia/Karachi')::date
          = (v_apt.scheduled_at AT TIME ZONE 'Asia/Karachi')::date
        AND q.token_number IS NOT NULL
    ))
  WHERE id = p_appointment_id
  RETURNING appointments.token_number, appointments.status
  INTO token_number, status;

  PERFORM public.clinic_write_audit(
    'check_in',
    'appointment',
    p_appointment_id,
    jsonb_build_object('token_number', token_number)
  );

  SELECT dp.user_id, p.full_name
  INTO v_doctor_user, v_patient_name
  FROM public.appointments a
  JOIN public.doctor_profiles dp ON dp.id = a.doctor_id
  JOIN public.profiles p ON p.id = a.patient_id
  WHERE a.id = p_appointment_id;

  IF v_doctor_user IS NOT NULL THEN
    PERFORM public.create_notification(
      v_doctor_user,
      'Patient ready',
      format('Patient %s (%s) is ready.', COALESCE(v_patient_name, 'Unknown'), token_number),
      'appointment',
      jsonb_build_object('appointment_id', p_appointment_id, 'token_number', token_number)
    );
  END IF;

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- Walk-in patient + appointment
-- ---------------------------------------------------------------------------
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
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_phone text;
  v_instance_id uuid;
  v_password text;
  v_existing uuid;
BEGIN
  IF NOT public.is_clinic_staff() THEN
    RAISE EXCEPTION 'Only reception or admin can register walk-in patients';
  END IF;

  v_phone := NULLIF(trim(p_phone), '');
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Phone is required';
  END IF;

  IF NULLIF(trim(p_full_name), '') IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  SELECT id INTO v_existing
  FROM public.profiles
  WHERE role = 'patient'
    AND phone = v_phone
  ORDER BY created_at
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  v_email := lower(NULLIF(trim(p_email), ''));
  IF v_email IS NULL THEN
    v_email := 'walkin.' || regexp_replace(v_phone, '[^0-9]', '', 'g')
      || '.' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
      || '@clinic.local';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO v_instance_id;

  v_user_id := gen_random_uuid();
  v_password := crypt(encode(gen_random_bytes(12), 'hex'), gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id,
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_password,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', trim(p_full_name),
      'role', 'patient',
      'phone', v_phone,
      'walk_in_provision', 'true',
      'email', v_email
    ),
    now(), now(), '', '', '', ''
  );

  UPDATE public.profiles
  SET
    full_name = trim(p_full_name),
    phone = v_phone,
    gender = p_gender,
    date_of_birth = p_date_of_birth,
    city = NULLIF(trim(p_city), ''),
    role = 'patient',
    account_status = 'approved',
    is_active = true,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = v_user_id;

  PERFORM public.clinic_write_audit(
    'register_walk_in_patient',
    'patient',
    v_user_id,
    jsonb_build_object('phone', v_phone)
  );

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_create_walk_in(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_service_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt_id uuid;
  v_fee numeric(10,2);
  v_service_id uuid;
  v_token text;
BEGIN
  IF NOT public.is_clinic_staff() THEN
    RAISE EXCEPTION 'Only reception or admin can create walk-ins';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_patient_id AND role = 'patient') THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_profiles WHERE id = p_doctor_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Doctor not found or not approved';
  END IF;

  v_service_id := p_service_id;
  IF v_service_id IS NULL THEN
    SELECT id INTO v_service_id FROM public.services WHERE is_active ORDER BY created_at LIMIT 1;
  END IF;

  SELECT COALESCE(s.default_fee, dp.consultation_fee, 0)
  INTO v_fee
  FROM public.doctor_profiles dp
  LEFT JOIN public.services s ON s.id = v_service_id
  WHERE dp.id = p_doctor_id;

  v_token := public.clinic_next_token(p_doctor_id);

  INSERT INTO public.appointments (
    patient_id, doctor_id, appointment_type, status, scheduled_at,
    duration_minutes, patient_notes, consultation_fee, booking_source,
    token_number, checked_in_at, checked_in_by, queue_position, service_id
  ) VALUES (
    p_patient_id,
    p_doctor_id,
    'in_person',
    'waiting',
    now(),
    30,
    NULLIF(trim(p_notes), ''),
    COALESCE(v_fee, 0),
    'walk_in',
    v_token,
    now(),
    auth.uid(),
    (
      SELECT COALESCE(MAX(queue_position), 0) + 1
      FROM public.appointments
      WHERE doctor_id = p_doctor_id
        AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::date
          = (now() AT TIME ZONE 'Asia/Karachi')::date
    ),
    v_service_id
  )
  RETURNING id INTO v_apt_id;

  PERFORM public.clinic_write_audit(
    'create_walk_in',
    'appointment',
    v_apt_id,
    jsonb_build_object('token_number', v_token, 'doctor_id', p_doctor_id)
  );

  RETURN v_apt_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Queue + consultation closeout
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinic_call_next(p_doctor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt_id uuid;
  v_token text;
  v_patient_name text;
BEGIN
  IF NOT (
    public.is_clinic_staff()
    OR EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = p_doctor_id AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not allowed to call the next patient';
  END IF;

  SELECT id INTO v_apt_id
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND appointment_type = 'in_person'
    AND status = 'waiting'
    AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::date
      = (now() AT TIME ZONE 'Asia/Karachi')::date
  ORDER BY queue_position NULLS LAST, checked_in_at NULLS LAST, scheduled_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_apt_id IS NULL THEN
    RAISE EXCEPTION 'No waiting patients';
  END IF;

  UPDATE public.appointments
  SET status = 'with_doctor', called_at = now()
  WHERE id = v_apt_id
  RETURNING appointments.token_number INTO v_token;

  INSERT INTO public.consultations (appointment_id, patient_id, doctor_id)
  SELECT a.id, a.patient_id, a.doctor_id
  FROM public.appointments a
  WHERE a.id = v_apt_id
  ON CONFLICT (appointment_id) DO NOTHING;

  PERFORM public.clinic_write_audit('call_next', 'appointment', v_apt_id, jsonb_build_object('token_number', v_token));

  SELECT p.full_name INTO v_patient_name
  FROM public.appointments a
  JOIN public.profiles p ON p.id = a.patient_id
  WHERE a.id = v_apt_id;

  PERFORM public.create_notification(
    r.id,
    'Patient called',
    format('%s (%s) is with the doctor.', COALESCE(v_patient_name, 'Patient'), COALESCE(v_token, '—')),
    'appointment',
    jsonb_build_object('appointment_id', v_apt_id, 'token_number', v_token)
  )
  FROM public.profiles r
  WHERE r.role = 'receptionist' AND r.is_active = true;

  RETURN v_apt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_open_consultation(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (
    public.is_clinic_staff()
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN
    RAISE EXCEPTION 'Not allowed to open this consultation';
  END IF;

  INSERT INTO public.consultations (appointment_id, patient_id, doctor_id)
  SELECT a.id, a.patient_id, a.doctor_id
  FROM public.appointments a
  WHERE a.id = p_appointment_id
  ON CONFLICT (appointment_id) DO UPDATE
    SET updated_at = now()
  RETURNING id INTO v_id;

  UPDATE public.appointments
  SET status = 'with_doctor', called_at = COALESCE(called_at, now())
  WHERE id = p_appointment_id
    AND status IN ('waiting', 'checked_in', 'scheduled');

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_is_prepaid(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payments
    WHERE appointment_id = p_appointment_id
      AND status = 'completed'
  ) OR EXISTS (
    SELECT 1 FROM public.invoices
    WHERE appointment_id = p_appointment_id
      AND status = 'paid'
  );
$$;

CREATE OR REPLACE FUNCTION public.clinic_ensure_invoice(
  p_appointment_id uuid,
  p_discount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt public.appointments%ROWTYPE;
  v_invoice_id uuid;
  v_number text;
  v_fee numeric(10,2);
  v_discount numeric(10,2);
  v_desc text;
BEGIN
  IF NOT (
    public.is_clinic_staff()
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN
    RAISE EXCEPTION 'Not allowed to manage this invoice';
  END IF;

  SELECT * INTO v_apt FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  SELECT id INTO v_invoice_id FROM public.invoices WHERE appointment_id = p_appointment_id;
  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;

  SELECT COALESCE(s.default_fee, v_apt.consultation_fee, 0), COALESCE(s.name, 'Consultation')
  INTO v_fee, v_desc
  FROM (SELECT 1) dummy
  LEFT JOIN public.services s ON s.id = v_apt.service_id;

  v_discount := GREATEST(0, COALESCE(p_discount, 0));
  IF v_discount > v_fee THEN
    v_discount := v_fee;
  END IF;

  v_number := 'INV-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYYYMMDD')
    || '-' || LPAD(nextval('public.patient_code_seq')::text, 4, '0');

  INSERT INTO public.invoices (
    appointment_id, patient_id, doctor_id, invoice_number,
    subtotal, discount, total, status, created_by
  ) VALUES (
    p_appointment_id, v_apt.patient_id, v_apt.doctor_id, v_number,
    v_fee, v_discount, v_fee - v_discount, 'issued', auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (invoice_id, service_id, description, quantity, unit_price, line_total)
  VALUES (v_invoice_id, v_apt.service_id, v_desc, 1, v_fee, v_fee);

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_complete_consultation(p_appointment_id uuid)
RETURNS appointment_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status appointment_status;
  v_prepaid boolean;
  v_token text;
  v_patient_name text;
BEGIN
  IF NOT (
    public.is_clinic_staff()
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN
    RAISE EXCEPTION 'Not allowed to complete this consultation';
  END IF;

  v_prepaid := public.clinic_is_prepaid(p_appointment_id);

  UPDATE public.consultations
  SET completed_at = COALESCE(completed_at, now())
  WHERE appointment_id = p_appointment_id;

  IF v_prepaid THEN
    UPDATE public.appointments
    SET status = 'completed', completed_at = COALESCE(completed_at, now())
    WHERE id = p_appointment_id
    RETURNING appointments.status, appointments.token_number INTO v_status, v_token;
  ELSE
    PERFORM public.clinic_ensure_invoice(p_appointment_id, 0);
    UPDATE public.appointments
    SET status = 'payment_pending'
    WHERE id = p_appointment_id
    RETURNING appointments.status, appointments.token_number INTO v_status, v_token;
  END IF;

  PERFORM public.clinic_write_audit(
    'complete_consultation',
    'appointment',
    p_appointment_id,
    jsonb_build_object('status', v_status)
  );

  SELECT p.full_name INTO v_patient_name
  FROM public.appointments a
  JOIN public.profiles p ON p.id = a.patient_id
  WHERE a.id = p_appointment_id;

  PERFORM public.create_notification(
    r.id,
    CASE WHEN v_prepaid THEN 'Consultation completed' ELSE 'Payment pending' END,
    CASE
      WHEN v_prepaid THEN format('Consultation completed for %s (%s).', COALESCE(v_patient_name, 'patient'), COALESCE(v_token, '—'))
      ELSE format('Payment pending for %s (%s).', COALESCE(v_patient_name, 'patient'), COALESCE(v_token, '—'))
    END,
    CASE WHEN v_prepaid THEN 'appointment' ELSE 'payment' END,
    jsonb_build_object('appointment_id', p_appointment_id, 'token_number', v_token)
  )
  FROM public.profiles r
  WHERE r.role IN ('receptionist', 'admin', 'super_admin') AND r.is_active = true;

  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_collect_payment(
  p_appointment_id uuid,
  p_method clinic_payment_method,
  p_discount numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_payment_id uuid;
  v_total numeric(10,2);
BEGIN
  IF NOT public.is_clinic_staff() THEN
    RAISE EXCEPTION 'Only reception or admin can collect payment';
  END IF;

  IF public.clinic_is_prepaid(p_appointment_id) THEN
    UPDATE public.appointments
    SET status = 'completed', completed_at = COALESCE(completed_at, now())
    WHERE id = p_appointment_id;
    RETURN NULL;
  END IF;

  v_invoice_id := public.clinic_ensure_invoice(p_appointment_id, p_discount);

  UPDATE public.invoices
  SET
    discount = GREATEST(0, COALESCE(p_discount, discount)),
    total = GREATEST(0, subtotal - GREATEST(0, COALESCE(p_discount, discount))),
    status = 'paid',
    notes = COALESCE(NULLIF(trim(p_notes), ''), notes)
  WHERE id = v_invoice_id
  RETURNING total INTO v_total;

  INSERT INTO public.clinic_payments (
    invoice_id, appointment_id, amount, method, received_by, notes
  ) VALUES (
    v_invoice_id, p_appointment_id, v_total, p_method, auth.uid(), NULLIF(trim(p_notes), '')
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.appointments
  SET status = 'completed', completed_at = COALESCE(completed_at, now())
  WHERE id = p_appointment_id;

  PERFORM public.clinic_write_audit(
    'collect_payment',
    'invoice',
    v_invoice_id,
    jsonb_build_object('method', p_method, 'amount', v_total, 'appointment_id', p_appointment_id)
  );

  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_reassign_doctor(
  p_appointment_id uuid,
  p_doctor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_clinic_staff() THEN
    RAISE EXCEPTION 'Only reception or admin can reassign doctors';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_profiles WHERE id = p_doctor_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Doctor not found or not approved';
  END IF;

  UPDATE public.appointments
  SET doctor_id = p_doctor_id
  WHERE id = p_appointment_id
    AND status IN ('scheduled', 'checked_in', 'waiting', 'payment_pending');

  UPDATE public.consultations
  SET doctor_id = p_doctor_id
  WHERE appointment_id = p_appointment_id
    AND completed_at IS NULL;

  PERFORM public.clinic_write_audit(
    'reassign_doctor',
    'appointment',
    p_appointment_id,
    jsonb_build_object('doctor_id', p_doctor_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_update_status(
  p_appointment_id uuid,
  p_status appointment_status,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_clinic_staff() THEN
    RAISE EXCEPTION 'Only reception or admin can update clinic status';
  END IF;

  IF p_status NOT IN ('cancelled', 'no_show', 'scheduled', 'waiting', 'completed') THEN
    RAISE EXCEPTION 'Unsupported status change';
  END IF;

  UPDATE public.appointments
  SET
    status = p_status,
    cancellation_reason = CASE
      WHEN p_status IN ('cancelled', 'no_show') THEN COALESCE(NULLIF(trim(p_reason), ''), cancellation_reason)
      ELSE cancellation_reason
    END,
    cancelled_by = CASE
      WHEN p_status IN ('cancelled', 'no_show') THEN auth.uid()
      ELSE cancelled_by
    END,
    completed_at = CASE WHEN p_status = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE id = p_appointment_id;

  PERFORM public.clinic_write_audit(
    'update_status',
    'appointment',
    p_appointment_id,
    jsonb_build_object('status', p_status, 'reason', p_reason)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Staff provisioning: allow receptionist
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_provision boolean;
BEGIN
  SELECT COALESCE(u.raw_user_meta_data->>'staff_provision', 'false') = 'true'
  INTO staff_provision
  FROM auth.users u
  WHERE u.id = NEW.id;

  IF (TG_OP = 'INSERT') THEN
    IF public.is_admin() OR staff_provision THEN
      IF NEW.role NOT IN ('patient', 'doctor', 'admin', 'super_admin', 'receptionist') THEN
        NEW.role := 'patient';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.role NOT IN ('patient', 'doctor') THEN
      NEW.role := 'patient';
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF public.is_admin() OR staff_provision THEN
      IF NEW.role NOT IN ('patient', 'doctor', 'admin', 'super_admin', 'receptionist') THEN
        NEW.role := OLD.role;
      END IF;
      RETURN NEW;
    END IF;

    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      NEW.role := OLD.role;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_staff_member(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role user_role,
  p_permissions jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_instance_id uuid;
  v_meta jsonb;
  v_email text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can provision staff';
  END IF;

  IF p_role NOT IN ('admin', 'super_admin', 'receptionist') THEN
    RAISE EXCEPTION 'Invalid staff role';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO v_instance_id;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  v_meta := jsonb_build_object(
    'full_name', trim(p_full_name),
    'role', p_role::text,
    'phone', coalesce(trim(p_phone), ''),
    'staff_provision', 'true',
    'email', v_email
  );

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, v_user_id, 'authenticated', 'authenticated', v_email, v_encrypted_pw,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    v_meta, now(), now(), '', '', '', ''
  );

  UPDATE public.profiles
  SET
    full_name = trim(p_full_name),
    phone = NULLIF(trim(p_phone), ''),
    role = p_role,
    account_status = 'approved',
    is_active = true,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.admin_staff (user_id, created_by, permissions, is_active)
  VALUES (v_user_id, auth.uid(), COALESCE(p_permissions, '{}'::jsonb), true)
  ON CONFLICT (user_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    is_active = true,
    created_by = COALESCE(admin_staff.created_by, EXCLUDED.created_by);

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  signup_role user_role;
  exp_years int;
  consult_fee numeric(10,2);
  is_staff boolean;
  is_patient boolean;
  auto_approve boolean;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  is_staff := COALESCE(meta->>'staff_provision', 'false') = 'true';

  signup_role := COALESCE(meta->>'role', 'patient')::user_role;
  IF is_staff THEN
    IF signup_role NOT IN ('admin', 'super_admin', 'receptionist') THEN
      signup_role := 'admin';
    END IF;
  ELSIF signup_role NOT IN ('patient', 'doctor') THEN
    signup_role := 'patient';
  END IF;

  is_patient := (signup_role = 'patient');
  auto_approve := is_patient OR is_staff;

  exp_years := GREATEST(0, COALESCE(NULLIF(meta->>'experience_years', '')::int, 0));
  consult_fee := COALESCE(NULLIF(meta->>'consultation_fee', '')::numeric, 0);

  INSERT INTO public.profiles (
    id, email, full_name, phone, city, role, account_status, is_active
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, meta->>'email'),
    COALESCE(NULLIF(meta->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'city', ''),
    signup_role,
    CASE WHEN auto_approve THEN 'approved'::account_status ELSE 'pending'::account_status END,
    auto_approve
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    city = COALESCE(EXCLUDED.city, profiles.city),
    updated_at = NOW();

  IF signup_role = 'doctor' AND NULLIF(meta->>'pmdc_number', '') IS NOT NULL THEN
    INSERT INTO public.doctor_profiles (
      user_id, status, specialization, qualification, experience_years,
      pmdc_number, bio, consultation_fee, cities
    ) VALUES (
      NEW.id,
      'pending',
      COALESCE(NULLIF(meta->>'specialization', ''), 'General Physician'),
      ARRAY[COALESCE(NULLIF(meta->>'qualification', ''), 'MBBS')],
      exp_years,
      meta->>'pmdc_number',
      NULLIF(meta->>'bio', ''),
      consult_fee,
      CASE WHEN NULLIF(meta->>'city', '') IS NULL THEN NULL ELSE ARRAY[meta->>'city'] END
    )
    ON CONFLICT (user_id) DO NOTHING;

    PERFORM public.sync_doctor_taxonomy_from_meta(NEW.id, meta);
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic staff view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_clinic_staff());

CREATE POLICY "Clinic staff update patient profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_clinic_staff() AND role = 'patient')
  WITH CHECK (public.is_clinic_staff() AND role = 'patient');

CREATE POLICY "Clinic staff view doctors"
  ON public.doctor_profiles FOR SELECT
  USING (public.is_clinic_staff());

CREATE POLICY "Clinic staff manage appointments"
  ON public.appointments FOR ALL
  USING (public.is_clinic_staff())
  WITH CHECK (public.is_clinic_staff());

CREATE POLICY "Authenticated read active services"
  ON public.services FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_clinic_staff());

CREATE POLICY "Admins manage services"
  ON public.services FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Consultation access"
  ON public.consultations FOR SELECT
  USING (
    public.is_clinic_staff()
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = consultations.doctor_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors write own consultations"
  ON public.consultations FOR ALL
  USING (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = consultations.doctor_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = consultations.doctor_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Vitals access"
  ON public.vitals FOR SELECT
  USING (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = vitals.consultation_id
        AND (
          c.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = c.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Vitals write"
  ON public.vitals FOR ALL
  USING (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = vitals.consultation_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = vitals.consultation_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Prescriptions access"
  ON public.prescriptions FOR SELECT
  USING (
    public.is_clinic_staff()
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = prescriptions.doctor_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Prescriptions write"
  ON public.prescriptions FOR ALL
  USING (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = prescriptions.doctor_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = prescriptions.doctor_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Prescription items access"
  ON public.prescription_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND (
          public.is_clinic_staff()
          OR p.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = p.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Prescription items write"
  ON public.prescription_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND (
          public.is_clinic_staff()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = p.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND (
          public.is_clinic_staff()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = p.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Invoices access"
  ON public.invoices FOR SELECT
  USING (
    public.is_clinic_staff()
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = invoices.doctor_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Invoices write clinic staff"
  ON public.invoices FOR ALL
  USING (public.is_clinic_staff())
  WITH CHECK (public.is_clinic_staff());

CREATE POLICY "Invoice items access"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND (
          public.is_clinic_staff()
          OR i.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = i.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Invoice items write clinic staff"
  ON public.invoice_items FOR ALL
  USING (public.is_clinic_staff())
  WITH CHECK (public.is_clinic_staff());

CREATE POLICY "Clinic payments access"
  ON public.clinic_payments FOR SELECT
  USING (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = clinic_payments.invoice_id AND i.patient_id = auth.uid()
    )
  );

CREATE POLICY "Clinic payments write"
  ON public.clinic_payments FOR ALL
  USING (public.is_clinic_staff())
  WITH CHECK (public.is_clinic_staff());

CREATE POLICY "Patient documents access"
  ON public.patient_documents FOR SELECT
  USING (
    public.is_clinic_staff()
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = patient_documents.consultation_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Patient documents write"
  ON public.patient_documents FOR ALL
  USING (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = patient_documents.consultation_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = patient_documents.consultation_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Audit logs clinic staff"
  ON public.audit_logs FOR SELECT
  USING (public.is_clinic_staff());

CREATE POLICY "Audit logs insert clinic staff"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_clinic_staff() OR auth.uid() IS NOT NULL);

CREATE POLICY "Receptionists read settings"
  ON public.platform_settings FOR SELECT
  USING (public.is_receptionist());

CREATE POLICY "Clinic staff view payments"
  ON public.payments FOR SELECT
  USING (public.is_clinic_staff());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.clinic_next_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_check_in(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_walk_in_patient(text, text, text, gender, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_create_walk_in(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_call_next(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_open_consultation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_ensure_invoice(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_complete_consultation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_collect_payment(uuid, clinic_payment_method, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_reassign_doctor(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_update_status(uuid, appointment_status, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_is_prepaid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_staff_member(text, text, text, text, user_role, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.clinic_next_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_check_in(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_walk_in_patient(text, text, text, gender, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_create_walk_in(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_call_next(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_open_consultation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_ensure_invoice(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_complete_consultation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_collect_payment(uuid, clinic_payment_method, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_reassign_doctor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_update_status(uuid, appointment_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_is_prepaid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_staff_member(text, text, text, text, user_role, jsonb) TO authenticated;

-- Walk-ins skip online slot occupancy / past-time / working-hours checks.
CREATE OR REPLACE FUNCTION public.validate_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_time TIME;
BEGIN
  IF NEW.status IN ('cancelled', 'no_show', 'expired_no_show') THEN
    RETURN NEW;
  END IF;

  IF NEW.booking_source = 'walk_in' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.scheduled_at <= now() THEN
    RAISE EXCEPTION 'SLOT_IN_PAST: The selected time has already passed. Please choose an upcoming slot.';
  END IF;

  v_date := (NEW.scheduled_at AT TIME ZONE 'Asia/Karachi')::DATE;
  v_time := (NEW.scheduled_at AT TIME ZONE 'Asia/Karachi')::TIME;

  IF public.is_slot_blocked(NEW.doctor_id, v_date, v_time) THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: Dr. % is unavailable at the selected time. Please choose another slot.',
      NEW.doctor_id;
  END IF;

  IF NOT public.is_slot_within_working_hours(
    NEW.doctor_id,
    NEW.scheduled_at,
    COALESCE(NEW.duration_minutes, 30)
  ) THEN
    RAISE EXCEPTION 'SLOT_OUTSIDE_HOURS: The selected time is outside the doctor''s working hours.';
  END IF;

  RETURN NEW;
END;
$$;

-- Realtime for reception/doctor queues
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents',
  'patient-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Clinic staff read patient documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents'
  AND public.is_clinic_staff()
);

CREATE POLICY "Doctors read own patient documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents'
  AND public.is_doctor()
);

CREATE POLICY "Clinic staff upload patient documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (public.is_clinic_staff() OR public.is_doctor())
);

CREATE POLICY "Clinic staff update patient documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'patient-documents'
  AND (public.is_clinic_staff() OR public.is_doctor())
)
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (public.is_clinic_staff() OR public.is_doctor())
);
