-- Organization invites send email from the app. Reception invites create a
-- login (people cannot self-register as receptionist). Doctor/clinic-admin
-- invites keep a join token. Staff provisioning writes auth.identities so
-- platform staff can sign in.

CREATE OR REPLACE FUNCTION public.provision_organization_receptionist(
  p_organization_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_permissions jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, private
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_instance_id uuid;
  v_meta jsonb;
  v_email text;
BEGIN
  IF NOT private.is_organization_manager(p_organization_id) THEN
    RAISE EXCEPTION 'Only clinic owners or platform admins can create reception staff';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' OR v_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'A valid email is required';
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
    'full_name', trim(COALESCE(p_full_name, '')),
    'role', 'receptionist',
    'phone', coalesce(trim(p_phone), ''),
    'staff_provision', 'true',
    'email', v_email,
    'created_by', auth.uid()::text
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
    full_name = COALESCE(NULLIF(trim(COALESCE(p_full_name, '')), ''), split_part(v_email, '@', 1)),
    phone = NULLIF(trim(p_phone), ''),
    role = 'receptionist',
    account_status = 'approved',
    is_active = true,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.admin_staff (user_id, created_by, permissions, is_active, organization_id)
  VALUES (v_user_id, auth.uid(), COALESCE(p_permissions, '{}'::jsonb), true, p_organization_id)
  ON CONFLICT (user_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    is_active = true,
    created_by = COALESCE(admin_staff.created_by, EXCLUDED.created_by),
    organization_id = EXCLUDED.organization_id;

  INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
  VALUES (p_organization_id, v_user_id, 'receptionist', true)
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET member_role = 'receptionist', is_active = true, updated_at = now();

  UPDATE public.organization_invites
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  WHERE organization_id = p_organization_id
    AND email = v_email
    AND status = 'pending';

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_organization_receptionist(uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_organization_receptionist(uuid, text, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_organization_invite_preview(p_token text)
RETURNS TABLE (
  organization_name text,
  email text,
  member_role public.organization_member_role,
  status public.organization_invite_status,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.name, i.email, i.member_role, i.status, i.expires_at
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = trim(p_token)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_organization_invite_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_invite_preview(text) TO anon, authenticated;

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
  IF v_inv.member_role = 'admin' AND v_role NOT IN ('admin', 'super_admin', 'doctor') THEN
    RAISE EXCEPTION 'This invite is for a clinic admin or doctor account';
  END IF;

  PERFORM private.attach_organization_member(v_inv.organization_id, auth.uid(), v_inv.member_role);

  UPDATE public.organization_invites
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  WHERE id = v_inv.id;

  RETURN v_inv.organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_staff_member(
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
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can provision staff';
  END IF;

  IF p_role NOT IN ('admin', 'super_admin', 'receptionist') THEN
    RAISE EXCEPTION 'Invalid staff role';
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
    'role', p_role::text,
    'phone', coalesce(trim(p_phone), ''),
    'staff_provision', 'true',
    'email', v_email
  );

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, v_user_id, 'authenticated', 'authenticated', v_email, v_encrypted_pw,
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role::text),
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
    role = p_role,
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
