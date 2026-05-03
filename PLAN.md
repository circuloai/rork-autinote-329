# Therapist insights, instant chat, home chat button, dark-mode default, simpler appearance settings

## What will change

### 1. Therapist sees Insights
- Therapists will get the same Insights tab parents see, scoped to whichever client they currently have selected.
- Switching active client updates the charts and stats automatically.

### 2. Instant messaging
- Messages send and appear immediately in the conversation, even before the server confirms (optimistic send).
- New incoming messages arrive in real time without needing to refresh — both sides see them within a second.
- A subtle "sending…" indicator shows on a message until it's confirmed; failed sends show a retry tap.

### 3. Chat button on Home
- The Insights button next to Calendar on the Home screen will be replaced with a Chat button.
- Tapping Chat:
  - If the child has a connected therapist/teacher → opens chat directly with the primary connected therapist.
  - If no one is connected yet → takes the user to the Shared Access page in Settings, with a friendly prompt to invite a therapist.

### 4. Dark mode by default
- Every new and existing profile defaults to dark mode.
- The light/dark toggle is removed from the visible Appearance settings.
- A hidden developer override remains (long-press on the Appearance title) for testing — not shown to regular users.

### 5. Simpler Appearance settings
- Appearance screen now contains only **Text Size** with four options: Small, Medium, Large, Extra Large.
- Theme toggle, accent colors, and other visual options are removed from this screen.

### 6. Therapist signup cleanup
- The "Daily Log Reminder" screen is skipped entirely when the selected role is Therapist.
- Therapists go straight from their profile details to completion.

## Screens affected
- **Home**: Chat button replaces Insights button next to Calendar.
- **Insights tab**: Now visible for therapists, scoped to active client.
- **Therapist Chat / Messages**: Real-time updates and optimistic send.
- **Settings → Appearance**: Simplified to text size only.
- **Onboarding (Therapist branch)**: Log reminder step removed.
- **Shared Access (Settings)**: Becomes the fallback destination from Home Chat when no connections exist.