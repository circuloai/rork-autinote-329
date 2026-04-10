# Redesign Home Screen Layout & Style

## Changes

**Child Profile Box**
- Remove the "Hello! name" greeting text at the top of the screen
- Replace the purple gradient profile box with a frosted glass style (using the existing GlassCard component on iOS, translucent fallback on other platforms)
- Condense the profile box: smaller avatar, tighter spacing, single-row layout for details like diagnosis and school
- Integrate the recent mood emoji + label directly into the profile card (top-right area near the streak badge) — no separate mood section
- Keep "Tap to view full profile" link at the bottom of the card
- Use readable text colors that work on the glass/translucent background (no dark blue on purple)

**Section Order (top to bottom)**
1. **Child Profile Card** — compact glass card with name, age, streak, recent mood, diagnosis, triggers
2. **Log Your Day** — Daily Log and Meltdown Log buttons (unchanged functionality)
3. **Calendar & Insights** — the two side-by-side buttons (unchanged functionality)
4. **AI Insights** — the chat prompt card (unchanged functionality)

**Removed**
- "Hello! name" header
- Separate "Recent Mood" card (moved into profile card)
