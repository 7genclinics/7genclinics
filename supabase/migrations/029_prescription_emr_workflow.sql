-- Prescription / EMR workflow: reception vitals without opening the consult,
-- master + per-doctor medicine lists, and walk-in held at desk until queued.

-- ---------------------------------------------------------------------------
-- Ensure a consultation row exists without moving the patient to "with_doctor"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinic_ensure_consultation(p_appointment_id uuid)
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

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinic_record_vitals(
  p_appointment_id uuid,
  p_blood_pressure text DEFAULT NULL,
  p_temperature numeric DEFAULT NULL,
  p_pulse int DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_height numeric DEFAULT NULL,
  p_spo2 numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consult_id uuid;
  v_vitals_id uuid;
BEGIN
  IF NOT (
    public.is_clinic_staff()
    OR public.is_appointment_doctor(p_appointment_id)
  ) THEN
    RAISE EXCEPTION 'Not allowed to record vitals';
  END IF;

  v_consult_id := public.clinic_ensure_consultation(p_appointment_id);

  INSERT INTO public.vitals (
    consultation_id, blood_pressure, temperature, pulse, weight, height, spo2,
    recorded_at, recorded_by
  ) VALUES (
    v_consult_id,
    NULLIF(trim(p_blood_pressure), ''),
    p_temperature,
    p_pulse,
    p_weight,
    p_height,
    p_spo2,
    now(),
    auth.uid()
  )
  ON CONFLICT (consultation_id) DO UPDATE SET
    blood_pressure = EXCLUDED.blood_pressure,
    temperature = EXCLUDED.temperature,
    pulse = EXCLUDED.pulse,
    weight = EXCLUDED.weight,
    height = EXCLUDED.height,
    spo2 = EXCLUDED.spo2,
    recorded_at = now(),
    recorded_by = auth.uid()
  RETURNING id INTO v_vitals_id;

  PERFORM public.clinic_write_audit(
    'record_vitals',
    'appointment',
    p_appointment_id,
    jsonb_build_object('consultation_id', v_consult_id)
  );

  RETURN v_vitals_id;
END;
$$;

-- Hold walk-ins at the desk (checked_in) so reception can take vitals first.
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
    'checked_in',
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
-- Medicine catalogs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tablet',
  dosage_options TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_master_medicines_name
  ON public.master_medicines (lower(name));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_master_medicines_updated_at ON public.master_medicines;
CREATE TRIGGER update_master_medicines_updated_at
  BEFORE UPDATE ON public.master_medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.doctor_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  master_medicine_id UUID REFERENCES public.master_medicines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tablet',
  dosage_options TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, name)
);

CREATE INDEX IF NOT EXISTS idx_doctor_medicines_doctor_id
  ON public.doctor_medicines (doctor_id);

CREATE INDEX IF NOT EXISTS idx_doctor_medicines_name
  ON public.doctor_medicines (doctor_id, name);

DROP TRIGGER IF EXISTS update_doctor_medicines_updated_at ON public.doctor_medicines;
CREATE TRIGGER update_doctor_medicines_updated_at
  BEFORE UPDATE ON public.doctor_medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.master_medicines (name, category, dosage_options)
