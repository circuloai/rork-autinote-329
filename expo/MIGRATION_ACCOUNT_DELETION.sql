-- ============================================================
-- Feature: atomic account data deletion
--
-- The backend calls this function with the service-role client.
-- PostgreSQL runs the complete function call in one transaction, so
-- an error in any delete rolls back every row delete in this function.
--
-- Storage objects are removed by the backend before this RPC because
-- Supabase Storage is not part of the PostgreSQL transaction. The
-- backend only removes the auth user after this function succeeds.
--
-- Safe to re-run any number of times.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete comments before their notes and commenter profiles. This
  -- explicitly covers both comments written by the user and comments
  -- attached to notes that belong to the user's children or profile.
  DELETE FROM public.note_comments
  WHERE commenter_id IN (
    SELECT id
    FROM public.profiles
    WHERE user_id = p_user_id
  )
  OR note_id IN (
    SELECT tn.id
    FROM public.therapist_notes tn
    WHERE tn.child_id IN (
      SELECT c.id
      FROM public.children c
      INNER JOIN public.profiles p ON p.id = c.profile_id
      WHERE p.user_id = p_user_id
    )
    OR tn.therapist_id IN (
      SELECT id
      FROM public.profiles
      WHERE user_id = p_user_id
    )
    OR tn.shared_access_id IN (
      SELECT sa.id
      FROM public.shared_access sa
      WHERE sa.parent_id IN (
        SELECT id
        FROM public.profiles
        WHERE user_id = p_user_id
      )
      OR sa.therapist_id IN (
        SELECT id
        FROM public.profiles
        WHERE user_id = p_user_id
      )
      OR sa.child_id IN (
        SELECT c.id
        FROM public.children c
        INNER JOIN public.profiles p ON p.id = c.profile_id
        WHERE p.user_id = p_user_id
      )
    )
  );

  DELETE FROM public.therapist_notes
  WHERE child_id IN (
    SELECT c.id
    FROM public.children c
    INNER JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = p_user_id
  )
  OR therapist_id IN (
    SELECT id
    FROM public.profiles
    WHERE user_id = p_user_id
  )
  OR shared_access_id IN (
    SELECT sa.id
    FROM public.shared_access sa
    WHERE sa.parent_id IN (
      SELECT id
      FROM public.profiles
      WHERE user_id = p_user_id
    )
    OR sa.therapist_id IN (
      SELECT id
      FROM public.profiles
      WHERE user_id = p_user_id
    )
    OR sa.child_id IN (
      SELECT c.id
      FROM public.children c
      INNER JOIN public.profiles p ON p.id = c.profile_id
      WHERE p.user_id = p_user_id
    )
  );

  DELETE FROM public.chat_messages
  WHERE sender_id IN (
    SELECT id
    FROM public.profiles
    WHERE user_id = p_user_id
  )
  OR shared_access_id IN (
    SELECT sa.id
    FROM public.shared_access sa
    WHERE sa.parent_id IN (
      SELECT id
      FROM public.profiles
      WHERE user_id = p_user_id
    )
    OR sa.therapist_id IN (
      SELECT id
      FROM public.profiles
      WHERE user_id = p_user_id
    )
    OR sa.child_id IN (
      SELECT c.id
      FROM public.children c
      INNER JOIN public.profiles p ON p.id = c.profile_id
      WHERE p.user_id = p_user_id
    )
  );

  DELETE FROM public.log_entries
  WHERE child_id IN (
    SELECT c.id
    FROM public.children c
    INNER JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = p_user_id
  );

  DELETE FROM public.shared_access
  WHERE parent_id IN (
    SELECT id
    FROM public.profiles
    WHERE user_id = p_user_id
  )
  OR therapist_id IN (
    SELECT id
    FROM public.profiles
    WHERE user_id = p_user_id
  )
  OR child_id IN (
    SELECT c.id
    FROM public.children c
    INNER JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = p_user_id
  );

  DELETE FROM public.children
  WHERE profile_id IN (
    SELECT id
    FROM public.profiles
    WHERE user_id = p_user_id
  );

  DELETE FROM public.preferences
  WHERE user_id = p_user_id;

  DELETE FROM public.profiles
  WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_account_data(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid)
  TO service_role;