---
name: Font loading — Playfair Display + DM Sans
description: How custom fonts are loaded and auto-applied in ScaledText.
---

# Font loading

## Packages
`@expo-google-fonts/playfair-display` and `@expo-google-fonts/dm-sans` (installed via bun add).

## Loading
`useFonts({ PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold })` in `_layout.tsx`. App shows a loading spinner until fonts resolve.

## Auto-application in ScaledText
`ScaledText` calls `resolveFontFamily(style)` after scaling. Logic:
- If `fontFamily` already set → leave it alone (returns null).
- `fontWeight 700/800/900/bold` AND `fontSize >= 19` → `PlayfairDisplay_700Bold` (heading).
- `fontWeight 700+` below threshold → `DMSans_700Bold`.
- `fontWeight 500` → `DMSans_500Medium`, `fontWeight 600` → `DMSans_600SemiBold`.
- Default → `DMSans_400Regular`.

## Constants
`expo/constants/fonts.ts` exports `FontFamilies` object and `HEADING_FONT_SIZE_THRESHOLD = 19`.
