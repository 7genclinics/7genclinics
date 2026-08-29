-- Phase 1: wrap the live clinic as one Organization tenant.
-- Existing inserts keep working via default organization_id.
-- RLS on appointments / reception is unchanged (phase 2).
-- Do not apply this to any project other than this clinic database.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_kind' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.organization_kind AS ENUM ('clinic', 'hospital', 'solo_practice');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.organization_status AS ENUM ('pending', 'active', 'suspended', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_member_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.organization_member_role AS ENUM ('owner', 'admin', 'doctor', 'receptionist');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind public.organization_kind NOT NULL DEFAULT 'clinic',
  status public.organization_status NOT NULL DEFAULT 'active',
  is_publicly_listed BOOLEAN NOT NULL DEFAULT true,
  city TEXT,
  phone TEXT,
  address TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_status_listed
  ON public.organizations (status, is_publicly_listed)
  WHERE status = 'active' AND is_publicly_listed = true;

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role public.organization_member_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON public.organization_members (user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_organization_members_org_role
  ON public.organization_members (organization_id, member_role)
  WHERE is_active = true;

INSERT INTO public.organizations (slug, name, kind, status, is_publicly_listed, city)
SELECT
  'default',
  COALESCE(
    NULLIF(trim(both '"' from public.platform_settings.value::text), ''),
    'Apna Clinic'
  ),
  'clinic',
  'active',
  true,
  'Lahore'
FROM (SELECT 1) AS _
LEFT JOIN public.platform_settings
  ON public.platform_settings.key = 'clinic_name'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'default');

CREATE OR REPLACE FUNCTION private.default_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.organizations WHERE slug = 'default' LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.default_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.default_organization_id() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.default_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public, private
AS $$
  SELECT private.default_organization_id();
$$;

REVOKE ALL ON FUNCTION public.default_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.default_organization_id() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.tg_set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := private.default_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.tg_organization_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT a.organization_id INTO NEW.organization_id
    FROM public.appointments a
    WHERE a.id = NEW.appointment_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := private.default_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.tg_organization_from_consultation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.consultation_id IS NOT NULL THEN
    SELECT c.organization_id INTO NEW.organization_id
    FROM public.consultations c
    WHERE c.id = NEW.consultation_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := private.default_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.tg_organization_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.invoice_id IS NOT NULL THEN
    SELECT i.organization_id INTO NEW.organization_id
    FROM public.invoices i
    WHERE i.id = NEW.invoice_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := private.default_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.tg_organization_from_prescription()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.prescription_id IS NOT NULL THEN
    SELECT p.organization_id INTO NEW.organization_id
    FROM public.prescriptions p
    WHERE p.id = NEW.prescription_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := private.default_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.tg_organization_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.subscription_id IS NOT NULL THEN
    SELECT s.organization_id INTO NEW.organization_id
    FROM public.clinic_subscriptions s
    WHERE s.id = NEW.subscription_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := private.default_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.tg_set_organization_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.tg_organization_from_appointment() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.tg_organization_from_consultation() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.tg_organization_from_invoice() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.tg_organization_from_prescription() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.tg_organization_from_subscription() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.tg_set_organization_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.tg_organization_from_appointment() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.tg_organization_from_consultation() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.tg_organization_from_invoice() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.tg_organization_from_prescription() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.tg_organization_from_subscription() TO anon, authenticated, service_role;

DO $$
DECLARE
  rel text;
  parent_rels text[] := ARRAY[
    'appointments',
    'payments',
    'reviews',
    'availability_slots',
    'doctor_blocked_slots',
    'doctor_profiles',
    'doctor_landing_pages',
    'doctor_public_services',
    'doctor_medicines',
    'services',
    'consultations',
    'vitals',
    'prescriptions',
    'prescription_items',
    'invoices',
    'invoice_items',
    'clinic_payments',
    'patient_documents',
    'audit_logs',
    'admin_staff',
    'payment_accounts',
    'no_show_events',
    'clinic_subscriptions',
    'clinic_subscription_payments'
  ];
BEGIN
  FOREACH rel IN ARRAY parent_rels LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id)',
      rel
    );
  END LOOP;
END
$$;

UPDATE public.appointments SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.services SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.availability_slots SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.doctor_blocked_slots SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.doctor_profiles SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.doctor_landing_pages SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.doctor_public_services SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.doctor_medicines SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.admin_staff SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.payment_accounts SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.audit_logs SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;
UPDATE public.clinic_subscriptions SET organization_id = private.default_organization_id() WHERE organization_id IS NULL;

