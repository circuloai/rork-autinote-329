---
name: Expo Notifications entitlements
description: Local notifications intentionally omit the expo-notifications config plugin and its remote-push entitlement.
---

This project ships through EAS Build, not Replit Expo Launch. EAS manages iOS signing credentials against the user's Apple Developer account. Do not assume Replit manages iOS capabilities.

The `expo-notifications` config plugin is not auto-applied. It runs only when `expo-notifications` is listed in the app config's plugins array. This was verified against `expo-notifications` 0.32.17: its module config declares native modules and app-delegate subscribers, but no config plugin.

This app uses local notifications only, so it does not need the iOS `aps-environment` entitlement. Keep the `expo-notifications` dependency for native-module autolinking, but intentionally omit its config plugin from the plugins array.

If remote push is added later through push-token APIs or server-side sending, re-add the config plugin and have the user regenerate iOS credentials with `npx eas-cli credentials -p ios`. That external credential step cannot be performed from Replit.

Do not add a custom plugin that deletes `aps-environment`. Plugin ordering can make the Notifications plugin restore the entitlement after dynamic configuration resolves.

**Why:** The explicit Notifications config plugin adds a remote-push entitlement that is unnecessary for local scheduling and causes signing to fail when the provisioning profile does not include Push Notifications.

**How to apply:** Keep the plugin omitted while the app remains local-notification-only. If remote push becomes a product requirement, restore the plugin and regenerate matching EAS-managed iOS credentials.