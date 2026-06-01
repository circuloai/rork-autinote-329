# Fix date offset & add log editing

## Two fixes

### 1. Fix date offset bug - [x]

**The problem**: When clicking a calendar date, the date is converted to an ISO timestamp (e.g. `"2026-05-12T16:00:00.000Z"`) that shifts depending on the device's timezone. This makes the log appear on the wrong day.

**The fix**: Store and compare dates using simple YYYY-MM-DD format (e.g. `"2026-05-13"`) — no timezone component, no ambiguity. The calendar passes the date as YYYY-MM-DD, the log screen stores it as YYYY-MM-DD, and the calendar matches it directly.

### 2. Edit saved logs - [x]

**The problem**: Once a log is saved for a date, there's no way to edit it — tapping the date always opens a blank form for a new log.

**The fix**: When you tap a date that already has logs, the app shows a quick menu with "Edit Log" and "New Log" options. Choosing "Edit" opens the log form pre-filled with the existing data — you can change anything and save to update. Tapping a date with no logs still opens the blank form directly as before. The long-press menu on calendar dates now also has an "Edit" option alongside "Delete".

**Files changed**: Calendar screen and daily log screen.
