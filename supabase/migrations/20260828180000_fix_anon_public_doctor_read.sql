-- Anon users must read approved doctors for the public directory.
-- Operator RLS policies call is_organization_operator(); without EXECUTE for anon,
-- PostgREST returns "permission denied for function is_organization_operator".

GRANT EXECUTE ON FUNCTION private.is_organization_operator(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_operator(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_operate_profile(uuid) TO anon, authenticated;

-- Operator policies only apply to signed-in staff; anon relies on public approved-doctor policies.
DROP POLICY IF EXISTS "Clinic operators view org doctors" ON public.doctor_profiles;
CREATE POLICY "Clinic operators view org doctors"
  ON public.doctor_profiles FOR SELECT
  TO authenticated
  USING (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Clinic operators view org profiles" ON public.profiles;
CREATE POLICY "Clinic operators view org profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (private.can_operate_profile(id));