VALUES
  ('Paracetamol', 'tablet', ARRAY['500 mg', '650 mg', '1 g']),
  ('Ibuprofen', 'tablet', ARRAY['200 mg', '400 mg', '600 mg']),
  ('Amoxicillin', 'capsule', ARRAY['250 mg', '500 mg']),
  ('Azithromycin', 'tablet', ARRAY['250 mg', '500 mg']),
  ('Ciprofloxacin', 'tablet', ARRAY['250 mg', '500 mg']),
  ('Metformin', 'tablet', ARRAY['500 mg', '850 mg', '1000 mg']),
  ('Amlodipine', 'tablet', ARRAY['5 mg', '10 mg']),
  ('Losartan', 'tablet', ARRAY['25 mg', '50 mg', '100 mg']),
  ('Omeprazole', 'capsule', ARRAY['20 mg', '40 mg']),
  ('Pantoprazole', 'tablet', ARRAY['20 mg', '40 mg']),
  ('Cetirizine', 'tablet', ARRAY['10 mg']),
  ('Montelukast', 'tablet', ARRAY['5 mg', '10 mg']),
  ('Salbutamol inhaler', 'inhaler', ARRAY['100 mcg']),
  ('ORS', 'sachet', ARRAY['1 sachet']),
  ('Vitamin D3', 'capsule', ARRAY['1000 IU', '5000 IU', '50000 IU']),
  ('Iron + Folic acid', 'tablet', ARRAY['1 tablet']),
  ('Diclofenac', 'tablet', ARRAY['50 mg', '75 mg']),
  ('Domperidone', 'tablet', ARRAY['10 mg']),
  ('Metronidazole', 'tablet', ARRAY['400 mg']),
  ('Insulin Regular', 'injection', ARRAY['as directed'])
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.clinic_import_master_medicines(p_medicine_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
  v_count int;
BEGIN
  SELECT id INTO v_doctor_id
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Doctor profile required to import medicines';
  END IF;

  INSERT INTO public.doctor_medicines (doctor_id, master_medicine_id, name, category, dosage_options)
  SELECT v_doctor_id, m.id, m.name, m.category, m.dosage_options
  FROM public.master_medicines m
  WHERE m.id = ANY (p_medicine_ids)
    AND m.is_active
  ON CONFLICT (doctor_id, name) DO UPDATE SET
    master_medicine_id = COALESCE(public.doctor_medicines.master_medicine_id, EXCLUDED.master_medicine_id),
    category = EXCLUDED.category,
    dosage_options = CASE
      WHEN COALESCE(array_length(public.doctor_medicines.dosage_options, 1), 0) = 0
        THEN EXCLUDED.dosage_options
      ELSE public.doctor_medicines.dosage_options
    END,
    is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER TABLE public.master_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read master medicines" ON public.master_medicines;
CREATE POLICY "Authenticated read master medicines"
  ON public.master_medicines FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin() OR public.is_clinic_staff());

DROP POLICY IF EXISTS "Admins manage master medicines" ON public.master_medicines;
CREATE POLICY "Admins manage master medicines"
  ON public.master_medicines FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Read doctor medicines" ON public.doctor_medicines;
CREATE POLICY "Read doctor medicines"
  ON public.doctor_medicines FOR SELECT
  USING (
    public.is_clinic_staff()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = doctor_medicines.doctor_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Doctors manage own medicines" ON public.doctor_medicines;
CREATE POLICY "Doctors manage own medicines"
  ON public.doctor_medicines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = doctor_medicines.doctor_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = doctor_medicines.doctor_id AND dp.user_id = auth.uid()
    )
  );

REVOKE ALL ON FUNCTION public.clinic_ensure_consultation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_record_vitals(uuid, text, numeric, int, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_import_master_medicines(uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.clinic_ensure_consultation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_record_vitals(uuid, text, numeric, int, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_import_master_medicines(uuid[]) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_medicines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_medicines TO authenticated;

-- Doctors can read EMR history for any patient they have seen at the clinic.
DROP POLICY IF EXISTS "Doctors read co-patient consultations" ON public.consultations;
CREATE POLICY "Doctors read co-patient consultations"
  ON public.consultations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.doctor_id = dp.id
            AND a.patient_id = consultations.patient_id
        )
    )
  );

DROP POLICY IF EXISTS "Doctors read co-patient vitals" ON public.vitals;
CREATE POLICY "Doctors read co-patient vitals"
  ON public.vitals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.user_id = auth.uid()
      JOIN public.appointments a ON a.doctor_id = dp.id AND a.patient_id = c.patient_id
      WHERE c.id = vitals.consultation_id
    )
  );

DROP POLICY IF EXISTS "Doctors read co-patient prescriptions" ON public.prescriptions;
CREATE POLICY "Doctors read co-patient prescriptions"
  ON public.prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.doctor_id = dp.id
            AND a.patient_id = prescriptions.patient_id
        )
    )
  );

DROP POLICY IF EXISTS "Doctors read co-patient prescription items" ON public.prescription_items;
CREATE POLICY "Doctors read co-patient prescription items"
  ON public.prescription_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      JOIN public.doctor_profiles dp ON dp.user_id = auth.uid()
      JOIN public.appointments a ON a.doctor_id = dp.id AND a.patient_id = p.patient_id
      WHERE p.id = prescription_items.prescription_id
    )
  );
