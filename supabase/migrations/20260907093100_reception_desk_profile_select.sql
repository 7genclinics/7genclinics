DROP POLICY IF EXISTS "Clinic members can view reception desk profiles" ON public.profiles;
CREATE POLICY "Clinic members can view reception desk profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (private.is_visible_clinic_desk(id));