UPDATE public.payments p
SET organization_id = a.organization_id
FROM public.appointments a
WHERE p.appointment_id = a.id AND p.organization_id IS NULL;

UPDATE public.reviews r
SET organization_id = a.organization_id
FROM public.appointments a
WHERE r.appointment_id = a.id AND r.organization_id IS NULL;

UPDATE public.consultations c
SET organization_id = a.organization_id
FROM public.appointments a
WHERE c.appointment_id = a.id AND c.organization_id IS NULL;

UPDATE public.invoices i
SET organization_id = a.organization_id
FROM public.appointments a
WHERE i.appointment_id = a.id AND i.organization_id IS NULL;

UPDATE public.prescriptions pr
SET organization_id = a.organization_id
FROM public.appointments a
WHERE pr.appointment_id = a.id AND pr.organization_id IS NULL;

UPDATE public.clinic_payments cp
SET organization_id = a.organization_id
FROM public.appointments a
WHERE cp.appointment_id = a.id AND cp.organization_id IS NULL;

UPDATE public.patient_documents d
SET organization_id = a.organization_id
FROM public.appointments a
WHERE d.appointment_id = a.id AND d.organization_id IS NULL;

UPDATE public.no_show_events n
SET organization_id = a.organization_id
FROM public.appointments a
WHERE n.appointment_id = a.id AND n.organization_id IS NULL;

UPDATE public.clinic_subscription_payments pay
SET organization_id = s.organization_id
FROM public.clinic_subscriptions s
WHERE pay.subscription_id = s.id AND pay.organization_id IS NULL;

UPDATE public.vitals v
SET organization_id = c.organization_id
FROM public.consultations c
WHERE v.consultation_id = c.id AND v.organization_id IS NULL;

UPDATE public.invoice_items ii
SET organization_id = i.organization_id
FROM public.invoices i
WHERE ii.invoice_id = i.id AND ii.organization_id IS NULL;

UPDATE public.prescription_items pi
SET organization_id = p.organization_id
FROM public.prescriptions p
WHERE pi.prescription_id = p.id AND pi.organization_id IS NULL;

-- Any remaining nulls (orphans) still wrap into the default tenant.
DO $$
DECLARE
  rel text;
  rels text[] := ARRAY[
    'appointments', 'payments', 'reviews', 'availability_slots', 'doctor_blocked_slots',
    'doctor_profiles', 'doctor_landing_pages', 'doctor_public_services', 'doctor_medicines',
    'services', 'consultations', 'vitals', 'prescriptions', 'prescription_items',
    'invoices', 'invoice_items', 'clinic_payments', 'patient_documents', 'audit_logs',
    'admin_staff', 'payment_accounts', 'no_show_events', 'clinic_subscriptions',
    'clinic_subscription_payments'
  ];
BEGIN
  FOREACH rel IN ARRAY rels LOOP
    EXECUTE format(
      'UPDATE public.%I SET organization_id = private.default_organization_id() WHERE organization_id IS NULL',
      rel
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN organization_id SET DEFAULT private.default_organization_id()',
      rel
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL',
      rel
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_organization_id ON public.%I (organization_id)',
      rel,
      rel
    );
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_subscriptions_organization_id
  ON public.clinic_subscriptions (organization_id);

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER trg_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_org_id_appointments ON public.appointments;
CREATE TRIGGER trg_org_id_appointments
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_services ON public.services;
CREATE TRIGGER trg_org_id_services
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_availability_slots ON public.availability_slots;
CREATE TRIGGER trg_org_id_availability_slots
  BEFORE INSERT ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_doctor_blocked_slots ON public.doctor_blocked_slots;
CREATE TRIGGER trg_org_id_doctor_blocked_slots
  BEFORE INSERT ON public.doctor_blocked_slots
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_doctor_profiles ON public.doctor_profiles;
CREATE TRIGGER trg_org_id_doctor_profiles
  BEFORE INSERT ON public.doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_doctor_landing_pages ON public.doctor_landing_pages;
CREATE TRIGGER trg_org_id_doctor_landing_pages
  BEFORE INSERT ON public.doctor_landing_pages
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_doctor_public_services ON public.doctor_public_services;
CREATE TRIGGER trg_org_id_doctor_public_services
  BEFORE INSERT ON public.doctor_public_services
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_doctor_medicines ON public.doctor_medicines;
CREATE TRIGGER trg_org_id_doctor_medicines
  BEFORE INSERT ON public.doctor_medicines
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_admin_staff ON public.admin_staff;
CREATE TRIGGER trg_org_id_admin_staff
  BEFORE INSERT ON public.admin_staff
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_payment_accounts ON public.payment_accounts;
CREATE TRIGGER trg_org_id_payment_accounts
  BEFORE INSERT ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_org_id_audit_logs
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_clinic_subscriptions ON public.clinic_subscriptions;
CREATE TRIGGER trg_org_id_clinic_subscriptions
  BEFORE INSERT ON public.clinic_subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.tg_set_organization_id();

