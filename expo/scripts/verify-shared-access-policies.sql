-- ============================================================
-- verify-shared-access-policies.sql
--
-- Run this in the Supabase SQL Editor (as the project owner /
-- postgres role, which bypasses RLS) after applying all
-- migrations to confirm the shared_access RLS posture is safe.
--
-- EXPECTED RESULT: zero rows.
--
-- Any returned row means an UPDATE policy on shared_access has
-- a USING (row-visibility) expression but no WITH CHECK
-- (row-write) constraint. Without WITH CHECK, a user who can
-- see a row can UPDATE any column on it — including permission
-- flags like can_export, can_add_notes, readonly_mode, and
-- status — even if the intent was only to allow accepting an
-- invitation.
--
-- If rows are returned:
--   1. Identify which policy name is shown.
--   2. Check whether MIGRATION_FIX_ACCESS_CONTROLS.sql has been
--      applied (it drops the open therapist UPDATE policy).
--   3. If another migration re-added an open UPDATE policy,
--      either add a WITH CHECK clause or drop the policy and
--      route the operation through a SECURITY DEFINER function.
-- ============================================================

SELECT
  pol.polname                                        AS policy_name,
  pg_get_expr(pol.polqual,      pol.polrelid)        AS using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid)        AS with_check_expr,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END                                                AS command
FROM pg_policy pol
JOIN pg_class   cls ON cls.oid = pol.polrelid
JOIN pg_namespace ns ON ns.oid = cls.relnamespace
WHERE ns.nspname   = 'public'
  AND cls.relname  = 'shared_access'
  AND pol.polcmd   = 'w'          -- UPDATE policies only
  AND pol.polqual IS NOT NULL     -- has a USING clause
  AND pol.polwithcheck IS NULL    -- but NO WITH CHECK clause
ORDER BY pol.polname;

-- Zero rows = safe.
-- Non-zero rows = a policy listed above grants UPDATE access
-- without a write-time constraint; investigate immediately.
