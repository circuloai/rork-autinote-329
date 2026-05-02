-- ============================================================
-- Fix: "infinite recursion detected in policy for relation
-- \"profiles\"" (Postgres error 42P17).
--
-- Root cause:
--   The previous migration (MIGRATION_THERAPIST_READ_ACCESS.sql)
--   created a SELECT policy ON profiles whose USING clause itself
--   joins profiles ("JOIN profiles me ON me.id = sa.therapist_id").
--   Postgres re-evaluates the policy for that inner read, which
--   re-enters the same policy, ad infinitum -> 42P17.
--
--   The children policy had the same shape and would have failed
--   the moment a therapist tried to read a child.
--
-- Fix:
--   1. Create a SECURITY DEFINER helper public.current_profile_id()
--      that returns profiles.id for auth.uid() while bypassing RLS.
--   2. Drop the recursive policies and recreate them so they only
--      reference shared_access (not profiles), using the helper.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper: current user's profile.id, bypassing RLS.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

-- ------------------------------------------------------------
-- 2) Drop the recursive policies.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "children_therapist_select" ON public.children;
DROP POLICY IF EXISTS "profiles_therapist_select" ON public.profiles;

-- ------------------------------------------------------------
-- 3) Recreate without referencing profiles inside the policy.
--    Therapist can SELECT a child if an accepted shared_access
--    row links the current user's profile.id to that child.
-- ------------------------------------------------------------
CREATE POLICY "children_therapist_select"
  ON public.children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.shared_access sa
       WHERE sa.child_id     = children.id
         AND sa.status       = 'accepted'
         AND sa.therapist_id = public.current_profile_id()
    )
  );

-- ------------------------------------------------------------
-- 4) Therapist can SELECT a caregiver profile if an accepted
--    shared_access row links them to that parent profile.
--    NOTE: USING clause must NOT touch the profiles table, or
--    Postgres recurses. We only read shared_access here.
-- ------------------------------------------------------------
CREATE POLICY "profiles_therapist_select"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.shared_access sa
       WHERE sa.parent_id    = profiles.id
         AND sa.status       = 'accepted'
         AND sa.therapist_id = public.current_profile_id()
    )
  );

-- ------------------------------------------------------------
-- 5) Sanity check (run as SQL admin; bypasses RLS).
-- ------------------------------------------------------------
SELECT
  polname,
  polcmd,
  pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
WHERE polname IN ('children_therapist_select', 'profiles_therapist_select');
