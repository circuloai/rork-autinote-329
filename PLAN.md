# Fix therapist ↔ caregiver connection (round 2: in-app diagnostic)

## Why we're not patching again

Every previous attempt wrote more SQL/RPC fixes and assumed the read side
would pick them up. The user kept seeing "status = accepted" in Supabase
while both dashboards stayed empty. That's a join / data-shape mismatch
between write- and read-side, not a status bug. We need to **see** what
the app actually reads for these specific accounts before changing more
code.

## What I just shipped

- [x] New screen `app/settings/diagnose-connection.tsx` that, for the
      currently signed-in user, runs every relevant query directly via
      the Supabase client and prints the raw rows + a verdict:
      1. Auth user (`id`, `email`, lowered email).
      2. **All** `profiles` rows for `user_id = auth.uid()` — catches
         the silent duplicate-profile bug (`.single()` would otherwise
         pick whichever Postgres returns first).
      3. `shared_access WHERE parent_id = my profile.id`.
      4. `shared_access WHERE therapist_id = my profile.id`.
      5. `shared_access WHERE therapist_email ILIKE my auth email`.
      6. Therapist "My Clients" query
         (`therapist_id = me AND status = 'accepted'`).
      7. Parent "Connected Therapists" query
         (`parent_id = me OR therapist_id = me`).
- [x] Verdict logic that names the actual root cause:
      duplicate profile / no profile / invite by email but
      `therapist_id` never written / status still pending /
      no invite for this email at all.
- [x] Copy-report button so the output can be pasted back into chat
      verbatim — no more "query successful, status accepted, UI empty"
      ambiguity.
- [x] Entry point on therapist **My Clients** empty state and on
      caregiver **Shared Access** empty state ("Run connection
      diagnostic →"), and registered the screen in `app/_layout.tsx`.

## How to use it

1. Sign in as the **therapist** (`gauradhika+1@gmail.com`). Open
   *My Clients* → tap **Run connection diagnostic →**. Tap **Copy
   report** and paste the output.
2. Sign in as the **caregiver** (`kalegaur+2@gmail.com`). Open
   *Settings → Shared Access* → **Run diagnostic →**. Copy that
   report too.
3. Send both reports. The verdict on each will pinpoint exactly
   which of these is true:
   - duplicate profile rows for one auth user,
   - invitation row missing `therapist_id` after acceptance,
   - email casing / alias mismatch,
   - RLS hiding the row from the requesting user.

Only after we have those two reports do we change any more code.
