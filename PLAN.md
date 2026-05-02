# Fix "infinite recursion detected in policy for relation profiles" (42P17)

## Root cause

The previous migration `MIGRATION_THERAPIST_READ_ACCESS.sql` created a
SELECT policy **on `profiles`** whose `USING` clause itself joins
`profiles` (`JOIN profiles me ON me.id = sa.therapist_id`). Postgres
re-evaluates the same policy when reading that inner `profiles` row,
which re-enters the policy → infinite recursion → 42P17.

Symptom: every read of `profiles` after sign-up fails, so the app falls
back to "Guest" and the onboarding upsert errors with
`infinite recursion detected in policy for relation "profiles"`.

The `children_therapist_select` policy had the same shape and would
have failed for any therapist child read.

## Fix shipped

- [x] `expo/MIGRATION_FIX_PROFILES_RECURSION.sql`:
      1. Creates `public.current_profile_id()` — a SECURITY DEFINER SQL
         function that returns the caller's `profiles.id` while
         bypassing RLS. Granted only to `authenticated`.
      2. Drops the recursive `profiles_therapist_select` and
         `children_therapist_select` policies.
      3. Recreates them so the `USING` clause references **only
         `shared_access`**, comparing `sa.therapist_id` against
         `current_profile_id()`. No self-reference to `profiles`, so no
         recursion.
      4. Ends with a `pg_policy` SELECT so you can visually confirm the
         new `using_expr` after running.

Idempotent — safe to re-run.

## How to apply

1. Supabase → SQL editor → paste
   `expo/MIGRATION_FIX_PROFILES_RECURSION.sql` → **Run**.
2. In the app, sign out and back in. Onboarding upsert should succeed
   and the dashboard should show the real profile (not Guest).
3. Therapist *My Clients* and caregiver *Connected Therapists* will
   keep working because the rewritten policies grant the same access,
   just without the self-join.
