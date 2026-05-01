-- ============================================================
-- Fix: Therapist sees "No clients yet" even though shared_access
-- row is accepted and therapist_id matches their profile.
--
-- Root cause confirmed by the in-app diagnostic on 2026-05-01:
--   • shared_access row IS correctly linked
--     (therapist_id = therapist's profile.id, status = 'accepted')
--   • Therapist "My Clients" query in the app does:
--       1. SELECT * FROM shared_access WHERE therapist_id = me
--       2. SELECT * FROM children WHERE id IN (childIds)
--       3. SELECT * FROM profiles WHERE id IN (parentIds)
--      then filters out access rows whose child wasn't returned in
--      step 2.
--   • RLS on `children` (and on the parent's `profiles` row) only
--     allowed the *owning* caregiver to read those rows. Therapists
--     got back [] for both children and parents, so every access
--     row was filtered out and the UI rendered "No clients".
--
-- Fix: add SELECT policies on `children` and `profiles` that allow
-- a therapist to read rows for caregivers who have an *accepted*
-- shared_access link to them. No write access is granted.
--
-- Safe to re-run any number of times.
-- ============================================================

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 1) Drop and recreate just the therapist-read policies so we
--    don't accumulate duplicates if the script is re-run.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "children_therapist_select"  ON public.children;
DROP POLICY IF EXISTS "profiles_therapist_select"  ON public.profiles;

-- ------------------------------------------------------------
-- 2) Therapists can SELECT a child if they have an ACCEPTED
--    shared_access row linking them to that child.
-- ------------------------------------------------------------
CREATE POLICY "children_therapist_select"
  ON public.children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM shared_access sa
        JOIN profiles p ON p.id = sa.therapist_id
       WHERE sa.child_id = children.id
         AND sa.status   = 'accepted'
         AND p.user_id   = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3) Therapists can SELECT a caregiver profile if they have an
--    ACCEPTED shared_access row whose parent_id = that profile.
--    (Needed so the My Clients screen can show caregiver name /
--    email next to each client.)
-- ------------------------------------------------------------
CREATE POLICY "profiles_therapist_select"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM shared_access sa
        JOIN profiles me ON me.id = sa.therapist_id
       WHERE sa.parent_id = profiles.id
         AND sa.status    = 'accepted'
         AND me.user_id   = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4) Verification (run as SQL admin; bypasses RLS).
--    For the test pair this should return exactly 1 row.
-- ------------------------------------------------------------
SELECT
  sa.id              AS shared_access_id,
  sa.status,
  c.id               AS child_id,
  c.name             AS child_name,
  pp.caregiver_email AS parent_email,
  tp.caregiver_email AS therapist_email
FROM shared_access sa
JOIN children c  ON c.id  = sa.child_id
JOIN profiles pp ON pp.id = sa.parent_id
JOIN profiles tp ON tp.id = sa.therapist_id
WHERE sa.status = 'accepted';
