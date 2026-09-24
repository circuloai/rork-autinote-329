/**
 * Expo Launch: logs resolved Expo config for build diagnostics.
 * Runs on eas-build-post-install after dependencies are installed.
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

  const debug = {
    staticConfigPath,
    dynamicConfigPath,
    iosBundleIdentifier: exp.ios?.bundleIdentifier ?? null,
    photoLibraryUsageDescription:
      exp.ios?.infoPlist?.NSPhotoLibraryUsageDescription ?? null,
  };

  console.log(
    "[eas-log-expo-config] resolved config excerpt:",
    JSON.stringify(debug, null, 2)
  );

}

main();
