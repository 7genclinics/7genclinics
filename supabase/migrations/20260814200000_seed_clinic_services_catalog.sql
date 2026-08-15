INSERT INTO public.services (name, description, default_fee, is_active)
SELECT v.name, v.description, v.default_fee, true
FROM (VALUES
  ('Follow-up Visit', 'Return visit for an existing concern', 1500::numeric),
  ('Walk-in Consultation', 'Same-day walk-in visit at the desk', 2500::numeric),
  ('Specialist Consultation', 'In-clinic specialist consultation', 3500::numeric)
) AS v(name, description, default_fee)
WHERE NOT EXISTS (
  SELECT 1 FROM public.services s WHERE lower(s.name) = lower(v.name)
);
