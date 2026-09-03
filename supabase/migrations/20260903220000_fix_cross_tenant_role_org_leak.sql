-- Fix SaaS cross-tenant leak: changing a member role/invite must not move
-- the user onto another clinic's operating context.
--
-- 1) clinic_organization_id_for_user previously ranked memberships by role
--    (admin > receptionist > doctor). Inviting someone as admin/receptionist
--    into Clinic B made Clinic B win over their home clinic.
-- 2) attach_organization_member moved doctor_profiles.organization_id unless
--    the doctor owned another org — so non-owner doctors were stolen from
--    their home clinic when invited elsewhere.
-- 3) enforce_profile_role allowed staff_provision users to change their own
--    profiles.role after signup (privilege escalation).

CREATE OR REPLACE FUNCTION private.clinic_organization_id_for_user()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT COALESCE(
    -- Prefer a clinic the user owns (stable home tenant).
    (
      SELECT m.organization_id
      FROM public.organization_members m
      WHERE m.user_id = auth.uid()
        AND m.is_active = true
        AND m.member_role = 'owner'
      ORDER BY m.created_at ASC
      LIMIT 1
    ),
    -- Doctors: stick to doctor_profiles home clinic.
    (
      SELECT dp.organization_id
      FROM public.doctor_profiles dp
      WHERE dp.user_id = auth.uid()
        AND dp.organization_id IS NOT NULL
      LIMIT 1
    ),
    -- Otherwise oldest active membership (do not jump when invite role changes).
    (
      SELECT m.organization_id
      FROM public.organization_members m
      WHERE m.user_id = auth.uid()
        AND m.is_active = true
      ORDER BY m.created_at ASC
      LIMIT 1
    ),
    CASE
      WHEN public.is_admin() THEN private.default_organization_id()
      ELSE NULL
    END
  );
$$;

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

  -- Only bind doctor home clinic when unset. Never steal from another org.
  IF p_role = 'doctor' THEN
    UPDATE public.doctor_profiles dp
    SET organization_id = p_org_id, updated_at = now()
    WHERE dp.user_id = p_user_id
      AND dp.organization_id IS NULL;
  END IF;
END;
$$;

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
    -- Only platform admins may change role after insert.
    -- staff_provision must not allow self-service role changes.
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      IF NOT public.is_admin() THEN
        NEW.role := OLD.role;
      ELSIF NEW.role NOT IN ('patient', 'doctor', 'admin', 'super_admin', 'receptionist') THEN
        NEW.role := OLD.role;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
