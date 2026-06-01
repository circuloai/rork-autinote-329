# Chat messaging with delivered/seen status and unread badges

## Features

- [x] **Auto-mark messages as Seen** — When the therapist or caregiver opens a chat, all messages from the other person are instantly marked as read, showing "Seen" on their side
- [x] **Delivered status** — Sent messages display "Delivered" once they reach the server, then change to "Seen" when the other person opens the chat
- [x] **Apple Messages-style labels** — Each sent message bubble shows a small status label beneath the time: "Sending…" for unsent, "Delivered" once saved, or "Seen" once read
- [x] **Unread badge on Home** — The Therapist button on the Home page shows a red number badge with the count of unread messages from the therapist (resets to zero when the caregiver opens the chat)
- [x] **Unread badges for therapist** — The Messages tab and Clients list already show unread counts from caregivers — these refresh in real-time
- [x] **Instant real-time messaging** — Messages, delivery confirmations, and seen receipts update instantly across both devices via Supabase realtime

## Design

- Status labels are subtle non-intrusive text below message time in a lighter, slightly smaller font — matching Apple's iMessage style
- Unread badge on the Home Therapist button is a small red circle with white number, positioned at the top-right corner of the button
- All existing chat visual design (bubble colors, layout, spacing) stays unchanged
- Messages screen unread badges keep their current blue pill design
