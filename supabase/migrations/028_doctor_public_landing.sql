-- Doctor public landing pages, selected public services, and review moderation.
-- Reuses doctor_profiles, services, availability_slots, appointments, and reviews.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.landing_page_status AS ENUM ('draft', 'published', 'unpublished');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.review_moderation_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Review privacy + moderation (extend existing reviews table)
-- ---------------------------------------------------------------------------
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS moderation_status public.review_moderation_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_reviews_doctor_moderation
  ON public.reviews (doctor_id, moderation_status, is_visible);

CREATE OR REPLACE FUNCTION public.review_display_name(p_full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
  parts text[];
  first_name text;
  last_part text;
BEGIN
  cleaned := trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  IF cleaned = '' THEN
    RETURN 'Patient';
  END IF;
  parts := regexp_split_to_array(cleaned, ' ');
  first_name := parts[1];
  IF array_length(parts, 1) >= 2 THEN
    last_part := parts[array_length(parts, 1)];
    RETURN first_name || ' ' || upper(left(last_part, 1)) || '.';
  END IF;
  RETURN first_name;
END;
$$;

UPDATE public.reviews r
SET
  display_name = COALESCE(r.display_name, public.review_display_name(p.full_name)),
  moderation_status = CASE
    WHEN r.is_visible IS FALSE THEN 'rejected'::public.review_moderation_status
    ELSE 'approved'::public.review_moderation_status
  END
FROM public.profiles p
WHERE p.id = r.patient_id;

CREATE OR REPLACE FUNCTION public.reviews_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
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
      NEW.moderation_status := 'pending';
      NEW.is_visible := false;
      NEW.moderated_at := NULL;
      NEW.moderated_by := NULL;
    END IF;
    NEW.doctor_id := OLD.doctor_id;
    NEW.patient_id := OLD.patient_id;
    NEW.appointment_id := OLD.appointment_id;
    NEW.display_name := OLD.display_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_before_write ON public.reviews;
CREATE TRIGGER trg_reviews_before_write
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_before_write();

CREATE OR REPLACE FUNCTION public.refresh_doctor_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
BEGIN
  v_doctor_id := COALESCE(NEW.doctor_id, OLD.doctor_id);
  IF v_doctor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.doctor_profiles dp
  SET
    rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 2)
      FROM public.reviews r
      WHERE r.doctor_id = v_doctor_id
        AND r.is_visible = true
        AND r.moderation_status = 'approved'
        AND r.rating IS NOT NULL
    ), 0),
    total_reviews = (
      SELECT COUNT(*)::int
      FROM public.reviews r
      WHERE r.doctor_id = v_doctor_id
        AND r.is_visible = true
        AND r.moderation_status = 'approved'
    )
  WHERE dp.id = v_doctor_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_refresh_stats ON public.reviews;
CREATE TRIGGER trg_reviews_refresh_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_doctor_review_stats();

DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews;
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews
  FOR SELECT
  USING (
    is_visible = true
    AND moderation_status = 'approved'
  );

DROP POLICY IF EXISTS "Patients can view their own reviews" ON public.reviews;
CREATE POLICY "Patients can view their own reviews"
  ON public.reviews
  FOR SELECT
  USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Doctors can view their reviews" ON public.reviews;
CREATE POLICY "Doctors can view their reviews"
  ON public.reviews
  FOR SELECT
  USING (public.doctor_owns_profile(doctor_id));

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
    SET is_visible = false,
        moderation_status = 'pending',
        moderated_at = NULL,
        moderated_by = NULL
    WHERE id = p_review_id;
  ELSE
    UPDATE public.reviews
    SET is_visible = false,
        moderation_status = 'rejected',
        moderated_at = now(),
        moderated_by = auth.uid()
    WHERE id = p_review_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.doctor_set_review_visibility(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.doctor_set_review_visibility(uuid, boolean) TO authenticated;

CREATE OR REPLACE VIEW public.doctor_public_reviews
WITH (security_invoker = true) AS
SELECT
  id,
  doctor_id,
  rating,
  comment,
  display_name,
  created_at
FROM public.reviews
WHERE is_visible = true
  AND moderation_status = 'approved';

GRANT SELECT ON public.doctor_public_reviews TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Landing pages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL UNIQUE REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  status public.landing_page_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  draft_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_content JSONB,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doctor_landing_pages_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 80
  )
);

CREATE INDEX IF NOT EXISTS idx_doctor_landing_pages_status
  ON public.doctor_landing_pages (status);
CREATE INDEX IF NOT EXISTS idx_doctor_landing_pages_featured
  ON public.doctor_landing_pages (is_featured)
  WHERE is_featured = true;

