// Assembles the HTTP app (API, media files, built studio) and starts the server together with the job runner.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { DATA_DIR, FILES_PREFIX, env, paths } from "./config";
import { startAutopilot } from "./pipeline/autopilot";
import { StepError, errorMessage } from "./pipeline/errors";
import { startRunner } from "./pipeline/runner";
import { api } from "./routes/api";
import { recordings } from "./routes/recordings";
import { seedIdeas } from "./seed";

const SERVABLE = ["projects/", "library/", "exports/"];

export function createApp(): Hono {
  const app = new Hono();

  app.use(`${FILES_PREFIX}/*`, cors());
  // Decision: only media folders are exposed; the database, OAuth secrets and caches under DATA_DIR are never served.
  app.use(`${FILES_PREFIX}/*`, async (c, next) => {
    const relative = decodeURIComponent(c.req.path.slice(FILES_PREFIX.length + 1));
    if (relative.includes("..") || !SERVABLE.some((prefix) => relative.startsWith(prefix))) {
      return c.text("Not found", 404);
    }
    return next();
  });
  app.use(
    `${FILES_PREFIX}/*`,
    serveStatic({ root: DATA_DIR, rewriteRequestPath: (requestPath) => requestPath.slice(FILES_PREFIX.length) }),
  );

  app.all(`${FILES_PREFIX}/*`, (c) => c.text("Not found", 404));

  app.route("/api", api);
  app.route("/api", recordings);
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  if (existsSync(paths.studioDist)) {
    app.use("/*", serveStatic({ root: paths.studioDist }));
    app.get("*", (c) => c.html(readFileSync(path.join(paths.studioDist, "index.html"), "utf8")));
  } else {
    app.get("/", (c) => c.text("ClipForge server is running. Open the studio with `pnpm dev` at http://localhost:5173."));
  }

  app.onError((error, c) => c.json({ error: errorMessage(error) }, error instanceof StepError ? 400 : 500));
  return app;
}

export function startServer(): Promise<{ port: number }> {
  seedIdeas();
  startRunner();
  startAutopilot();
  const app = createApp();
  return new Promise((resolve) => {
    serve({ fetch: app.fetch, port: env.SERVER_PORT, hostname: env.HOST }, (info) => resolve({ port: info.port }));
  });
}
