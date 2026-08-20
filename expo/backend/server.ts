import { serve } from "@hono/node-server";
import app from "./hono";

const port = Number(process.env.PORT || process.env.API_PORT || 3001);

serve(
  {
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port,
  },
  (info) => {
    console.log(`[api] Hono server listening on http://0.0.0.0:${info.port}`);
  }
);