-- Reception (clinic staff) can add medicines onto a doctor's prescribing list.

DROP POLICY IF EXISTS "Clinic staff manage doctor medicines" ON public.doctor_medicines;
CREATE POLICY "Clinic staff manage doctor medicines"
  ON public.doctor_medicines FOR ALL
  TO authenticated
  USING (public.is_clinic_staff())
  WITH CHECK (public.is_clinic_staff());

CREATE OR REPLACE FUNCTION public.clinic_desk_import_master_medicines(
  p_doctor_id uuid,
  p_medicine_ids uuid[]
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_clinic_staff() THEN
    RAISE EXCEPTION 'Only clinic staff can add medicines for a doctor';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = p_doctor_id) THEN
    RAISE EXCEPTION 'Doctor not found';
  END IF;

  INSERT INTO public.doctor_medicines (doctor_id, master_medicine_id, name, category, dosage_options)
  SELECT p_doctor_id, m.id, m.name, m.category, m.dosage_options
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

REVOKE ALL ON FUNCTION public.clinic_desk_import_master_medicines(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_desk_import_master_medicines(uuid, uuid[]) TO authenticated;
