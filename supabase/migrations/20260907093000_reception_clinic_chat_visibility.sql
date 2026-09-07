-- Reception desk can search clinic patients; patients/doctors in the same
-- clinic can find reception staff for chat when the doctor is busy.

CREATE OR REPLACE FUNCTION private.is_visible_clinic_desk(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members desk
    JOIN public.profiles desk_p ON desk_p.id = desk.user_id
    WHERE desk.user_id = p_user_id
      AND desk.is_active = true
      AND desk.member_role = 'receptionist'
      AND desk_p.role = 'receptionist'
      AND COALESCE(desk_p.is_active, true) = true
      AND (
        EXISTS (
          SELECT 1
          FROM public.organization_members me
          WHERE me.user_id = auth.uid()
            AND me.organization_id = desk.organization_id
            AND me.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.appointments a
          WHERE a.patient_id = auth.uid()
            AND a.organization_id = desk.organization_id
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_visible_clinic_desk(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_visible_clinic_desk(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_peer_profiles(p_ids uuid[])
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url, p.role
  FROM public.profiles p
  WHERE p.id = ANY (p_ids)
    AND (
      p.id = auth.uid()
      OR public.is_admin()
      OR public.is_chat_peer(p.id)
      OR public.is_doctor_of_patient(auth.uid(), p.id)
      OR private.can_operate_profile(p.id)
      OR private.is_visible_clinic_desk(p.id)
      OR EXISTS (
        SELECT 1
        FROM public.doctor_profiles dp
        WHERE dp.user_id = p.id
          AND dp.status = 'approved'
      )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_peer_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_peer_profiles(uuid[]) TO authenticated;

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
      OR (
        p.role = 'receptionist'
        AND private.is_visible_clinic_desk(p.id)
      )
    )
  ORDER BY p.full_name ASC
  LIMIT 40;
END;
$$;

REVOKE ALL ON FUNCTION public.search_chatable_profiles(text, public.user_role[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_chatable_profiles(text, public.user_role[], uuid) TO authenticated;
