---
name: Expo Notifications entitlements
description: EAS provisioning must match the Push Notifications capability required by expo-notifications.
---

This project ships through EAS Build, not Replit Expo Launch. EAS manages iOS signing credentials against the user's Apple Developer account. Do not assume Replit manages iOS capabilities.

`expo-notifications` adds `aps-environment` to the iOS entitlements. This is correct and expected. Do not add a config plugin to strip it, and do not reintroduce `expo/app.config.js` for this purpose.

The App ID `app.rork.autinote` must have the Push Notifications capability enabled in the Apple Developer portal. After any entitlement change, the EAS provisioning profile must be regenerated. The user performs this external credentials step with `npx eas-cli credentials -p ios`; it cannot be done from Replit.

**Why:** The EAS-managed provisioning profile must include the same Push Notifications capability required by the app's expected `aps-environment` entitlement. Apple Developer capabilities and EAS signing credentials are outside project code.

**How to apply:** If an iOS build reports that its provisioning profile “doesn't include the aps-environment entitlement,” escalate to the user to enable Push Notifications for the App ID and regenerate the EAS profile. Fix the credentials, not the app configuration.