const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The Hono/OpenAI service is server-only. Excluding it keeps Metro from
// crawling its large Node dependency tree when Watchman is unavailable.
config.resolver.blockList = [
  /\/backend\/.*/,
  /\/node_modules\/openai\/.*/,
  /\/node_modules\/@ai-sdk\/.*/,
  /\/node_modules\/@rork-ai\/.*/,
];

module.exports = config;
