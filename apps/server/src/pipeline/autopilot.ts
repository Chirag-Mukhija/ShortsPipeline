// Optional autopilot: every AUTOPILOT_HOURS it starts the top backlog idea, as long as nothing else is in production.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR, env } from "../config";
import { listProjects } from "../db/repo";
import { startProject } from "./control";

const STATE_FILE = path.join(DATA_DIR, "autopilot.json");
const CHECK_EVERY_MS = 10 * 60_000;

function lastStartedAt(): number {
  try {
    return (JSON.parse(readFileSync(STATE_FILE, "utf8")) as { lastStartedAt?: number }).lastStartedAt ?? 0;
  } catch {
    return 0;
  }
}

export function nextAutopilotRun(): string | null {
  if (env.AUTOPILOT_HOURS <= 0) return null;
  return new Date(Math.max(Date.now(), lastStartedAt() + env.AUTOPILOT_HOURS * 3_600_000)).toISOString();
}

function tick(): void {
  if (Date.now() - lastStartedAt() < env.AUTOPILOT_HOURS * 3_600_000) return;
  const projects = listProjects();
  if (projects.some((project) => project.status === "queued" || project.status === "running")) return;
  const idea = projects.find((project) => project.status === "idea");
  if (!idea) {
    console.log("Autopilot: the idea backlog is empty; add ideas in the studio");
    return;
  }
  startProject(idea.id);
  writeFileSync(STATE_FILE, JSON.stringify({ lastStartedAt: Date.now(), projectId: idea.id }));
  console.log(`Autopilot started "${idea.topic}"`);
}

export function startAutopilot(): void {
  if (env.AUTOPILOT_HOURS <= 0) return;
  console.log(`Autopilot on: one short every ${env.AUTOPILOT_HOURS}h from the backlog`);
  setTimeout(tick, 30_000);
  setInterval(tick, CHECK_EVERY_MS);
}
