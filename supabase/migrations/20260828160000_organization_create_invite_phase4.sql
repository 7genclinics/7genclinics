-- Phase 4: create organizations and invite members.
-- Platform admins and approved doctors can create a tenant.
-- Owners / clinic admins invite doctors and receptionists.
-- SECURITY DEFINER helpers live in private.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'organization_invite_status' AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.organization_invite_status AS ENUM ('pending', 'accepted', 'revoked');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  member_role public.organization_member_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status public.organization_invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_invites_org_status
  ON public.organization_invites (organization_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_invites_pending_email
  ON public.organization_invites (organization_id, email)
  WHERE status = 'pending';

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_organization_manager(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT p_org_id IS NOT NULL AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = p_org_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.member_role IN ('owner', 'admin')
    )
  );
$$;

REVOKE ALL ON FUNCTION private.is_organization_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_organization_manager(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.unique_organization_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  base := lower(trim(coalesce(p_name, '')));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  IF base = '' OR base = 'default' THEN
    base := 'clinic';
  END IF;
  IF char_length(base) > 60 THEN
    base := left(base, 60);
    base := regexp_replace(base, '-$', '');
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = candidate) LOOP
    n := n + 1;
    candidate := left(base, 56) || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION private.unique_organization_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.unique_organization_slug(text) TO authenticated;

