-- ============================================================
-- FULL RESET — single script that fixes:
--   • "Failed to save profile" on new sign-up
--   • Older login can't pull child profile
--   • Therapist role being silently flipped to parent
--
-- Root cause of both errors:
--   Earlier migrations turned on RLS on profiles / children /
--   preferences but only added the *therapist read* policies.
--   The owner (insert/update/select) policies were dropped, so
--   every signed-in user got their inserts and selects silently
--   blocked by RLS — onboarding shows "Failed to save profile"
--   and existing users see no child.
--
-- This script:
--   1) Wipes app data (KEEPS auth.users so you can sign back in)
--   2) Restores owner RLS policies on every owned table
--   3) Restores the therapist read-only policies
--   4) Restores the shared_access policies (JWT-email based)
--   5) Adds a guard trigger so the therapist role can never be
--      silently flipped to parent by a future script
--
-- Safe to re-run.
-- ============================================================


-- ============================================================
-- 1. WIPE APP DATA (auth.users preserved)
-- ============================================================
DO $wipe$
DECLARE
  v_chat_messages   INT := 0;
  v_note_comments   INT := 0;
  v_therapist_notes INT := 0;
  v_log_entries     INT := 0;
  v_shared_access   INT := 0;
  v_children        INT := 0;
  v_preferences     INT := 0;
  v_profiles        INT := 0;
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.chat_messages';
    GET DIAGNOSTICS v_chat_messages = ROW_COUNT;
  END IF;

  IF to_regclass('public.note_comments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.note_comments';
    GET DIAGNOSTICS v_note_comments = ROW_COUNT;
  END IF;

  IF to_regclass('public.therapist_notes') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.therapist_notes';
    GET DIAGNOSTICS v_therapist_notes = ROW_COUNT;
  END IF;

  IF to_regclass('public.log_entries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.log_entries';
    GET DIAGNOSTICS v_log_entries = ROW_COUNT;
  END IF;

  IF to_regclass('public.shared_access') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.shared_access';
    GET DIAGNOSTICS v_shared_access = ROW_COUNT;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'UPDATE public.profiles SET active_child_id = NULL';
  END IF;

  IF to_regclass('public.children') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.children';
    GET DIAGNOSTICS v_children = ROW_COUNT;
  END IF;

  IF to_regclass('public.preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.preferences';
    GET DIAGNOSTICS v_preferences = ROW_COUNT;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.profiles';
    GET DIAGNOSTICS v_profiles = ROW_COUNT;
  END IF;

  RAISE NOTICE '--- WIPE SUMMARY ---';
  RAISE NOTICE 'chat_messages   deleted: %', v_chat_messages;
  RAISE NOTICE 'note_comments   deleted: %', v_note_comments;
  RAISE NOTICE 'therapist_notes deleted: %', v_therapist_notes;
  RAISE NOTICE 'log_entries     deleted: %', v_log_entries;
  RAISE NOTICE 'shared_access   deleted: %', v_shared_access;
  RAISE NOTICE 'children        deleted: %', v_children;
  RAISE NOTICE 'preferences     deleted: %', v_preferences;
  RAISE NOTICE 'profiles        deleted: %', v_profiles;
END $wipe$;


-- ============================================================
-- 2. ENABLE RLS on every owned table
-- ============================================================
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;

DO $opt$
BEGIN
  IF to_regclass('public.therapist_notes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.therapist_notes ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.note_comments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY';
  END IF;
END $opt$;


-- ============================================================
-- 3. profiles — owner full access + therapist read
-- ============================================================
DROP POLICY IF EXISTS "profiles_owner_select"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_insert"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_delete"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_therapist_select" ON public.profiles;

CREATE POLICY "profiles_owner_select"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "profiles_owner_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_owner_delete"
  ON public.profiles FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "profiles_therapist_select"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.shared_access sa
        JOIN public.profiles me ON me.id = sa.therapist_id
       WHERE sa.parent_id = profiles.id
         AND sa.status    = 'accepted'
         AND me.user_id   = auth.uid()
    )
  );


-- ============================================================
-- 4. children — owner full access + therapist read
-- ============================================================
DROP POLICY IF EXISTS "children_owner_select"     ON public.children;
DROP POLICY IF EXISTS "children_owner_insert"     ON public.children;
DROP POLICY IF EXISTS "children_owner_update"     ON public.children;
DROP POLICY IF EXISTS "children_owner_delete"     ON public.children;
DROP POLICY IF EXISTS "children_therapist_select" ON public.children;

CREATE POLICY "children_owner_select"
  ON public.children FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = children.profile_id
         AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "children_owner_insert"
  ON public.children FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = children.profile_id
         AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "children_owner_update"
  ON public.children FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = children.profile_id
         AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = children.profile_id
         AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "children_owner_delete"
  ON public.children FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = children.profile_id
         AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "children_therapist_select"
  ON public.children FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.shared_access sa
        JOIN public.profiles p ON p.id = sa.therapist_id
       WHERE sa.child_id = children.id
         AND sa.status   = 'accepted'
         AND p.user_id   = auth.uid()
    )
  );


