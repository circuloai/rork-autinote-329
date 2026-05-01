# Clean reset of profiles, fix role-flip script, restore therapist role

## What I'll do

### 1. Clean wipe (Supabase data only — auth users kept)

- Provide one SQL script that empties: shared access, log entries, therapist notes, sessions, children, and profiles.
- Auth users (your two emails) are preserved so you can sign back in.
- Script is safe to re-run and prints a row-count summary at the end.

### 2. Audit & fix the role-flipping behaviour

- Review every existing SQL file and any onboarding/sign-in code path that writes to the profile role.
- Identify the script(s) that force every profile's role to `parent` (the dummy data script does this on conflict, and any onboarding code that upserts on sign-in may also do it).
- Neutralize them: remove the `SET role = 'parent'` from any upsert, and make onboarding only set the role on first creation, never overwrite an existing role.

### 3. Make sure therapist sign-up sticks

- Ensure that when a new account chooses "Therapist" during onboarding, the profile is created with `role='therapist'` and never silently converted to `parent` later.
- Add a guard so any future migration cannot flip roles unintentionally.

### 4. Fresh test flow

After you run the wipe script:

- Sign in as your therapist email → onboard as Therapist.
- Sign in as your parent email → onboard as Parent, add a child, invite the therapist by email.
- Therapist accepts → both dashboards show the connection.

### 5. Verification

- Run the existing connection diagnostic on both accounts and confirm:
  - Parent sees the connected therapist.
  - Therapist sees the client.
- Show you the diagnostic output as proof, not just "done".

## What you'll need to do

- Paste and run the wipe SQL in Supabase once.
- Sign out of both test accounts, then sign back in and re-onboard.

