-- Doctors can assign full or module-level access when creating reception staff.

DROP FUNCTION IF EXISTS public.list_doctor_clinic_staff();

CREATE FUNCTION public.list_doctor_clinic_staff()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  is_active boolean,
  created_at timestamptz,
  permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NOT public.is_approved_doctor() THEN
    RAISE EXCEPTION 'Only approved doctors can view clinic staff';
  END IF;

  v_org := private.clinic_organization_id_for_user();
  IF v_org IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    COALESCE(p.is_active, false),
    p.created_at,
    COALESCE(s.permissions, '{}'::jsonb)
  FROM public.organization_members m
  JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.admin_staff s ON s.user_id = p.id
  WHERE m.organization_id = v_org
    AND m.member_role = 'receptionist'
    AND m.is_active = true
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_doctor_clinic_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_doctor_clinic_staff() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_doctor_clinic_staff_permissions(
  p_user_id uuid,
  p_permissions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NOT public.is_approved_doctor() THEN
    RAISE EXCEPTION 'Only approved doctors can update clinic staff';
  END IF;

  v_org := private.clinic_organization_id_for_user();

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.user_id = p_user_id
      AND m.organization_id = v_org
      AND m.member_role = 'receptionist'
      AND p.role = 'receptionist'
  ) THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  INSERT INTO public.admin_staff (user_id, created_by, permissions, is_active, organization_id)
  VALUES (p_user_id, auth.uid(), COALESCE(p_permissions, '{}'::jsonb), true, v_org)
  ON CONFLICT (user_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    organization_id = COALESCE(admin_staff.organization_id, EXCLUDED.organization_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_doctor_clinic_staff_permissions(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_doctor_clinic_staff_permissions(uuid, jsonb) TO authenticated;