-- ============================================================
-- 5. preferences — owner full access (keyed by user_id)
-- ============================================================
DROP POLICY IF EXISTS "preferences_owner_select" ON public.preferences;
DROP POLICY IF EXISTS "preferences_owner_insert" ON public.preferences;
DROP POLICY IF EXISTS "preferences_owner_update" ON public.preferences;
DROP POLICY IF EXISTS "preferences_owner_delete" ON public.preferences;

CREATE POLICY "preferences_owner_select"
  ON public.preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "preferences_owner_insert"
  ON public.preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "preferences_owner_update"
  ON public.preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "preferences_owner_delete"
  ON public.preferences FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================
-- 6. log_entries — owner full access (via children → profile)
--    + therapist read for accepted shares
-- ============================================================
DROP POLICY IF EXISTS "log_entries_owner_select"     ON public.log_entries;
DROP POLICY IF EXISTS "log_entries_owner_insert"     ON public.log_entries;
DROP POLICY IF EXISTS "log_entries_owner_update"     ON public.log_entries;
DROP POLICY IF EXISTS "log_entries_owner_delete"     ON public.log_entries;
DROP POLICY IF EXISTS "log_entries_therapist_select" ON public.log_entries;

CREATE POLICY "log_entries_owner_select"
  ON public.log_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.profiles p ON p.id = c.profile_id
      WHERE c.id = log_entries.child_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "log_entries_owner_insert"
  ON public.log_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.profiles p ON p.id = c.profile_id
      WHERE c.id = log_entries.child_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "log_entries_owner_update"
  ON public.log_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.profiles p ON p.id = c.profile_id
      WHERE c.id = log_entries.child_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "log_entries_owner_delete"
  ON public.log_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.profiles p ON p.id = c.profile_id
      WHERE c.id = log_entries.child_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "log_entries_therapist_select"
  ON public.log_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.shared_access sa
        JOIN public.profiles me ON me.id = sa.therapist_id
       WHERE sa.child_id = log_entries.child_id
         AND sa.status   = 'accepted'
         AND me.user_id  = auth.uid()
         AND sa.can_view_logs = true
    )
  );


-- ============================================================
-- 7. shared_access — parent owns, therapist claims by JWT email
-- ============================================================
DO $sa$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'shared_access'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_access', pol.policyname);
  END LOOP;
END $sa$;

