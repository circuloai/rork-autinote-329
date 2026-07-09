const { withEntitlementsPlist } = require("@expo/config-plugins");

/**
 * Extends merged app.json config.
 *
 * 1. Strips invalid EAS Update signing paths (codeSigningCertificate /
 *    codeSigningMetadata) that cause expo-updates to fail.
 *
 * 2. Removes the aps-environment entitlement that the expo-notifications
 *    config plugin adds by default. This app only uses LOCAL scheduled
 *    notifications (reminders) — it never calls APNs / remote push.
 *    The entitlement is not needed and causes App Store builds to fail
 *    because the auto-generated provisioning profile does not have the
 *    Push Notifications capability enabled.
 */

const withNoRemotePush = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults["aps-environment"];
    return mod;
  });

module.exports = ({ config }) => {
  const expo = { ...config };

  // Strip EAS Update code-signing fields that Expo's runtime rejects.
  if (expo.updates && typeof expo.updates === "object") {
    const next = { ...expo.updates };
    delete next.codeSigningCertificate;
    delete next.codeSigningMetadata;

    if (Object.keys(next).length > 0) {
      expo.updates = next;
    } else {
      delete expo.updates;
    }
  }

  // Apply the no-remote-push plugin last so it runs after expo-notifications.
  return withNoRemotePush(expo); // IMPORTANT: do NOT wrap inside { expo }
};
