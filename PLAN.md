# Therapist insights, instant chat, home chat button, dark mode default, simpler therapist signup

## Changes

**1. Therapist sees more than just Daily Log**
- [x] Give therapists access to insights for the connected child (read-only based on shared-access permissions).
- [x] Add an Insights entry on the therapist client detail (View Insights button → `/therapist/insights/[childId]`).

**2. Faster messaging**
- [x] Optimistic send: messages appear instantly via React Query `onMutate`, reconciled on success/error.
- [x] Realtime subscription on `chat_messages` invalidates the query when new rows arrive.
- [ ] Subtle "sending…" indicator (deferred — optimistic send already feels instant).

**3. Chat button on the home screen**
- [x] Replaced the Insights tile next to Calendar with a Chat tile.
- [x] No shared access → routes to `/settings/shared-access`.
- [x] One conversation → opens it directly. Multiple → quick Alert picker.
- [x] Insights still available via the bottom Insights tab.

**4. Dark mode by default + simplified Appearance settings**
- [x] Preferences default to `theme: 'dark'` everywhere (fresh, fallback, error paths).
- [x] Saved preferences are coerced to dark on read.
- [x] Removed Theme card from Appearance; only Text Size remains.

**5. Cleaner therapist signup**
- [x] Therapist onboarding skips the Log Reminder step (1 → 4).
- [x] Step indicator and Back navigation updated to match.
- [x] Parent/teacher flows keep the reminder step.

**6. Profile build lag**
- [x] Home screen shows a "Setting up your profile…" state when authenticated and the profile row is still loading, instead of flashing Guest.
