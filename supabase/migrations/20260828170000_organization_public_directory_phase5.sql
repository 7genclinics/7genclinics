-- Phase 5: clinic owners can update their org (public listing, contact).
-- Public read of listed orgs already exists.

GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT UPDATE ON public.organizations TO authenticated;

DROP POLICY IF EXISTS "Managers update their organization" ON public.organizations;
CREATE POLICY "Managers update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (private.is_organization_manager(id))
  WITH CHECK (private.is_organization_manager(id));
