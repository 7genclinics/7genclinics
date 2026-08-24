-- Allow approved doctors to create receptionist/front-desk logins for their clinic.

CREATE OR REPLACE FUNCTION public.is_approved_doctor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.doctor_profiles dp ON dp.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'doctor'
      AND p.is_active = true
      AND p.account_status = 'approved'
      AND dp.status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_doctor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_doctor() TO authenticated;

CREATE OR REPLACE FUNCTION public.provision_clinic_staff(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role user_role,
  p_permissions jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_instance_id uuid;
  v_meta jsonb;
  v_email text;
BEGIN
  IF NOT public.is_approved_doctor() THEN
    RAISE EXCEPTION 'Only approved doctors can create reception staff';
  END IF;

  IF p_role IS DISTINCT FROM 'receptionist' THEN
    RAISE EXCEPTION 'Doctors can only create receptionist accounts';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO v_instance_id;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  v_meta := jsonb_build_object(
    'full_name', trim(p_full_name),
    'role', 'receptionist',
    'phone', coalesce(trim(p_phone), ''),
    'staff_provision', 'true',
    'email', v_email,
    'created_by_doctor', auth.uid()::text
  );

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, v_user_id, 'authenticated', 'authenticated', v_email, v_encrypted_pw,
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'receptionist'),
    v_meta, now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_email,
    now(),
    now(),
    now()
  );

  UPDATE public.profiles
  SET
    full_name = trim(p_full_name),
    phone = NULLIF(trim(p_phone), ''),
    role = 'receptionist',
    account_status = 'approved',
    is_active = true,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.admin_staff (user_id, created_by, permissions, is_active)
  VALUES (v_user_id, auth.uid(), COALESCE(p_permissions, '{}'::jsonb), true)
  ON CONFLICT (user_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    is_active = true,
    created_by = COALESCE(admin_staff.created_by, EXCLUDED.created_by);

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_clinic_staff(text, text, text, text, user_role, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_clinic_staff(text, text, text, text, user_role, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_doctor_clinic_staff()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_approved_doctor() THEN
    RAISE EXCEPTION 'Only approved doctors can view clinic staff';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    COALESCE(p.is_active, false),
    p.created_at
  FROM public.admin_staff s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.created_by = auth.uid()
    AND p.role = 'receptionist'
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_doctor_clinic_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_doctor_clinic_staff() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_doctor_clinic_staff_active(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_approved_doctor() THEN
    RAISE EXCEPTION 'Only approved doctors can update clinic staff';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_staff s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.user_id = p_user_id
      AND s.created_by = auth.uid()
      AND p.role = 'receptionist'
  ) THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  UPDATE public.profiles
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.admin_staff
  SET is_active = p_is_active
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_doctor_clinic_staff_active(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_doctor_clinic_staff_active(uuid, boolean) TO authenticated;