CREATE POLICY "shared_access_parent_select"
  ON public.shared_access FOR SELECT
  USING (parent_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "shared_access_parent_insert"
  ON public.shared_access FOR INSERT
  WITH CHECK (parent_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "shared_access_parent_update"
  ON public.shared_access FOR UPDATE
  USING (parent_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "shared_access_parent_delete"
  ON public.shared_access FOR DELETE
  USING (parent_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "shared_access_therapist_select"
  ON public.shared_access FOR SELECT
  USING (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR LOWER(therapist_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "shared_access_therapist_update"
  ON public.shared_access FOR UPDATE
  USING (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR (
      status = 'pending'
      AND LOWER(therapist_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );


-- ============================================================
-- 8. therapist_notes / note_comments / chat_messages
--    Permissive owner+therapist policies if tables exist.
-- ============================================================
DO $opt2$
BEGIN
  IF to_regclass('public.therapist_notes') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "therapist_notes_all" ON public.therapist_notes';
    EXECUTE $p$
      CREATE POLICY "therapist_notes_all"
        ON public.therapist_notes FOR ALL
        USING (
          therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.children c
            JOIN public.profiles p ON p.id = c.profile_id
            WHERE c.id = therapist_notes.child_id AND p.user_id = auth.uid()
          )
        )
        WITH CHECK (
          therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    $p$;
  END IF;

  IF to_regclass('public.note_comments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "note_comments_all" ON public.note_comments';
    EXECUTE $p$
      CREATE POLICY "note_comments_all"
        ON public.note_comments FOR ALL
        USING (
          commenter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.therapist_notes tn
            JOIN public.children c  ON c.id  = tn.child_id
            JOIN public.profiles p  ON p.id  = c.profile_id
            WHERE tn.id = note_comments.note_id AND p.user_id = auth.uid()
          )
        )
        WITH CHECK (
          commenter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    $p$;
  END IF;

  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "chat_messages_all" ON public.chat_messages';
    EXECUTE $p$
      CREATE POLICY "chat_messages_all"
        ON public.chat_messages FOR ALL
        USING (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            OR receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
        WITH CHECK (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    $p$;
  END IF;
END $opt2$;


-- ============================================================
-- 9. accept_therapist_invites() — JWT-email based, so it never
--    trips on missing grants on auth.users.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_therapist_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_profile_id uuid;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  v_email := NULLIF(TRIM(LOWER(COALESCE(auth.jwt() ->> 'email', ''))), '');
  IF v_email IS NULL THEN RETURN 0; END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN RETURN 0; END IF;

  WITH updated AS (
    UPDATE public.shared_access
       SET therapist_id = v_profile_id,
           status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END,
           accepted_at = COALESCE(accepted_at, NOW())
     WHERE LOWER(therapist_email) = v_email
       AND status <> 'declined'
       AND therapist_id IS DISTINCT FROM v_profile_id
     RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM updated;
  RETURN v_count;
END;
$func$;

REVOKE ALL ON FUNCTION public.accept_therapist_invites() FROM public;
GRANT EXECUTE ON FUNCTION public.accept_therapist_invites() TO authenticated;


-- ============================================================
-- 10. Guard: prevent the therapist role from being silently
-- flipped back to parent by any future update.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_therapist_role_flip()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'therapist'
     AND NEW.role IS NOT NULL
     AND NEW.role <> 'therapist' THEN
    RAISE EXCEPTION
      'Refusing to change profile % role from therapist to %. '
      'If this is intentional, set role = NULL first, then update.',
      OLD.id, NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_therapist_role_flip ON public.profiles;
CREATE TRIGGER trg_prevent_therapist_role_flip
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_therapist_role_flip();


-- ============================================================
-- 11. Verification — admin SQL bypasses RLS, so these counts
--     reflect what is *actually* in the tables.
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM public.profiles)      AS profiles,
  (SELECT COUNT(*) FROM public.children)      AS children,
  (SELECT COUNT(*) FROM public.preferences)   AS preferences,
  (SELECT COUNT(*) FROM public.shared_access) AS shared_access,
  (SELECT COUNT(*) FROM public.log_entries)   AS log_entries;

SELECT schemaname, tablename, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('profiles','children','preferences','log_entries','shared_access')
 ORDER BY tablename, policyname;
