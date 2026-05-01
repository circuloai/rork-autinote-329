# One clean SQL script + tightened invite/connect code

I'll give you a single SQL script to paste into Supabase that fixes every likely cause at once, and tighten the app so it surfaces real errors instead of silently failing.

**The single SQL script (replaces MIGRATION_THERAPIST_INVITES.sql)**

When you paste and run it, it will:

- Drop and recreate every shared_access policy cleanly (parents can see/insert/update/delete their own rows; therapists can see rows linked to them by id OR by email; therapists can update pending rows addressed to their email).
- Remove the strict `UNIQUE(child_id, therapist_email)` constraint that blocks re-inviting the same therapist after a reset, and replace it with a partial unique index that only applies to non-declined rows.
- Recreate the `accept_therapist_invites()` function as SECURITY DEFINER with the correct search_path and explicit grants, and make it return the count of linked rows.
- Add a second function `accept_invite_by_token(token text)` so a therapist can accept a specific invite by pasting the code, even if their signup email doesn't match.
- Run the one-time backfill that links any already-pending rows to the matching therapist profile.
- Print a small summary at the end showing how many rows were linked, so you can confirm it worked.

The script is fully idempotent — safe to run any number of times.

**App code tightening**

- When the parent taps "Send Invitation", the app will refresh the Shared Access list immediately and show a clear error toast if the insert was rejected (instead of silently showing an empty list).
- Catch and surface the real Postgres error message (e.g., RLS violation, unique constraint) instead of the generic "Failed to create invitation".
- On therapist sign-in, run the link RPC and log + toast the exact returned count or error; do NOT swallow errors.
- If the RPC returns 0 linked rows, the therapist's empty Clients screen will show a small note: "No invites matched your email (you signed in as X). Make sure the parent invited you using exactly that email."
- Remove the dependency on the parent's `useFocusEffect` to refresh — the invite screen will explicitly invalidate the query before navigating back.

**No new screens, no new buttons** — just a cleaner flow and clearer error messages, plus the one SQL script.

After approval, I'll update the SQL file and the relevant app files. You paste the SQL once, then test the invite flow.