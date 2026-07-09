# Migration Run Order

Run all migration scripts in the Supabase SQL Editor **in the order listed below**.
Each file is idempotent (safe to re-run), but some later migrations DROP and
recreate policies defined by earlier ones, so out-of-order execution will leave
the database in an insecure intermediate state.

## Required order

| # | File | Notes |
|---|------|-------|
| 1 | `DATABASE_SCHEMA.md` → SQL block | Initial schema: tables, indexes, base RLS policies |
| 2 | `MIGRATION_THERAPIST_INVITES.sql` | Adds therapist invite RLS policies + `accept_therapist_invites()` / `accept_invite_by_token()` functions. Introduces a therapist UPDATE policy that is intentionally dropped by step 4. |
| 3 | `MIGRATION_FIX_RLS_AUTH_USERS.sql` | Rewrites shared_access policies to use `auth.jwt() ->> 'email'` instead of `auth.users`, fixing "permission denied for table users" runtime errors. Must run after step 2 (it drops and recreates the same policies). |
| 4 | `MIGRATION_FIX_PROFILES_RECURSION.sql` | Adds `current_profile_id()` helper and fixes infinite-recursion in profiles/children policies. Required before step 5. |
| 5 | `MIGRATION_FIX_ACCESS_CONTROLS.sql` | **Must run last among steps 2–5.** Drops the open `shared_access_therapist_update` policy (no WITH CHECK) introduced in steps 2–3, enforces `can_view_profile` guard on children/profiles SELECT, and adds server-side write restrictions for therapist_notes and chat_messages. Running this out of order (before steps 2–3) has no effect because those steps recreate the dropped policy. |
| 6 | `MIGRATION_AVATAR_UPLOAD.sql` | Standalone — adds avatar storage bucket and policies. No ordering constraint relative to steps 2–5. |
| 7 | `MIGRATION_THERAPIST_READ_ACCESS.sql` | Standalone — extends log_entries/children policies for therapist read access. No ordering constraint relative to steps 2–5. |
| 8 | `MIGRATION_PASSWORD_RESET.sql` | Standalone — creates `password_reset_codes` table and SECURITY DEFINER reset functions. No ordering constraint relative to steps 2–7. |
| 9 | `MIGRATION_RATE_LIMIT_RESET_CODES.sql` | **Must run after step 8.** Adds `attempt_count`/`locked_until` columns to `password_reset_codes` and recreates the reset functions with brute-force protection (5-attempt lockout + 60-second request cooldown). |

## Why ordering matters for steps 2–5

`MIGRATION_THERAPIST_INVITES.sql` (step 2) and `MIGRATION_FIX_RLS_AUTH_USERS.sql`
(step 3) both create a `shared_access_therapist_update` UPDATE policy with only
a USING clause and **no WITH CHECK**. This is a privilege-escalation vulnerability
because it lets a therapist overwrite any column on their own row.

`MIGRATION_FIX_ACCESS_CONTROLS.sql` (step 5) drops that policy entirely. Invite
acceptance is handled exclusively by the `SECURITY DEFINER` functions
`accept_therapist_invites()` and `accept_invite_by_token()`, which only write
`therapist_id`, `status`, and `accepted_at`.

**If step 5 is run before steps 2–3, those steps will recreate the vulnerable
policy** and the fix will not be in effect. Always run step 5 last.

## Verification after applying all migrations

Run `scripts/verify-shared-access-policies.sql` in the SQL Editor. It should
return **zero rows**. Any returned row means an UPDATE policy on `shared_access`
is missing a WITH CHECK clause and must be investigated.
