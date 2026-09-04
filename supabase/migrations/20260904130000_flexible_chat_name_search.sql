-- Chat name search must ignore dots/spaces: "dr laila" matches "Dr.Laila".
-- Honorific tokens (dr/doctor) are optional when a real name token is present.

CREATE OR REPLACE FUNCTION private.compact_search_key(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(COALESCE(p_text, '')), '[^a-z0-9]', '', 'g');
$$;

REVOKE ALL ON FUNCTION private.compact_search_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.compact_search_key(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_chatable_profiles(
  p_query text,
  p_roles public.user_role[],
  p_exclude uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  role public.user_role
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_q text := lower(trim(COALESCE(p_query, '')));
  v_tokens text[];
  v_match text[];
  v_compact_query text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_q = '' OR p_roles IS NULL OR cardinality(p_roles) = 0 THEN
    RETURN;
  END IF;

  v_tokens := ARRAY(
    SELECT t
    FROM unnest(regexp_split_to_array(v_q, '[^a-z0-9]+')) AS t
    WHERE length(t) > 0
  );

  v_match := ARRAY(
    SELECT t FROM unnest(v_tokens) AS t
    WHERE t NOT IN ('dr', 'doc', 'doctor')
  );
  IF coalesce(cardinality(v_match), 0) = 0 THEN
    v_match := v_tokens;
  END IF;

  v_compact_query := array_to_string(v_match, '');

  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url, p.role
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.role = ANY (p_roles)
    AND (p_exclude IS NULL OR p.id <> p_exclude)
    AND (
      (
        v_compact_query <> ''
        AND strpos(private.compact_search_key(p.full_name), v_compact_query) > 0
      )
      OR (
        coalesce(cardinality(v_match), 0) > 0
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(v_match) AS tok
          WHERE length(tok) >= 2
            AND strpos(private.compact_search_key(p.full_name), tok) = 0
        )
      )
    )
    AND (
      public.is_admin()
      OR p.id = auth.uid()
      OR public.is_chat_peer(p.id)
      OR public.is_doctor_of_patient(auth.uid(), p.id)
      OR (
        p.role = 'doctor'
        AND EXISTS (
          SELECT 1
          FROM public.doctor_profiles dp
          WHERE dp.user_id = p.id
            AND dp.status = 'approved'
        )
      )
      OR (
        p.role = 'patient'
        AND private.can_operate_profile(p.id)
      )
    )
  ORDER BY p.full_name ASC
  LIMIT 40;
END;
$$;
