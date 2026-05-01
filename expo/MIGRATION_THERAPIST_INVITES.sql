-- ============================================================
-- Therapist invite acceptance — clean, idempotent fix.
-- Run this entire script in Supabase SQL Editor.
-- Safe to re-run any number of times.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Make sure RLS is enabled (no-op if already enabled).
-- ------------------------------------------------------------
ALTER TABLE shared_access ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 1) Drop any existing shared_access policies so we start clean.
-- ------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shared_access'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_access', pol.policyname);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2) Recreate policies.
-- ------------------------------------------------------------

-- Parents: full control over rows they created.
CREATE POLICY "shared_access_parent_select"
  ON shared_access FOR SELECT
  USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "shared_access_parent_insert"
  ON shared_access FOR INSERT
  WITH CHECK (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "shared_access_parent_update"
  ON shared_access FOR UPDATE
  USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "shared_access_parent_delete"
  ON shared_access FOR DELETE
  USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Therapists: can SELECT rows already linked to their profile id,
-- AND pending rows addressed to their auth email.
CREATE POLICY "shared_access_therapist_select"
  ON shared_access FOR SELECT
  USING (
    therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR LOWER(therapist_email) = LOWER(
         (SELECT email FROM auth.users WHERE id = auth.uid())
       )
  );

-- Therapists: can UPDATE rows linked to them, OR claim pending rows by email.
CREATE POLICY "shared_access_therapist_update"
  ON shared_access FOR UPDATE
  USING (
    therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR (
      status = 'pending'
      AND LOWER(therapist_email) = LOWER(
            (SELECT email FROM auth.users WHERE id = auth.uid())
          )
    )
  );

-- ------------------------------------------------------------
-- 3) Replace the strict UNIQUE(child_id, therapist_email) with a
--    partial unique index that excludes 'declined' rows. This lets
--    a parent re-invite after declining/removing a previous invite.
-- ------------------------------------------------------------
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.shared_access'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%child_id%therapist_email%'
  LOOP
    EXECUTE format('ALTER TABLE public.shared_access DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS shared_access_child_email_active_uidx;
CREATE UNIQUE INDEX shared_access_child_email_active_uidx
  ON shared_access (child_id, LOWER(therapist_email))
  WHERE status <> 'declined';

-- ------------------------------------------------------------
-- 4) accept_therapist_invites() — links every pending invite for
--    the calling therapist (matched by lowercased auth email) to
--    their profile and flips status to 'accepted'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_therapist_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $func$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_profile_id uuid;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL OR LENGTH(TRIM(v_email)) = 0 THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE shared_access
       SET therapist_id = v_profile_id,
           status = 'accepted',
           accepted_at = NOW()
     WHERE LOWER(therapist_email) = LOWER(v_email)
       AND status = 'pending'
     RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM updated;

  RETURN v_count;
END;
$func$;

REVOKE ALL ON FUNCTION public.accept_therapist_invites() FROM public;
GRANT EXECUTE ON FUNCTION public.accept_therapist_invites() TO authenticated;

-- ------------------------------------------------------------
-- 5) accept_invite_by_token(token) — manual fallback. A therapist
--    can paste an invite token to claim that specific row even if
--    their signup email differs from the one used at invite time.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invite_by_token(p_token text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $func$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL OR p_token IS NULL OR LENGTH(TRIM(p_token)) = 0 THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE shared_access
       SET therapist_id = v_profile_id,
           status = 'accepted',
           accepted_at = NOW()
     WHERE invite_token = p_token
       AND status = 'pending'
     RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM updated;

  RETURN v_count;
END;
$func$;

REVOKE ALL ON FUNCTION public.accept_invite_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_invite_by_token(text) TO authenticated;

-- ------------------------------------------------------------
-- 6) One-time backfill: link any orphaned pending rows to the
--    matching therapist profile if one already exists.
-- ------------------------------------------------------------
WITH backfilled AS (
  UPDATE shared_access sa
     SET therapist_id = p.id,
         status = 'accepted',
         accepted_at = NOW()
    FROM profiles p
    JOIN auth.users u ON u.id = p.user_id
   WHERE sa.status = 'pending'
     AND sa.therapist_id IS NULL
     AND LOWER(sa.therapist_email) = LOWER(u.email)
     AND p.role = 'therapist'
   RETURNING 1
)
SELECT COUNT(*) AS backfilled_rows FROM backfilled;

-- ------------------------------------------------------------
-- 7) Summary so you can confirm the script worked.
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM shared_access)                          AS total_invites,
  (SELECT COUNT(*) FROM shared_access WHERE status = 'pending') AS pending,
  (SELECT COUNT(*) FROM shared_access WHERE status = 'accepted') AS accepted,
  (SELECT COUNT(*) FROM shared_access WHERE status = 'declined') AS declined;
