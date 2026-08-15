-- Physical clinic enums. New values cannot be used until this transaction commits.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'receptionist';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'checked_in';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'waiting';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'with_doctor';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'payment_pending';
