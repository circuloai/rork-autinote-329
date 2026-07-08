-- ============================================================
-- Fix: Therapist Access Control Hardening
--
-- Addresses three broken access control issues:
--
-- 1. [High] Therapists could overwrite caregiver-controlled
--    shared_access permissions. The therapist UPDATE policy had
--    no WITH CHECK restriction, allowing a therapist to set any
--    column (status, can_view_logs, can_view_profile, etc.) on
--    their own row. Fix: drop the policy entirely. Invite
--    acceptance is now only possible through the SECURITY
--    DEFINER functions accept_therapist_invites() and
--    accept_invite_by_token(), which only set therapist_id,
--    status, and accepted_at.
--
-- 2. [Medium] Therapists could read child profile data
--    (diagnosis, triggers, age) and caregiver contact info even
--    when the caregiver disabled "View child profile."
--    MIGRATION_FIX_PROFILES_RECURSION.sql recreated the
--    children and profiles therapist SELECT policies without the
--    can_view_profile check. Fix: restore that guard.
--
-- 3. [High] Therapist write restrictions (readonly_mode,
--    can_add_notes) were only enforced in the UI. The database
--    allowed any authenticated therapist with a therapist_id
--    match to insert therapist_notes or chat_messages. Fix: add
--    server-side WITH CHECK constraints that verify the
--    permission flags in shared_access before allowing writes.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- ============================================================
-- Vulnerability 1: Drop the open therapist UPDATE policy on
-- shared_access. The SECURITY DEFINER accept_therapist_invites()
-- function is the only path that should ever modify these rows
-- on behalf of a therapist.
-- ============================================================
DROP POLICY IF EXISTS "shared_access_therapist_update" ON public.shared_access;

-- ============================================================
-- Vulnerability 2: Recreate the children and profiles therapist
-- SELECT policies with the can_view_profile guard.
--
-- Uses public.current_profile_id() (created by
-- MIGRATION_FIX_PROFILES_RECURSION.sql) to avoid the infinite-
-- recursion that plagued the earlier migrations.
-- ============================================================
DROP POLICY IF EXISTS "children_therapist_select" ON public.children;
DROP POLICY IF EXISTS "profiles_therapist_select" ON public.profiles;

CREATE POLICY "children_therapist_select"
  ON public.children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.shared_access sa
       WHERE sa.child_id         = children.id
         AND sa.status           = 'accepted'
         AND sa.therapist_id     = public.current_profile_id()
         AND sa.can_view_profile = true
    )
  );

CREATE POLICY "profiles_therapist_select"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.shared_access sa
       WHERE sa.parent_id        = profiles.id
         AND sa.status           = 'accepted'
         AND sa.therapist_id     = public.current_profile_id()
         AND sa.can_view_profile = true
    )
  );

-- ============================================================
-- Vulnerability 3a: Enforce therapist write restrictions for
-- therapist_notes at the database level.
--
-- Replaces the blanket "Therapists can manage their notes"
-- ALL policy with per-command policies so that INSERT and UPDATE
-- can carry a WITH CHECK that validates can_add_notes and
-- readonly_mode in the linked shared_access row.
-- ============================================================
DROP POLICY IF EXISTS "Therapists can manage their notes"     ON public.therapist_notes;
DROP POLICY IF EXISTS "therapist_notes_therapist_select"      ON public.therapist_notes;
DROP POLICY IF EXISTS "therapist_notes_therapist_write"       ON public.therapist_notes;
DROP POLICY IF EXISTS "therapist_notes_therapist_update"      ON public.therapist_notes;
DROP POLICY IF EXISTS "therapist_notes_therapist_delete"      ON public.therapist_notes;

-- Therapists can always read their own notes.
CREATE POLICY "therapist_notes_therapist_select"
  ON public.therapist_notes FOR SELECT
  USING (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Therapists can insert notes only when the linked shared_access
-- row grants write permission at the time of the INSERT.
CREATE POLICY "therapist_notes_therapist_write"
  ON public.therapist_notes FOR INSERT
  WITH CHECK (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
        FROM public.shared_access sa
       WHERE sa.id            = therapist_notes.shared_access_id
         AND sa.therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         AND sa.status        = 'accepted'
         AND sa.can_add_notes = true
         AND sa.readonly_mode = false
    )
  );

-- Therapists can update their own notes only while write access
-- is still granted (prevents edits after revocation too).
CREATE POLICY "therapist_notes_therapist_update"
  ON public.therapist_notes FOR UPDATE
  USING (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1
        FROM public.shared_access sa
       WHERE sa.id            = therapist_notes.shared_access_id
         AND sa.therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         AND sa.status        = 'accepted'
         AND sa.can_add_notes = true
         AND sa.readonly_mode = false
    )
  );

-- Therapists can delete their own notes regardless of current
-- permission state (allows cleanup after revocation).
CREATE POLICY "therapist_notes_therapist_delete"
  ON public.therapist_notes FOR DELETE
  USING (
    therapist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- Vulnerability 3b: Enforce readonly_mode for chat_messages.
--
-- Replaces the open INSERT policy with one that distinguishes
-- caregiver senders (always allowed in their conversations) from
-- therapist senders (blocked when readonly_mode = true).
-- ============================================================
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.chat_messages;

CREATE POLICY "Users can send messages in their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      -- Caregiver (parent) side: allowed whenever the conversation is accepted.
      EXISTS (
        SELECT 1
          FROM public.shared_access sa
         WHERE sa.id        = chat_messages.shared_access_id
           AND sa.parent_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
           AND sa.status    = 'accepted'
      )
      OR
      -- Therapist side: blocked when the caregiver set readonly_mode.
      EXISTS (
        SELECT 1
          FROM public.shared_access sa
         WHERE sa.id             = chat_messages.shared_access_id
           AND sa.therapist_id  IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
           AND sa.status        = 'accepted'
           AND sa.readonly_mode = false
      )
    )
  );

-- ============================================================
-- Verification (run as SQL admin; bypasses RLS).
-- ============================================================
SELECT
  polname,
  polcmd,
  pg_get_expr(polqual,    polrelid) AS using_expr,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
WHERE polrelid IN (
  'public.shared_access'::regclass,
  'public.children'::regclass,
  'public.profiles'::regclass,
  'public.therapist_notes'::regclass,
  'public.chat_messages'::regclass
)
ORDER BY polrelid::text, polname;
