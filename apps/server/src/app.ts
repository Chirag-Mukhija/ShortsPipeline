// Assembles the HTTP app (passcode gate, API, media and video files, built studio) and starts the server with both job runners.
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
import { edit } from "./routes/edit";
import { studio } from "./routes/studio";
import { assertSafeHost, isAuthed, login, requireStudioAuth } from "./studio/auth";
import { startStudioRunner } from "./studio/runner";
import { VIDEOS_DIR, VIDEO_FILES_PREFIX } from "./studio/videos";
import { seedIdeas } from "./seed";

const SERVABLE = ["projects/", "library/", "exports/"];
const VIDEO_SERVABLE = /^\d{3}-[a-z0-9-]+\/((inbox|renders|media)\/[^/]+|record\/(takes\/)?[^/]+\.wav|edit\/(stills\/[\w-]+|\.thumbs)\/[^/]+\.(png|jpg))$/;

export function createApp(): Hono {
  const app = new Hono();

  app.use("/api/*", requireStudioAuth());
  app.use(`${FILES_PREFIX}/*`, requireStudioAuth());
  app.use(`${VIDEO_FILES_PREFIX}/*`, requireStudioAuth());
  app.get("/api/auth", (c) => c.json({ required: Boolean(env.STUDIO_PASSCODE), ok: isAuthed(c) }));
  app.post("/api/auth", async (c) => {
    const { passcode } = (await c.req.json().catch(() => ({}))) as { passcode?: string };
    return login(c, String(passcode ?? "")) ? c.json({ ok: true }) : c.json({ error: "Wrong passcode" }, 401);
  });

  // Decision: from a video folder only creator uploads and renders are served; scripts, status and run logs stay API-only.
  app.use(`${VIDEO_FILES_PREFIX}/*`, async (c, next) => {
    const relative = decodeURIComponent(c.req.path.slice(VIDEO_FILES_PREFIX.length + 1));
    if (relative.includes("..") || !VIDEO_SERVABLE.test(relative)) return c.text("Not found", 404);
    return next();
  });
  app.use(
    `${VIDEO_FILES_PREFIX}/*`,
    serveStatic({ root: VIDEOS_DIR, rewriteRequestPath: (requestPath) => requestPath.slice(VIDEO_FILES_PREFIX.length) }),
  );
  app.all(`${VIDEO_FILES_PREFIX}/*`, (c) => c.text("Not found", 404));

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
  app.route("/api", studio);
  app.route("/api", edit);
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
  assertSafeHost(env.HOST, env.STUDIO_PASSCODE);
  seedIdeas();
  startRunner();
  startStudioRunner();
  startAutopilot();
  const app = createApp();
  return new Promise((resolve) => {
    serve({ fetch: app.fetch, port: env.SERVER_PORT, hostname: env.HOST }, (info) => resolve({ port: info.port }));
  });
}
