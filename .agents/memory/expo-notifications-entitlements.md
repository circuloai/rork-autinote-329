---
name: Expo Notifications entitlements
description: Why AutiNote should keep Expo's standard APNs entitlement even though it currently schedules only local notifications.
---

Expo Notifications adds `aps-environment` during automatic plugin processing after user plugins. Do not add a config plugin that tries to remove it; introspected and generated iOS output is the source of truth.

**Why:** The former dynamic-config workaround did not remove the final entitlement. Replit Expo Launch manages the matching iOS capability during signing, while the standard Expo plugin configuration preserves local notification support.

**How to apply:** Keep `expo-notifications` in static `app.json`, avoid dynamic Expo config, and verify entitlement behavior with a clean iOS prebuild when changing notification configuration.