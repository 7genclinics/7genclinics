-- Doctors can approve/reject their reviews and add landing testimonials
-- without waiting for admin moderation.

CREATE OR REPLACE FUNCTION public.reviews_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Doctor-authored testimonials (no patient) stay as provided when the doctor owns the profile.
    IF NEW.patient_id IS NULL AND public.doctor_owns_profile(NEW.doctor_id) THEN
      NEW.moderation_status := COALESCE(NEW.moderation_status, 'approved');
      NEW.is_visible := COALESCE(NEW.is_visible, true);
    ELSIF NOT public.is_admin() THEN
      NEW.moderation_status := 'pending';
      NEW.is_visible := false;
    END IF;

    IF NEW.display_name IS NULL OR btrim(NEW.display_name) = '' THEN
      SELECT public.review_display_name(full_name) INTO v_name
      FROM public.profiles
      WHERE id = NEW.patient_id;
      NEW.display_name := COALESCE(v_name, 'Patient');
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT public.is_admin() THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.comment IS DISTINCT FROM OLD.comment THEN
      -- Doctors may edit their own authored testimonials without re-moderation.
      IF NOT (OLD.patient_id IS NULL AND public.doctor_owns_profile(OLD.doctor_id)) THEN
        NEW.moderation_status := 'pending';
        NEW.is_visible := false;
        NEW.moderated_at := NULL;
        NEW.moderated_by := NULL;
      END IF;
    END IF;
    NEW.doctor_id := OLD.doctor_id;
    NEW.patient_id := OLD.patient_id;
    NEW.appointment_id := OLD.appointment_id;
    IF NOT (OLD.patient_id IS NULL AND public.doctor_owns_profile(OLD.doctor_id)) THEN
      NEW.display_name := OLD.display_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.doctor_moderate_own_review(
  p_review_id uuid,
  p_status public.review_moderation_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid moderation status';
  END IF;

  SELECT doctor_id INTO v_doctor_id FROM public.reviews WHERE id = p_review_id;
  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Review not found';
  END IF;
  IF NOT public.doctor_owns_profile(v_doctor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reviews
  SET
    moderation_status = p_status,
    is_visible = (p_status = 'approved'),
    moderated_at = now(),
    moderated_by = auth.uid()
  WHERE id = p_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.doctor_moderate_own_review(uuid, public.review_moderation_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.doctor_moderate_own_review(uuid, public.review_moderation_status) TO authenticated;

CREATE OR REPLACE FUNCTION public.doctor_add_landing_review(
  p_doctor_id uuid,
  p_display_name text,
  p_rating int,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
BEGIN
  IF NOT public.doctor_owns_profile(p_doctor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  v_name := nullif(btrim(COALESCE(p_display_name, '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Display name is required';
  END IF;

  INSERT INTO public.reviews (
    doctor_id,
    patient_id,
    appointment_id,
    rating,
    comment,
    display_name,
    moderation_status,
    is_visible,
    moderated_at,
    moderated_by
  )
  VALUES (
    p_doctor_id,
    NULL,
    NULL,
    p_rating,
    nullif(btrim(COALESCE(p_comment, '')), ''),
    v_name,
    'approved',
    true,
    now(),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.doctor_add_landing_review(uuid, text, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.doctor_add_landing_review(uuid, text, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.doctor_delete_landing_review(p_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
  v_patient_id uuid;
BEGIN
  SELECT doctor_id, patient_id INTO v_doctor_id, v_patient_id
  FROM public.reviews
  WHERE id = p_review_id;

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Review not found';
  END IF;
  IF NOT public.doctor_owns_profile(v_doctor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Only doctor-authored testimonials (no patient) can be deleted by the doctor.
  IF v_patient_id IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Patient reviews cannot be deleted; hide them instead';
  END IF;

  DELETE FROM public.reviews WHERE id = p_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.doctor_delete_landing_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.doctor_delete_landing_review(uuid) TO authenticated;

-- Restoring visibility now publishes immediately (no admin queue).
CREATE OR REPLACE FUNCTION public.doctor_set_review_visibility(p_review_id uuid, p_visible boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
BEGIN
  SELECT doctor_id INTO v_doctor_id FROM public.reviews WHERE id = p_review_id;
  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Review not found';
  END IF;
  IF NOT public.doctor_owns_profile(v_doctor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_visible THEN
    UPDATE public.reviews
    SET
      is_visible = true,
      moderation_status = 'approved',
      moderated_at = now(),
      moderated_by = auth.uid()
    WHERE id = p_review_id;
  ELSE
    UPDATE public.reviews
    SET
      is_visible = false,
      moderation_status = 'rejected',
      moderated_at = now(),
      moderated_by = auth.uid()
    WHERE id = p_review_id;
  END IF;
END;
$$;