DROP TRIGGER IF EXISTS update_doctor_landing_pages_updated_at ON public.doctor_landing_pages;
CREATE TRIGGER update_doctor_landing_pages_updated_at
  BEFORE UPDATE ON public.doctor_landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.slugify_doctor_name(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  s := lower(trim(coalesce(p_name, '')));
  s := regexp_replace(s, '^dr\.?\s+', '');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  IF s = '' THEN
    s := 'doctor';
  END IF;
  RETURN 'dr-' || s;
END;
$$;

CREATE OR REPLACE FUNCTION public.unique_doctor_slug(p_name text, p_doctor_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  base := public.slugify_doctor_name(p_name);
  IF char_length(base) > 72 THEN
    base := left(base, 72);
    base := regexp_replace(base, '-$', '');
  END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1
    FROM public.doctor_landing_pages
    WHERE slug = candidate
      AND doctor_id IS DISTINCT FROM p_doctor_id
  ) LOOP
    n := n + 1;
    candidate := left(base, 70) || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_doctor_landing_page(p_doctor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
  v_slug text;
  v_approved boolean;
BEGIN
  IF NOT public.doctor_owns_profile(p_doctor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO v_id FROM public.doctor_landing_pages WHERE doctor_id = p_doctor_id;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT p.full_name, (dp.status = 'approved')
  INTO v_name, v_approved
  FROM public.doctor_profiles dp
  JOIN public.profiles p ON p.id = dp.user_id
  WHERE dp.id = p_doctor_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Doctor not found';
  END IF;

  v_slug := public.unique_doctor_slug(v_name, p_doctor_id);

  INSERT INTO public.doctor_landing_pages (
    doctor_id, slug, status, draft_content, published_content, published_at
  )
  VALUES (
    p_doctor_id,
    v_slug,
    CASE WHEN v_approved THEN 'published'::public.landing_page_status ELSE 'draft'::public.landing_page_status END,
    '{}'::jsonb,
    CASE WHEN v_approved THEN '{}'::jsonb ELSE NULL END,
    CASE WHEN v_approved THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_doctor_landing_page(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_doctor_landing_page(uuid) TO authenticated;

INSERT INTO public.doctor_landing_pages (
  doctor_id, slug, status, draft_content, published_content, published_at
)
SELECT
  dp.id,
  public.unique_doctor_slug(p.full_name, dp.id),
  'published'::public.landing_page_status,
  '{}'::jsonb,
  '{}'::jsonb,
  now()
FROM public.doctor_profiles dp
JOIN public.profiles p ON p.id = dp.user_id
WHERE dp.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.doctor_landing_pages lp WHERE lp.doctor_id = dp.id
  );

ALTER TABLE public.doctor_landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published landing pages" ON public.doctor_landing_pages;
CREATE POLICY "Public can view published landing pages"
  ON public.doctor_landing_pages
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Doctors manage own landing page" ON public.doctor_landing_pages;
CREATE POLICY "Doctors manage own landing page"
  ON public.doctor_landing_pages
  FOR ALL
  USING (public.doctor_owns_profile(doctor_id))
  WITH CHECK (public.doctor_owns_profile(doctor_id));

DROP POLICY IF EXISTS "Admins manage landing pages" ON public.doctor_landing_pages;
CREATE POLICY "Admins manage landing pages"
  ON public.doctor_landing_pages
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.doctor_landing_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.doctor_landing_pages TO authenticated;

-- ---------------------------------------------------------------------------
-- Doctor-selected public services (reuse clinic services catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_public_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  consultation_types TEXT[] NOT NULL DEFAULT ARRAY['in_person']::text[],
  fee_override NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, service_id),
  CONSTRAINT doctor_public_services_types_valid CHECK (
    consultation_types <@ ARRAY['in_person', 'video', 'chat']::text[]
    AND cardinality(consultation_types) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_doctor_public_services_doctor
  ON public.doctor_public_services (doctor_id, sort_order);

ALTER TABLE public.doctor_public_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view visible doctor services" ON public.doctor_public_services;
CREATE POLICY "Public can view visible doctor services"
  ON public.doctor_public_services
  FOR SELECT
  USING (is_visible = true);

DROP POLICY IF EXISTS "Doctors manage own public services" ON public.doctor_public_services;
CREATE POLICY "Doctors manage own public services"
  ON public.doctor_public_services
  FOR ALL
  USING (public.doctor_owns_profile(doctor_id))
  WITH CHECK (public.doctor_owns_profile(doctor_id));

DROP POLICY IF EXISTS "Admins manage doctor public services" ON public.doctor_public_services;
CREATE POLICY "Admins manage doctor public services"
  ON public.doctor_public_services
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.doctor_public_services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.doctor_public_services TO authenticated;

DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services"
  ON public.services
  FOR SELECT
  USING (is_active = true);

-- ---------------------------------------------------------------------------
-- Global landing defaults (admin-configurable)
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES (
  'doctor_landing_defaults',
  jsonb_build_object(
    'clinicName', 'Wasl Clinic',
    'clinicAddress', '',
    'clinicCity', 'Lahore',
    'clinicPhone', '+92 300 1234567',
    'clinicMapUrl', '',
    'accent', 'teal',
    'buttonStyle', 'rounded'
  )
)
ON CONFLICT (key) DO NOTHING;
