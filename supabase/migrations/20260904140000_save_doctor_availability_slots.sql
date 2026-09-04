-- Replace a doctor's weekly hours in one transaction.
-- Client delete-then-insert could wipe slots when the insert failed
-- (invalid times, missing org id, or a mid-save auth error).

CREATE OR REPLACE FUNCTION public.save_doctor_availability_slots(
  p_doctor_id uuid,
  p_slots jsonb,
  p_slot_duration_minutes int DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_org uuid;
  v_duration int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.doctor_owns_profile(p_doctor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed to update this schedule';
  END IF;

  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' THEN
    RAISE EXCEPTION 'slots must be a JSON array';
  END IF;

  SELECT organization_id INTO v_org
  FROM public.doctor_profiles
  WHERE id = p_doctor_id;

  IF v_org IS NULL THEN
    v_org := private.default_organization_id();
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Clinic organization is not configured';
  END IF;

  v_duration := COALESCE(p_slot_duration_minutes, 30);
  IF v_duration < 5 OR v_duration > 240 THEN
    RAISE EXCEPTION 'Invalid slot duration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_slots) s
    WHERE (s->>'day_of_week')::int IS NULL
       OR (s->>'day_of_week')::int NOT BETWEEN 0 AND 6
       OR (s->>'end_time')::time <= (s->>'start_time')::time
  ) THEN
    RAISE EXCEPTION 'Each slot must use day 0-6 and an end time after its start time';
  END IF;

  DELETE FROM public.availability_slots
  WHERE doctor_id = p_doctor_id;

  INSERT INTO public.availability_slots (
    doctor_id,
    organization_id,
    day_of_week,
    start_time,
    end_time,
    slot_duration_minutes,
    is_active
  )
  SELECT
    p_doctor_id,
    v_org,
    (s->>'day_of_week')::int,
    (s->>'start_time')::time,
    (s->>'end_time')::time,
    COALESCE((s->>'slot_duration_minutes')::int, v_duration),
    true
  FROM jsonb_array_elements(p_slots) s;
END;
$$;

REVOKE ALL ON FUNCTION public.save_doctor_availability_slots(uuid, jsonb, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_doctor_availability_slots(uuid, jsonb, int)
  TO authenticated, service_role;
