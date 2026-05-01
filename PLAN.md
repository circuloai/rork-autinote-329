# Clean slate — single Supabase setup script

## What I did

- [x] Deleted all 7 old SQL scripts so there is nothing left to confuse Supabase:
  - `WIPE_DATA.sql`, `FULL_RESET.sql`, `DUMMY_DATA.sql`,
    `MIGRATION_FIX_RLS_AUTH_USERS.sql`,
    `MIGRATION_RESTORE_OWNER_POLICIES.sql`,
    `MIGRATION_THERAPIST_INVITES.sql`,
    `MIGRATION_THERAPIST_READ_ACCESS.sql`.
- [x] Created a single authoritative script: **`expo/SUPABASE_SETUP.sql`**.
  This is now the only SQL you will ever need to run.

The new script does everything in one pass:

1. Drops every previous version of the app's tables, functions and triggers.
2. Creates the full schema with **every column the app actually inserts**
   (including `is_explore_mode`, `caregiver_phone`, `therapist_phone`,
   `active_child_id`, `quick_reminders`, `custom_reminders`, etc.)
   — this is what was causing "Failed to save profile".
3. Sets up RLS with both owner policies (so users can insert/select their
   own rows) and therapist-read policies.
4. Recreates `accept_therapist_invites()` (JWT-email based, so it works
   without `auth.users` grants).
5. Adds a guard trigger so a therapist's role can never be silently
   flipped back to parent by a future script.
6. Prints row counts and policy list at the end for verification.

Safe to re-run any time.

## What you need to do

1. Open Supabase → SQL editor → paste the contents of
   `expo/SUPABASE_SETUP.sql` → Run.
2. Confirm the verification block at the bottom returns all zeros and
   lists the policies.
3. On the device, sign out of every test account.
4. Sign in fresh:
   - Therapist email → choose **Therapist** in onboarding.
   - Parent email   → choose **Parent**, add a child, invite the
     therapist by email from Settings.
5. The therapist app auto-accepts the invite on next load. Both
   dashboards should now show the connection.
6. Run the connection diagnostic on both accounts to confirm.