CREATE OR REPLACE FUNCTION private.bootstrap_organization(p_org_id uuid, p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_plan text;
  v_paid date;
  v_default uuid;
BEGIN
  v_default := private.default_organization_id();
  v_plan := COALESCE(
    (SELECT id FROM public.clinic_subscription_plans WHERE id = 'standard' AND is_active LIMIT 1),
    (SELECT id FROM public.clinic_subscription_plans WHERE is_active ORDER BY sort_order LIMIT 1)
  );
  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'No subscription plan is configured';
  END IF;

  v_paid := (date_trunc('month', public.clinic_pkt_today()::timestamp) + interval '2 months' - interval '1 day')::date;

  INSERT INTO public.clinic_subscriptions (slug, plan_id, paid_through, organization_id)
  VALUES (p_slug, v_plan, v_paid, p_org_id);

  IF v_default IS NOT NULL AND v_default IS DISTINCT FROM p_org_id THEN
    INSERT INTO public.services (name, description, default_fee, is_active, organization_id)
    SELECT s.name, s.description, s.default_fee, s.is_active, p_org_id
    FROM public.services s
    WHERE s.organization_id = v_default AND s.is_active = true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.bootstrap_organization(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.create_organization(
  p_name text,
  p_kind public.organization_kind,
  p_city text,
  p_phone text,
  p_address text,
  p_is_publicly_listed boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_name text;
  v_slug text;
  v_org uuid;
  v_kind public.organization_kind;
BEGIN
  v_name := NULLIF(trim(p_name), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Clinic name is required';
  END IF;

  v_kind := COALESCE(p_kind, 'clinic'::public.organization_kind);

  IF NOT (
    public.is_admin()
    OR public.is_approved_doctor()
  ) THEN
    RAISE EXCEPTION 'Only platform admins or approved doctors can create a clinic';
  END IF;

  v_slug := private.unique_organization_slug(v_name);

  INSERT INTO public.organizations (
    slug, name, kind, status, is_publicly_listed, city, phone, address, created_by
  ) VALUES (
    v_slug,
    v_name,
    v_kind,
    'active',
    COALESCE(p_is_publicly_listed, false),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_phone), ''),
    NULLIF(trim(p_address), ''),
    auth.uid()
  )
  RETURNING id INTO v_org;

  PERFORM private.bootstrap_organization(v_org, v_slug);

  IF NOT public.is_admin() THEN
    INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
    VALUES (v_org, auth.uid(), 'owner', true)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET member_role = 'owner', is_active = true, updated_at = now();

    UPDATE public.doctor_profiles
    SET organization_id = v_org, updated_at = now()
    WHERE user_id = auth.uid();
  END IF;

  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION private.create_organization(text, public.organization_kind, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_organization(text, public.organization_kind, text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_organization(
  p_name text,
  p_kind public.organization_kind DEFAULT 'clinic',
  p_city text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_is_publicly_listed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE sql
VOLATILE
SET search_path = public, private
AS $$
  SELECT private.create_organization(p_name, p_kind, p_city, p_phone, p_address, p_is_publicly_listed);
$$;

REVOKE ALL ON FUNCTION public.create_organization(text, public.organization_kind, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text, public.organization_kind, text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION private.attach_organization_member(
  p_org_id uuid,
  p_user_id uuid,
  p_role public.organization_member_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
  VALUES (p_org_id, p_user_id, p_role, true)
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET member_role = EXCLUDED.member_role, is_active = true, updated_at = now();

  IF p_role = 'doctor' THEN
    UPDATE public.doctor_profiles dp
    SET organization_id = p_org_id, updated_at = now()
    WHERE dp.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.user_id = p_user_id
          AND m.is_active = true
          AND m.member_role = 'owner'
          AND m.organization_id IS DISTINCT FROM p_org_id
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.attach_organization_member(uuid, uuid, public.organization_member_role) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.invite_organization_member(
  p_organization_id uuid,
  p_email text,
  p_member_role public.organization_member_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_email text;
  v_role public.organization_member_role;
  v_user uuid;
  v_profile_role public.user_role;
  v_token text;
  v_invite uuid;
BEGIN
  IF NOT private.is_organization_manager(p_organization_id) THEN
    RAISE EXCEPTION 'Only clinic owners or platform admins can invite members';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' OR v_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'A valid email is required';
  END IF;

  v_role := p_member_role;
  IF v_role IS NULL OR v_role = 'owner' THEN
    RAISE EXCEPTION 'Invite role must be admin, doctor, or receptionist';
  END IF;
  IF v_role NOT IN ('admin', 'doctor', 'receptionist') THEN
    RAISE EXCEPTION 'Invite role must be admin, doctor, or receptionist';
  END IF;

  SELECT p.id, p.role INTO v_user, v_profile_role
  FROM public.profiles p
  WHERE lower(p.email) = v_email
  LIMIT 1;

  IF v_user IS NOT NULL THEN
    IF v_role = 'doctor' AND v_profile_role IS DISTINCT FROM 'doctor' THEN
      RAISE EXCEPTION 'That account is not a doctor';
    END IF;
    IF v_role = 'receptionist' AND v_profile_role IS DISTINCT FROM 'receptionist' THEN
      RAISE EXCEPTION 'That account is not a receptionist';
    END IF;
    IF v_role = 'admin' AND v_profile_role NOT IN ('admin', 'super_admin', 'doctor') THEN
      RAISE EXCEPTION 'Clinic admin invites require an existing staff or doctor account';
    END IF;

    PERFORM private.attach_organization_member(p_organization_id, v_user, v_role);

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      v_user,
      'Added to a clinic',
      format('You were added to %s as %s.', (SELECT name FROM public.organizations WHERE id = p_organization_id), v_role),
      'organization',
      jsonb_build_object('organization_id', p_organization_id, 'member_role', v_role)
    );

    RETURN jsonb_build_object(
      'status', 'added',
      'organization_id', p_organization_id,
      'user_id', v_user,
      'member_role', v_role
    );
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.organization_invites (
    organization_id, email, member_role, token, invited_by
  ) VALUES (
    p_organization_id, v_email, v_role, v_token, auth.uid()
  )
  RETURNING id INTO v_invite;

  RETURN jsonb_build_object(
    'status', 'invited',
    'organization_id', p_organization_id,
    'invite_id', v_invite,
    'token', v_token,
    'email', v_email,
    'member_role', v_role
  );
END;
$$;

REVOKE ALL ON FUNCTION private.invite_organization_member(uuid, text, public.organization_member_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.invite_organization_member(uuid, text, public.organization_member_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.invite_organization_member(
  p_organization_id uuid,
  p_email text,
  p_member_role public.organization_member_role
)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SET search_path = public, private
AS $$
  SELECT private.invite_organization_member(p_organization_id, p_email, p_member_role);
$$;

REVOKE ALL ON FUNCTION public.invite_organization_member(uuid, text, public.organization_member_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_organization_member(uuid, text, public.organization_member_role) TO authenticated;

CREATE OR REPLACE FUNCTION private.accept_organization_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_inv public.organization_invites%ROWTYPE;
  v_email text;
  v_role public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to accept an invite';
  END IF;

  SELECT * INTO v_inv
  FROM public.organization_invites
  WHERE token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite is no longer valid';
  END IF;
  IF v_inv.expires_at <= now() THEN
    UPDATE public.organization_invites SET status = 'revoked' WHERE id = v_inv.id;
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  SELECT lower(email), role INTO v_email, v_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_email IS DISTINCT FROM v_inv.email THEN
    RAISE EXCEPTION 'Sign in with % to accept this invite', v_inv.email;
  END IF;

  IF v_inv.member_role = 'doctor' AND v_role IS DISTINCT FROM 'doctor' THEN
    RAISE EXCEPTION 'This invite is for a doctor account';
  END IF;
  IF v_inv.member_role = 'receptionist' AND v_role IS DISTINCT FROM 'receptionist' THEN
    RAISE EXCEPTION 'This invite is for a receptionist account';
  END IF;

  PERFORM private.attach_organization_member(v_inv.organization_id, auth.uid(), v_inv.member_role);

  UPDATE public.organization_invites
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  WHERE id = v_inv.id;

  RETURN v_inv.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION private.accept_organization_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.accept_organization_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_token text)
RETURNS uuid
LANGUAGE sql
VOLATILE
SET search_path = public, private
AS $$
  SELECT private.accept_organization_invite(p_token);
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_organization_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_invites WHERE id = p_invite_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF NOT private.is_organization_manager(v_org) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.organization_invites
  SET status = 'revoked'
  WHERE id = p_invite_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_organization_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_organization_invite(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users read own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Operators read org memberships" ON public.organization_members;
CREATE POLICY "Operators read org memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR private.is_organization_operator(organization_id)
    OR private.is_organization_manager(organization_id)
  );

DROP POLICY IF EXISTS "Managers read org invites" ON public.organization_invites;
CREATE POLICY "Managers read org invites"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR private.is_organization_manager(organization_id)
    OR (
      status = 'pending'
      AND email = (SELECT lower(p.email) FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

GRANT SELECT ON public.organization_invites TO authenticated;

NOTIFY pgrst, 'reload schema';
