# Fix therapist seeing accepted invite as connected client

## What's wrong

Your shared_access row already shows **status = accepted**, but the therapist's "My Clients" screen looks up rows where `therapist_id` matches their profile. The row is almost certainly missing a proper `therapist_id` link (or pointing at the wrong one), which is why the therapist still sees "no clients."

The fix script you have only backfills *pending* rows, so it won't repair an already-accepted row that's missing the link.

## The plan

**1. Update the database fix script**

I'll update `MIGRATION_THERAPIST_INVITES.sql` so that the one-time repair step also fixes already-accepted rows whose therapist link is missing or pointing at the wrong account. It will:
- Match every shared_access row to the correct therapist by email (case-insensitive)
- Set the right therapist_id on those rows
- Leave correctly-linked rows untouched
- Print a clear summary of what got fixed

**2. You run the updated script in Supabase**
- Open Supabase → SQL Editor → New snippet
- Paste the entire updated file
- Click Run
- You should see a summary showing how many rows were repaired

**3. Verify on the therapist account**
- Log out and back in as gauradhika+1@gmail.com
- The connected child profile from kalegaur+2@gmail.com should now appear in "My Clients"
- If not, pull-to-refresh on that screen will re-trigger the link

**4. Add a small safety net in the app**
- When a therapist opens "My Clients" and sees zero clients, the app will also try a one-time "self-repair" in addition to the existing pending-invite acceptance, so future mismatches heal automatically without needing SQL.

## What you'll see after this

- Therapist (gauradhika+1@gmail.com) opens the app → sees the child from kalegaur+2@gmail.com listed as a client
- Tapping the child opens their logs, notes, and chat
- Future invites will link automatically the moment the therapist signs in