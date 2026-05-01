-- ============================================================
-- Fix: "permission denied for table users" on shared_access.
--
-- The previous RLS policies referenced auth.users via a subquery
-- (SELECT email FROM auth.users WHERE id = auth.uid()). The
-- "authenticated" role does not have SELECT on auth.users, so
-- Postgres throws "permission denied for table users" while
-- evaluating the policy. Because permissive policies are OR'd,
-- that error fails the *entire* shared_access query for both
-- caregivers and therapists -- which is why the diagnostic in
-- the app reported permission errors on every shared_access
-- section while the SQL editor (which bypasses RLS) showed the
-- rows as accepted.
--
-- Fix: read the email from the JWT instead -- auth.jwt() ->>
-- 'email'. It needs no table grants and matches the same value
-- for the signed-in user. Same change is applied inside the
-- accept_therapist_invites() function so it keeps working when
-- called from the app (it is SECURITY DEFINER so it could keep
-- reading auth.users, but using the JWT keeps the two code paths
-- in sync).
--
-- Safe to re-run any number of times.
-- ============================================================

ALTER TABLE shared_access ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 1) Drop existing shared_access policies so we start clean.
-- ------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'shared_access'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_access', pol.policyname);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2) Recreate policies WITHOUT touching auth.users.
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

-- Therapists: SELECT rows already linked to their profile id,
-- OR pending rows addressed to their JWT email.
CREATE POLICY "shared_access_therapist_select"
  ON shared_access FOR SELECT
  USING (
    therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR LOWER(therapist_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );

-- Therapists: UPDATE rows linked to them, OR claim pending rows by JWT email.
CREATE POLICY "shared_access_therapist_update"
  ON shared_access FOR UPDATE
  USING (
    therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR (
      status = 'pending'
      AND LOWER(therapist_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

-- ------------------------------------------------------------
-- 3) Rewrite accept_therapist_invites() to use the JWT email
--    instead of reading auth.users. Keeps the function and the
--    RLS policies in lock-step on the same source of truth.
-- ------------------------------------------------------------
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
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  v_email := NULLIF(TRIM(LOWER(COALESCE(auth.jwt() ->> 'email', ''))), '');
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE shared_access
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

-- ------------------------------------------------------------
-- 4) Quick verification block. Run as the SQL admin (bypasses
--    RLS) -- if these counts are non-zero but the in-app
--    diagnostic still shows "permission denied for table users",
--    the policies above were not applied; re-run this script.
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM shared_access)                          AS total_invites,
  (SELECT COUNT(*) FROM shared_access WHERE status = 'pending') AS pending,
  (SELECT COUNT(*) FROM shared_access WHERE status = 'accepted') AS accepted,
  (SELECT COUNT(*) FROM shared_access WHERE status = 'declined') AS declined;
