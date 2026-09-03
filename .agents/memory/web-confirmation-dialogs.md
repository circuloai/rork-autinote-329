---
name: Web confirmation dialogs
description: Confirmation behavior differs between native React Native and the Expo web preview.
---

React Native Web exposes `Alert.alert` for API compatibility, but its implementation does not display a dialog or invoke callbacks. Any destructive confirmation that must work in the web preview needs a browser confirmation path, while native builds can continue using `Alert.alert`.

**Why:** A destructive action can appear completely unresponsive in the browser even though the native handler is correctly wired.

**How to apply:** Branch on `Platform.OS === 'web'` and use `window.confirm` with a guarded `window` check; keep the shared destructive action in one callback so web and native paths have identical effects.