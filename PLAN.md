# Fix therapist ↔ caregiver connection (round 3: RLS on children/profiles)

## What the diagnostic proved

Therapist (`gauradhika+1@gmail.com`) ran the in-app diagnostic on
2026-05-01. Output:

- Profile row exists, role = `therapist`,
  `profile.id = 536791d5-8776-4b1c-8fb3-08f2191b8f11`.
- `shared_access` row exists with
  `therapist_id = 536791d5-…`, `status = 'accepted'`,
  `child_id = cdef3152-…`.
- The exact "My Clients" query
  (`therapist_id = me AND status = 'accepted'`) returns **1 row**.

So the database and `shared_access` RLS are correct. The bug is on the
read side, one layer deeper.

## Root cause

`AppContext.therapistClientsQuery` does three queries:

1. `shared_access WHERE therapist_id = me AND status = 'accepted'`
   ✅ returns the row.
2. `children WHERE id IN (childIds)`
   ❌ returns `[]` — RLS on `children` only allows the *owning*
   caregiver to read. Therapist gets nothing back.
3. `profiles WHERE id IN (parentIds)`
   ❌ returns `[]` for the same reason.

Then it filters: `accessRows.filter(sa => childrenById.has(sa.child_id))`.
With an empty `childrenById` map, every row is filtered out → UI shows
"No clients yet". Same shape on the caregiver side once profile reads
become asymmetric.

## What I just shipped

- [x] `expo/MIGRATION_THERAPIST_READ_ACCESS.sql` — adds two SELECT-only
      RLS policies:
      - `children_therapist_select`: a therapist can read a child if
        an `accepted` `shared_access` row links them to that child.
      - `profiles_therapist_select`: a therapist can read a caregiver
        profile if an `accepted` `shared_access` row links them to
        that parent (so the caregiver name/email render on My Clients).
      No write access is granted. Script is idempotent.
- [x] Includes a verification SELECT at the bottom that joins
      `shared_access` → `children` → both `profiles` rows; for the
      test pair it should return one row with both emails populated.

## How to apply

1. Open Supabase → SQL editor → paste the contents of
   `expo/MIGRATION_THERAPIST_READ_ACCESS.sql` → **Run**.
2. In the app, sign out of the therapist account and back in (or
   pull-to-refresh on *My Clients*). The connected child should now
   appear.
3. If you want to confirm at the data layer first, re-run the in-app
   diagnostic on the therapist account — section 6 already returned
   the row; after the migration the My Clients UI will too.
