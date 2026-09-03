const { getDefaultConfig } = require("expo/metro-config");
const http = require("node:http");

const config = getDefaultConfig(__dirname);

// The Hono/OpenAI service is server-only. Excluding it keeps Metro from
// crawling its large Node dependency tree when Watchman is unavailable.
config.resolver.blockList = [
  /\/backend\/.*/,
  /\/node_modules\/openai\/.*/,
  /\/node_modules\/@ai-sdk\/.*/,
  /\/node_modules\/@rork-ai\/.*/,
];

// Keep web preview API calls same-origin. Replit exposes the Expo preview on
// port 5000 while the server-only Hono process listens privately on port 3001.
config.server.enhanceMiddleware = (metroMiddleware) => {
  return (req, res, next) => {
    if (!req.url?.startsWith("/api/")) {
      return metroMiddleware(req, res, next);
    }

    const proxyRequest = http.request(
      {
        hostname: "127.0.0.1",
        port: 3001,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: "127.0.0.1:3001",
        },
      },
      (proxyResponse) => {
        res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(res);
      },
    );

    proxyRequest.on("error", () => {
      if (res.headersSent) {
        res.end();
        return;
      }
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "The API service is unavailable." }));
    });

    req.pipe(proxyRequest);
  };
};

module.exports = config;
