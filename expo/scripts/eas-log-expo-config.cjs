/**
 * EAS Build: logs resolved Expo config (updates + ios id) for debugging.
 * Runs on eas-build-post-install after dependencies are installed.
 *
 * expo.dev: code signing for EAS Update is configured in the project repo or
 * via `expo-updates codesigning:configure`; the dashboard does not inject
 * app.json keys into EAS builds. If this log still shows certificate paths,
 * the source is in committed config or a config plugin — not remote-only state.
 */
const path = require("path");

function main() {
  const projectRoot = path.join(__dirname, "..");
  let getConfig;
  try {
    ({ getConfig } = require("@expo/config"));
  } catch (e) {
    console.warn(
      "[eas-log-expo-config] skip: @expo/config not available yet:",
      e.message
    );
    return;
  }

  const { exp, staticConfigPath, dynamicConfigPath } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  const updates = exp.updates ?? null;
  const debug = {
    staticConfigPath,
    dynamicConfigPath,
    updates,
    iosBundleIdentifier: exp.ios?.bundleIdentifier ?? null,
  };

  console.log(
    "[eas-log-expo-config] resolved config excerpt:",
    JSON.stringify(debug, null, 2)
  );

  if (updates && typeof updates === "object") {
    const bad = ["codeSigningCertificate", "codeSigningMetadata"].filter(
      (k) => k in updates
    );
    if (bad.length) {
      console.warn(
        "[eas-log-expo-config] WARNING: updates still contains:",
        bad.join(", "),
        "(app.config.js should strip these — check plugin order / config merge)"
      );
    }
  }
}

main();
