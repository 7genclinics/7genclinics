-- Chat peers must see each other's display names. Without this, conversation
-- list/search falls back to "Unknown" whenever RLS does not already allow
-- reading that profile (e.g. doctor chatting a patient with no appointment).

CREATE OR REPLACE FUNCTION public.is_chat_peer(target_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_uid IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE (c.participant_a = auth.uid() AND c.participant_b = target_uid)
         OR (c.participant_b = auth.uid() AND c.participant_a = target_uid)
    );
$$;

REVOKE ALL ON FUNCTION public.is_chat_peer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chat_peer(uuid) TO authenticated;

DROP POLICY IF EXISTS "Chat peers can view each other profiles" ON public.profiles;
CREATE POLICY "Chat peers can view each other profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_chat_peer(id));

-- Reliable batch fetch for conversation list (avoids partial RLS misses).
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
SET search_path = public
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

-- Name search for chat that includes approved doctors + visible patients/peers.
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
SET search_path = public
AS $$
DECLARE
  v_q text := lower(trim(COALESCE(p_query, '')));
  v_compact text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_q = '' OR p_roles IS NULL OR cardinality(p_roles) = 0 THEN
    RETURN;
  END IF;

  v_compact := regexp_replace(v_q, '[^a-z0-9]+', '', 'g');

  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url, p.role
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.role = ANY (p_roles)
    AND (p_exclude IS NULL OR p.id <> p_exclude)
    AND (
      strpos(lower(COALESCE(p.full_name, '')), v_q) > 0
      OR (
        v_compact <> ''
        AND strpos(
          regexp_replace(lower(COALESCE(p.full_name, '')), '[^a-z0-9]+', '', 'g'),
          v_compact
        ) > 0
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
        -- Clinic operators can find patients in their org context
        p.role = 'patient'
        AND private.can_operate_profile(p.id)
      )
    )
  ORDER BY p.full_name ASC
  LIMIT 40;
END;
$$;

REVOKE ALL ON FUNCTION public.search_chatable_profiles(text, public.user_role[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_chatable_profiles(text, public.user_role[], uuid) TO authenticated;
