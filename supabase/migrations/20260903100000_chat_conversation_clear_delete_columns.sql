-- Soft-delete / clear chat state used by the app (was referenced in code but never migrated).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deleted_by_a BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_b BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cleared_at_a TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleared_at_b TIMESTAMPTZ;

-- Participants need UPDATE for clear/delete chat actions.
DROP POLICY IF EXISTS "Participants can update their conversations" ON public.conversations;
CREATE POLICY "Participants can update their conversations"
  ON public.conversations
  FOR UPDATE
  USING (participant_a = auth.uid() OR participant_b = auth.uid())
  WITH CHECK (participant_a = auth.uid() OR participant_b = auth.uid());
