---
name: Warm theme defaults & preference migration
description: How the warm/light default theme works and why a DB migration was needed.
---

# Warm theme defaults & preference migration

## The rule
`getColors()` treats `theme === 'dark'` as dark mode; anything else (including `undefined`) defaults to light. `colorTheme` defaults to `'warm'` when not set.

## Why migration was needed
`AppContext` historically hardcoded `theme: 'dark' as const` in the preferences fetch return — the DB column was written by old code too, so users had `theme:'dark'` and `color_theme:'mint'` stored as the implicit system default (never a real user choice).

## How to apply
In `AppContext.tsx` preferences fetch (line ~365), a migration block checks `isOldDefault = !data.color_theme || data.color_theme === 'mint'`. If true, it returns `colorTheme:'warm'` and `theme:undefined` (→ light). Non-mint themes pass through unchanged, so deliberately-chosen dark+lavender/peach users are not affected.

Once the user saves any preference via Settings, the DB gets `color_theme:'warm'` written back, and the migration no longer triggers on subsequent loads.
