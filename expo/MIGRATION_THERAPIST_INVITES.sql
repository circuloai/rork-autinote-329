-- ============================================================
-- Therapist invite acceptance fix
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1) Allow therapists to SEE pending invites addressed to their email
--    (so the caregiver-created row is visible before therapist_id is set).
DROP POLICY IF EXISTS "Therapists can view invites by email" ON shared_access;
CREATE POLICY "Therapists can view invites by email"
  ON shared_access FOR SELECT
  USING (
    LOWER(therapist_email) = LOWER(
      (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 2) SECURITY DEFINER RPC that links every pending invite for the calling
--    therapist user (matches by email) to their profile and flips status.
--    This bypasses RLS safely because we scope strictly to auth.uid()'s email.
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

GRANT EXECUTE ON FUNCTION public.accept_therapist_invites() TO authenticated;

-- 3) One-time backfill for invites already created before this migration.
--    Safe to re-run; only flips matched pending rows.
UPDATE shared_access sa
   SET therapist_id = p.id,
       status = 'accepted',
       accepted_at = NOW()
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
 WHERE sa.status = 'pending'
   AND sa.therapist_id IS NULL
   AND LOWER(sa.therapist_email) = LOWER(u.email)
   AND p.role = 'therapist';
