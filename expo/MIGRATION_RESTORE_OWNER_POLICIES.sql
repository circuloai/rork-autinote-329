-- ============================================================
-- Recovery: restore owner RLS policies on profiles & children.
--
-- Symptom after running MIGRATION_THERAPIST_READ_ACCESS.sql:
--   "All data wiped out" — caregivers no longer see their own
--   profile or children.
--
-- Cause:
--   That migration ran `ALTER TABLE ... ENABLE ROW LEVEL
--   SECURITY` on `profiles` and `children`. RLS was effectively
--   off (or the only policies were the therapist read-only ones
--   we just added), so owners' rows were no longer matched by
--   any policy and silently disappeared from every query. The
--   data is still in the tables — it is just hidden by RLS.
--
-- Fix:
--   Idempotently (re)create the owner policies so each user can
--   read/write their own profile and their own children rows.
--   Also keep the therapist read policies in place.
--
-- Safe to run repeatedly.
-- ============================================================

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children  ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- profiles: owner full access (matched by user_id = auth.uid())
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_delete" ON public.profiles;

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

-- ------------------------------------------------------------
-- children: owner full access
--   children.profile_id -> profiles.id, profiles.user_id = auth.uid()
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "children_owner_select" ON public.children;
DROP POLICY IF EXISTS "children_owner_insert" ON public.children;
DROP POLICY IF EXISTS "children_owner_update" ON public.children;
DROP POLICY IF EXISTS "children_owner_delete" ON public.children;

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

-- ------------------------------------------------------------
-- Re-assert therapist read policies (so this single script
-- fully restores both sides without needing the prior file).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "children_therapist_select" ON public.children;
DROP POLICY IF EXISTS "profiles_therapist_select" ON public.profiles;

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

-- ------------------------------------------------------------
-- Verification (admin SQL bypasses RLS — confirms data exists)
-- ------------------------------------------------------------
SELECT 'profiles_total' AS label, count(*) AS n FROM public.profiles
UNION ALL
SELECT 'children_total', count(*) FROM public.children
UNION ALL
SELECT 'shared_access_accepted',
       count(*) FROM public.shared_access WHERE status = 'accepted';

SELECT id, user_id, role, caregiver_email, active_child_id
  FROM public.profiles
 ORDER BY created_at DESC
 LIMIT 20;
