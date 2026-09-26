// Command-line entry: `pnpm make "topic"` makes one short end to end, reusing a running server or starting one in-process.
import path from "node:path";
import type { ProjectDetail, ProjectSummary, PublishArtifact, RenderArtifact } from "@clipforge/schema";
import { DATA_DIR, env } from "./config";

const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
  console.error('Usage: pnpm make "How does UPI move money in two seconds?"');
  process.exit(1);
}

const base = `http://127.0.0.1:${env.SERVER_PORT}`;

async function healthy(): Promise<boolean> {
  try {
    return (await fetch(`${base}/api/health`)).ok;
  } catch {
    return false;
  }
}

async function api<T>(route: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}/api${route}`, init);
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `${route} failed with ${response.status}`);
  return body;
}

const external = await healthy();
if (external) {
  console.log(`Using the server already running on ${base}`);
} else {
  const { startServer } = await import("./app");
  await startServer();
  console.log("Started an in-process server");
}

const created = await api<ProjectSummary>("/projects", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ topic, start: true }),
});
console.log(`Project ${created.id}: ${topic}`);

let lastLogId = 0;
let unreachableSince: number | null = null;
for (;;) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  let detail: ProjectDetail;
  try {
    detail = await api<ProjectDetail>(`/projects/${created.id}`);
    unreachableSince = null;
  } catch (error) {
    unreachableSince ??= Date.now();
    if (Date.now() - unreachableSince > 120_000) throw error;
    continue;
  }
  if (external) {
    for (const log of detail.logs.filter((entry) => entry.id > lastLogId)) {
      console.log(`${log.level === "info" ? "·" : log.level === "warn" ? "!" : "✗"} [${log.step ?? "-"}] ${log.message}`);
    }
  }
  lastLogId = Math.max(lastLogId, ...detail.logs.map((entry) => entry.id));
  if (detail.status === "done" || detail.status === "failed" || detail.status === "paused") {
    const render = detail.artifacts.render as RenderArtifact | undefined;
    const publish = detail.artifacts.publish as PublishArtifact | undefined;
    if (detail.status === "done" && render) {
      console.log(`\nDone: ${detail.title ?? topic}`);
      console.log(`Video:  ${path.join(DATA_DIR, render.video)}`);
      if (publish) console.log(`Export: ${path.join(DATA_DIR, publish.exportDir)}`);
      if (publish?.youtube) console.log(`YouTube: ${publish.youtube.url} (${publish.youtube.privacy})`);
      process.exit(0);
    }
    console.error(`\nStopped with status "${detail.status}": ${detail.error ?? ""}`);
    process.exit(1);
  }
}
