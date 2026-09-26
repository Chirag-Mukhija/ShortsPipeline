// Typed client for the ClipForge server API.
import type { ProjectDetail, ProjectSummary, Step, SystemStatus } from "@clipforge/schema";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `${method} ${path} failed (${response.status})`);
  return data;
}

export const api = {
  status: () => request<SystemStatus>("GET", "/api/status"),
  projects: () => request<ProjectSummary[]>("GET", "/api/projects"),
  project: (id: string) => request<ProjectDetail>("GET", `/api/projects/${id}`),
  create: (topic: string, start = true) => request<ProjectSummary>("POST", "/api/projects", { topic, start }),
  start: (id: string, from?: Step) => request<{ ok: true }>("POST", `/api/projects/${id}/start`, { from }),
  retry: (id: string) => request<{ ok: true }>("POST", `/api/projects/${id}/retry`),
  approve: (id: string) => request<{ ok: true }>("POST", `/api/projects/${id}/approve`),
  remove: (id: string) => request<{ ok: true }>("DELETE", `/api/projects/${id}`),
};