DROP TRIGGER IF EXISTS trg_org_id_payments ON public.payments;
CREATE TRIGGER trg_org_id_payments
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_reviews ON public.reviews;
CREATE TRIGGER trg_org_id_reviews
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_consultations ON public.consultations;
CREATE TRIGGER trg_org_id_consultations
  BEFORE INSERT ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_invoices ON public.invoices;
CREATE TRIGGER trg_org_id_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_prescriptions ON public.prescriptions;
CREATE TRIGGER trg_org_id_prescriptions
  BEFORE INSERT ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_clinic_payments ON public.clinic_payments;
CREATE TRIGGER trg_org_id_clinic_payments
  BEFORE INSERT ON public.clinic_payments
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_patient_documents ON public.patient_documents;
CREATE TRIGGER trg_org_id_patient_documents
  BEFORE INSERT ON public.patient_documents
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_no_show_events ON public.no_show_events;
CREATE TRIGGER trg_org_id_no_show_events
  BEFORE INSERT ON public.no_show_events
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_appointment();

DROP TRIGGER IF EXISTS trg_org_id_vitals ON public.vitals;
CREATE TRIGGER trg_org_id_vitals
  BEFORE INSERT ON public.vitals
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_consultation();

DROP TRIGGER IF EXISTS trg_org_id_invoice_items ON public.invoice_items;
CREATE TRIGGER trg_org_id_invoice_items
  BEFORE INSERT ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_invoice();

DROP TRIGGER IF EXISTS trg_org_id_prescription_items ON public.prescription_items;
CREATE TRIGGER trg_org_id_prescription_items
  BEFORE INSERT ON public.prescription_items
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_prescription();

DROP TRIGGER IF EXISTS trg_org_id_clinic_subscription_payments ON public.clinic_subscription_payments;
CREATE TRIGGER trg_org_id_clinic_subscription_payments
  BEFORE INSERT ON public.clinic_subscription_payments
  FOR EACH ROW EXECUTE FUNCTION private.tg_organization_from_subscription();

-- Backfill memberships. One row per user in the default org.
-- First approved doctor becomes owner so the tenant has a clinic manager later.
INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
SELECT
  private.default_organization_id(),
  owner.id,
  'owner'::public.organization_member_role,
  COALESCE(owner.is_active, true)
FROM (
  SELECT p.id, p.is_active
  FROM public.profiles p
  WHERE p.role = 'doctor' AND p.account_status = 'approved'
  ORDER BY p.created_at ASC
  LIMIT 1
) owner
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
SELECT
  private.default_organization_id(),
  p.id,
  'doctor'::public.organization_member_role,
  COALESCE(p.is_active, true)
FROM public.profiles p
WHERE p.role = 'doctor'
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = private.default_organization_id()
      AND m.user_id = p.id
  )
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
SELECT
  private.default_organization_id(),
  p.id,
  'receptionist'::public.organization_member_role,
  COALESCE(p.is_active, true)
FROM public.profiles p
WHERE p.role = 'receptionist'
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- If there is no doctor yet, keep the org owned by the earliest platform admin.
INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
SELECT
  private.default_organization_id(),
  p.id,
  'owner'::public.organization_member_role,
  COALESCE(p.is_active, true)
FROM public.profiles p
WHERE p.role IN ('admin', 'super_admin')
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = private.default_organization_id()
      AND m.member_role = 'owner'
  )
ORDER BY p.created_at ASC
LIMIT 1
ON CONFLICT (organization_id, user_id) DO NOTHING;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published organizations are readable" ON public.organizations;
CREATE POLICY "Published organizations are readable"
  ON public.organizations FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND is_publicly_listed = true);

DROP POLICY IF EXISTS "Admins read all organizations" ON public.organizations;
CREATE POLICY "Admins read all organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Members read their organizations" ON public.organizations;
CREATE POLICY "Members read their organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins manage organizations" ON public.organizations;
CREATE POLICY "Super admins manage organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Users read own memberships" ON public.organization_members;
CREATE POLICY "Users read own memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Super admins manage memberships" ON public.organization_members;
CREATE POLICY "Super admins manage memberships"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
