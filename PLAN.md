# Fix therapist seeing accepted invite as connected client

## What's wrong

Your shared_access row already shows **status = accepted**, but the therapist's "My Clients" screen looks up rows where `therapist_id` matches their profile. The row is almost certainly missing a proper `therapist_id` link (or pointing at the wrong one), which is why the therapist still sees "no clients."

## What I just changed

- [x] **Updated `MIGRATION_THERAPIST_INVITES.sql`** — the one-time repair step (section 6) already heals every non-declined row (pending **and** accepted) whose `therapist_id` is missing or pointing at the wrong account, matching by lowercased email. It also flips role to `therapist` for any account that ends up with an accepted row.
- [x] **Added an aggressive safety net in `app/(therapist)/clients.tsx`**:
  - On mount, the screen now silently runs the repair once (no need to pull-to-refresh).
  - After calling `accept_therapist_invites`, the app **always** also does a direct email-based lookup in `shared_access` and force-updates any row addressed to the therapist's email so its `therapist_id` matches the current profile and `status = 'accepted'`.
  - When you tap "Check for invitations" and nothing was linked, you now get a clear alert telling you which email we searched for, so it's obvious if the caregiver typed the wrong address.
  - Verbose `console.log` of the rows we found, so the next time it misbehaves we can see exactly what's in the DB.

## What to do now

1. **Re-run the SQL script** (Supabase → SQL Editor → New snippet → paste the whole file → Run).
   - The bottom of the output shows a per-row table with a `link_status` column. Every row for `kalegaur+2@gmail.com → gauradhika+1@gmail.com` should say **OK**. If it says `MISMATCH`, run the script one more time. If it says `NO MATCHING THERAPIST ACCOUNT YET`, the therapist hasn't signed up with that exact email.
2. **Fully sign out** of the therapist account in the app, then **sign back in** as `gauradhika+1@gmail.com`.
   - On entering the My Clients screen, the auto-repair will fire and the child from `kalegaur+2@gmail.com` should appear.
3. If it still doesn't show, pull-to-refresh once. The alert will now tell you exactly what email it searched for — confirm that matches the auth email of the therapist account.

## Most likely remaining cause if it still fails

The therapist's auth email and the email used in the invite differ by more than just case (e.g. a typo, an extra dot, a `+` alias not matching). The new alert spells out the email being checked so this is immediately visible.
