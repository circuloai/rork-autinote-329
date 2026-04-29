# Therapist Experience

A minimal, secure therapist-side experience that mirrors what they need without polluting the caregiver flow.

## Routing
- [x] On app load (and after login), if `profile.role === 'therapist'`, route to `/(therapist)/clients` instead of `/(tabs)/home`.
- [x] Add a separate `(therapist)` tab group so caregiver tabs are not shown to therapists.
- [x] Register `(therapist)` group + nested screens in root `app/_layout.tsx`.

## Data
- [x] Add `therapistClients` query to `AppContext` — for therapists, fetches `shared_access` rows where `therapist_id = profile.id AND status = 'accepted'`, joined with the corresponding `children` and parent `profiles` rows. Relies on existing RLS policies (already permit therapists to read shared children, logs, notes).
- [x] Reuse existing `logsQuery`, `therapistNotesQuery`, `chatMessagesQuery` for therapist views — they already use `IN (childIds)` and shared_access RLS lets the therapist see only what's been shared.
- [x] For therapists, `childIds` is derived from `therapistClients` (not `profile.children`).

## Screens
- [x] **Tabs `(therapist)`** — Clients · Messages · Settings (no built-in header, each tab owns its UI).
- [x] **Clients tab** (`(therapist)/clients.tsx`) — list of accepted shared children with avatar, name, age, parent name, last log date, unread message badge. Tap → client detail.
- [x] **Messages tab** (`(therapist)/messages.tsx`) — list of conversations across all clients. Tap → existing `/therapist-chat?sharedAccessId=...`.
- [x] **Settings tab** (`(therapist)/settings.tsx`) — profile, customization, log out (lightweight version).
- [x] **Client detail** (`/therapist/client/[childId].tsx`) — child profile summary (read-only), recent logs timeline, list of session notes, "Add session note" CTA, "Message caregiver" CTA.
- [x] **Note composer** (`/therapist/note/[childId].tsx`) — modal form with session date, goals worked on, skills practiced, behaviors observed, strategies used, recommendations, next session goals. Save creates a `therapist_notes` row.

## Security
- [x] All reads/writes go through existing RLS policies — no new policies required.
- [x] Therapist UI never queries other therapists' or non-shared children.
- [x] Notes are scoped to a specific `shared_access_id`.
