# Fix calendar date colors, add delete from calendar, rename Great

**Fixes and improvements to the Calendar screen:**

- [x] **Fix mood color on calendar dates** — The calendar's `getMoodColor` function currently maps `"good"` to green, but daily logs actually use `"great"` as the rating value. This means great-day logs show grey instead of green on the calendar. Fix: add a `"great"` → green mapping so the color legend and calendar cells match.
- [x] **Change "Good" to "Great" in the mood legend** — Update the label below the calendar from "Good" to "Great" to match the actual rating label used throughout the app ("Great Day").
- [x] **Add delete-from-calendar** — Long-pressing a calendar date that has logs will show an alert listing the logs for that date, with an option to delete each one. This lets users remove unwanted logs directly from the calendar view without navigating away.
- [x] **Ensure date is saved correctly** — The existing code already passes the tapped date through route params and uses it when saving; no changes needed here. The bug was purely visual (grey instead of green).
