-- Patient payment-proof review belongs to the assigned doctor.
-- Superadmin can still settle payouts and complete refunds.
-- Doctor review runs with the service role (auth.uid() is null), so is_admin() stays false.

CREATE OR REPLACE FUNCTION public.block_admin_payment_proof_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    IF (
      OLD.status IS DISTINCT FROM NEW.status
      AND NOT (OLD.status = 'completed' AND NEW.status = 'refunded')
    )
    OR OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by
    OR OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at
    OR OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason
    OR OLD.transaction_id IS DISTINCT FROM NEW.transaction_id
    OR OLD.proof_url IS DISTINCT FROM NEW.proof_url
    THEN
      RAISE EXCEPTION 'Patient payment proofs are reviewed by the assigned doctor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_admin_payment_proof_review ON public.payments;
CREATE TRIGGER trg_block_admin_payment_proof_review
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.block_admin_payment_proof_review();

CREATE OR REPLACE FUNCTION public.block_admin_confirm_unpaid_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin()
     AND OLD.status = 'pending_payment'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'cancelled'
  THEN
    RAISE EXCEPTION 'Only the assigned doctor can confirm a booking that is awaiting payment';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_admin_confirm_unpaid_booking ON public.appointments;
CREATE TRIGGER trg_block_admin_confirm_unpaid_booking
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.block_admin_confirm_unpaid_booking();
