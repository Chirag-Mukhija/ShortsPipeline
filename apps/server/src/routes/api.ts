// HTTP API: projects and pipeline controls, system status, live SSE events and the YouTube OAuth handshake.
import { MODES, STEPS, type SystemStatus } from "@clipforge/schema";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { stockProviders } from "../assets/stock";
import { env } from "../config";
import { createProject, getProject, listProjects, monthSpendInr } from "../db/repo";
import { llmProvider } from "../llm";
import { nextAutopilotRun } from "../pipeline/autopilot";
import { approveProject, removeProject, retryProject, startProject } from "../pipeline/control";
import { errorMessage } from "../pipeline/errors";
import { emit, subscribe } from "../pipeline/events";
import { projectDetail, projectSummary } from "../pipeline/views";
import { completeYoutubeAuth, youtubeAuthUrl, youtubeConfigured, youtubeConnected } from "../publish/youtube";
import { ttsChain } from "../tts";

const CreateBody = z.object({
  topic: z.string().trim().min(3).max(300),
  start: z.boolean().default(true),
  mode: z.enum(MODES).default("auto"),
});

const StartBody = z.object({ from: z.enum(STEPS).optional() });

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function systemStatus(): SystemStatus {
  let llm: SystemStatus["llm"];
  try {
    const provider = llmProvider();
    llm = { provider: provider.id, model: provider.model, paid: provider.billed };
  } catch (error) {
    llm = { provider: "misconfigured", model: errorMessage(error), paid: false };
  }
  const voice = ttsChain()[0];
  return {
    llm,
    tts: { provider: voice?.id ?? "none", voice: voice?.voice ?? "" },
    stock: { providers: stockProviders() },
    youtube: { configured: youtubeConfigured(), connected: youtubeConnected() },
    budget: { monthSpendInr: monthSpendInr(), capInr: env.MONTHLY_BUDGET_INR },
    autopilot: { everyHours: env.AUTOPILOT_HOURS, nextRun: nextAutopilotRun() },
  };
}

export const api = new Hono();

api.get("/health", (c) => c.json({ ok: true }));

api.get("/status", (c) => c.json(systemStatus()));

api.get("/projects", (c) => c.json(listProjects().map((row) => projectSummary(row))));

api.post("/projects", async (c) => {
  const body = CreateBody.safeParse(await readJson(c.req.raw));
  if (!body.success) return c.json({ error: z.prettifyError(body.error) }, 400);
  const project = createProject({ topic: body.data.topic, mode: body.data.mode, status: "idea" });
  if (body.data.start) startProject(project.id);
  emit({ type: "project", projectId: project.id });
  const row = getProject(project.id);
  return row ? c.json(projectSummary(row), 201) : c.json({ error: "Project vanished" }, 500);
});

api.get("/projects/:id", (c) => {
  const row = getProject(c.req.param("id"));
  return row ? c.json(projectDetail(row)) : c.json({ error: "Project not found" }, 404);
});

api.post("/projects/:id/start", async (c) => {
  const body = StartBody.safeParse(await readJson(c.req.raw));
  if (!body.success) return c.json({ error: z.prettifyError(body.error) }, 400);
  startProject(c.req.param("id"), body.data.from);
  return c.json({ ok: true });
});

api.post("/projects/:id/retry", (c) => {
  retryProject(c.req.param("id"));
  return c.json({ ok: true });
});

api.post("/projects/:id/approve", (c) => {
  approveProject(c.req.param("id"));
  return c.json({ ok: true });
});

api.delete("/projects/:id", (c) => {
  removeProject(c.req.param("id"));
  return c.json({ ok: true });
});

api.get("/events", (c) =>
  streamSSE(c, async (stream) => {
    const unsubscribe = subscribe((event) => {
      void stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
    });
    stream.onAbort(unsubscribe);
    while (!stream.aborted) {
      await stream.writeSSE({ event: "ping", data: "{}" });
      await stream.sleep(20_000);
    }
    unsubscribe();
  }),
);

api.get("/youtube/auth", (c) =>
  youtubeConfigured()
    ? c.redirect(youtubeAuthUrl())
    : c.text("Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env, restart the server, then try again.", 400),
);

api.get("/youtube/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text(`YouTube authorization failed: ${c.req.query("error") ?? "no code returned"}`, 400);
  await completeYoutubeAuth(code);
  return c.redirect("/?youtube=connected");
});
