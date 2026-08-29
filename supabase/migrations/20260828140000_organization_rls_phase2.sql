-- Phase 2: organization-scoped clinic operator access.
-- Reception / owner / clinic admin see only their org.
-- Platform admin (profiles.role admin/super_admin) still sees all orgs.
-- Regular doctor membership is not clinic-wide; owners are operators.
-- SECURITY DEFINER helpers live in private (not public).

CREATE OR REPLACE FUNCTION private.is_organization_operator(p_org_id uuid)
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
        AND m.member_role IN ('owner', 'admin', 'receptionist')
    )
  );
$$;

CREATE OR REPLACE FUNCTION private.is_any_organization_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.user_id = auth.uid()
      AND m.is_active = true
      AND m.member_role IN ('owner', 'admin', 'receptionist')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_organization_operator_for_appointment(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT COALESCE(
    (
      SELECT private.is_organization_operator(a.organization_id)
      FROM public.appointments a
      WHERE a.id = p_appointment_id
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.is_organization_operator_for_doctor(p_doctor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT COALESCE(
    (
      SELECT private.is_organization_operator(d.organization_id)
      FROM public.doctor_profiles d
      WHERE d.id = p_doctor_id
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.can_operate_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.user_id = auth.uid()
      AND m.is_active = true
      AND m.member_role IN ('owner', 'admin', 'receptionist')
      AND (
        EXISTS (
          SELECT 1
          FROM public.appointments a
          WHERE a.patient_id = p_profile_id
            AND a.organization_id = m.organization_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.organization_members peer
          WHERE peer.user_id = p_profile_id
            AND peer.organization_id = m.organization_id
            AND peer.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = p_profile_id
            AND p.role = 'patient'
            AND p.approved_by = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_organization_operator(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_any_organization_operator() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_organization_operator_for_appointment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_organization_operator_for_doctor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_operate_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_organization_operator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_any_organization_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_organization_operator_for_appointment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_organization_operator_for_doctor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_operate_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_organization_operator(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, private
AS $$
  SELECT COALESCE(private.is_organization_operator(p_organization_id), false);
$$;

REVOKE ALL ON FUNCTION public.is_organization_operator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_operator(uuid) TO authenticated;

-- Any-org operator (storage + catalog). Row access must use org_id helpers.
CREATE OR REPLACE FUNCTION public.is_clinic_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
STABLE
AS $$
  SELECT private.is_any_organization_operator();
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Clinic staff view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinic operators view org profiles" ON public.profiles;
CREATE POLICY "Clinic operators view org profiles"
  ON public.profiles FOR SELECT
  USING (private.can_operate_profile(id));

DROP POLICY IF EXISTS "Clinic staff update patient profiles" ON public.profiles;
CREATE POLICY "Clinic staff update patient profiles"
  ON public.profiles FOR UPDATE
  USING (private.can_operate_profile(id) AND role = 'patient')
  WITH CHECK (private.can_operate_profile(id) AND role = 'patient');

DROP POLICY IF EXISTS "Clinic staff view doctors" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Clinic operators view org doctors" ON public.doctor_profiles;
CREATE POLICY "Clinic operators view org doctors"
  ON public.doctor_profiles FOR SELECT
  USING (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Clinic staff manage appointments" ON public.appointments;
CREATE POLICY "Clinic staff manage appointments"
  ON public.appointments FOR ALL
  USING (private.is_organization_operator(organization_id))
  WITH CHECK (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Authenticated read active services" ON public.services;
CREATE POLICY "Authenticated read active services"
  ON public.services FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin() OR private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Consultation access" ON public.consultations;
CREATE POLICY "Consultation access"
  ON public.consultations FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = consultations.doctor_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Doctors write own consultations" ON public.consultations;
CREATE POLICY "Doctors write own consultations"
  ON public.consultations FOR ALL
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = consultations.doctor_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = consultations.doctor_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vitals access" ON public.vitals;
CREATE POLICY "Vitals access"
  ON public.vitals FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = vitals.consultation_id
        AND (
          c.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = c.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Vitals write" ON public.vitals;
CREATE POLICY "Vitals write"
  ON public.vitals FOR ALL
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = vitals.consultation_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = vitals.consultation_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Prescriptions access" ON public.prescriptions;
CREATE POLICY "Prescriptions access"
  ON public.prescriptions FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = prescriptions.doctor_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Prescriptions write" ON public.prescriptions;
CREATE POLICY "Prescriptions write"
  ON public.prescriptions FOR ALL
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = prescriptions.doctor_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = prescriptions.doctor_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Prescription items access" ON public.prescription_items;
CREATE POLICY "Prescription items access"
  ON public.prescription_items FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_items.prescription_id
        AND (
          p.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = p.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Prescription items write" ON public.prescription_items;
CREATE POLICY "Prescription items write"
  ON public.prescription_items FOR ALL
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.prescriptions p
      JOIN public.doctor_profiles dp ON dp.id = p.doctor_id
      WHERE p.id = prescription_items.prescription_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.prescriptions p
      JOIN public.doctor_profiles dp ON dp.id = p.doctor_id
      WHERE p.id = prescription_items.prescription_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Invoices access" ON public.invoices;
CREATE POLICY "Invoices access"
  ON public.invoices FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = invoices.doctor_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Invoices write clinic staff" ON public.invoices;
CREATE POLICY "Invoices write clinic staff"
  ON public.invoices FOR ALL
  USING (private.is_organization_operator(organization_id))
  WITH CHECK (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Invoice items access" ON public.invoice_items;
CREATE POLICY "Invoice items access"
  ON public.invoice_items FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND (
          i.patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.doctor_profiles dp
            WHERE dp.id = i.doctor_id AND dp.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Invoice items write clinic staff" ON public.invoice_items;
CREATE POLICY "Invoice items write clinic staff"
  ON public.invoice_items FOR ALL
  USING (private.is_organization_operator(organization_id))
  WITH CHECK (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Clinic payments access" ON public.clinic_payments;
CREATE POLICY "Clinic payments access"
  ON public.clinic_payments FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = clinic_payments.invoice_id AND i.patient_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clinic payments write" ON public.clinic_payments;
CREATE POLICY "Clinic payments write"
  ON public.clinic_payments FOR ALL
  USING (private.is_organization_operator(organization_id))
  WITH CHECK (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Patient documents access" ON public.patient_documents;
CREATE POLICY "Patient documents access"
  ON public.patient_documents FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = patient_documents.consultation_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Patient documents write" ON public.patient_documents;
CREATE POLICY "Patient documents write"
  ON public.patient_documents FOR ALL
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = patient_documents.consultation_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctor_profiles dp ON dp.id = c.doctor_id
      WHERE c.id = patient_documents.consultation_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Audit logs clinic staff" ON public.audit_logs;
CREATE POLICY "Audit logs clinic staff"
  ON public.audit_logs FOR SELECT
  USING (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Clinic staff view payments" ON public.payments;
CREATE POLICY "Clinic staff view payments"
  ON public.payments FOR SELECT
  USING (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Read doctor medicines" ON public.doctor_medicines;
CREATE POLICY "Read doctor medicines"
  ON public.doctor_medicines FOR SELECT
  USING (
    private.is_organization_operator(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.doctor_profiles dp
      WHERE dp.id = doctor_medicines.doctor_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clinic staff manage doctor medicines" ON public.doctor_medicines;
CREATE POLICY "Clinic staff manage doctor medicines"
  ON public.doctor_medicines FOR ALL
  TO authenticated
  USING (private.is_organization_operator(organization_id))
  WITH CHECK (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Org operators read org memberships" ON public.organization_members;
CREATE POLICY "Org operators read org memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (private.is_organization_operator(organization_id));

DROP POLICY IF EXISTS "Org operators view org staff" ON public.admin_staff;
CREATE POLICY "Org operators view org staff"
  ON public.admin_staff FOR SELECT
  TO authenticated
  USING (private.is_organization_operator(organization_id));
