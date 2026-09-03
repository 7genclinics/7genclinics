CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_a UUID;
  p_b UUID;
  conv_id UUID;
BEGIN
  IF user_a IS NULL OR user_b IS NULL OR user_a = user_b THEN
    RAISE EXCEPTION 'invalid conversation participants';
  END IF;

  IF user_a < user_b THEN
    p_a := user_a; p_b := user_b;
  ELSE
    p_a := user_b; p_b := user_a;
  END IF;

  SELECT id INTO conv_id
  FROM public.conversations
  WHERE participant_a = p_a AND participant_b = p_b;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_a, participant_b)
    VALUES (p_a, p_b)
    RETURNING id INTO conv_id;
  ELSE
    -- Re-opening a soft-deleted chat should bring it back for both sides.
    UPDATE public.conversations
    SET
      deleted_by_a = false,
      deleted_by_b = false,
      updated_at = NOW()
    WHERE id = conv_id
      AND (deleted_by_a OR deleted_by_b);
  END IF;

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO authenticated, anon, service_role;
