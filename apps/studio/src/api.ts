// Typed client for the ClipForge server API: the studio (videos, runs, inbox, login) and the older Shorts pipeline.
import type {
  InboxIntent,
  ProjectDetail,
  ProjectSummary,
  RunnerStatus,
  Script,
  Step,
  SystemStatus,
  VideoDetail,
  VideoMode,
  VideoSummary,
} from "@clipforge/schema";

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
  saveScript: (id: string, script: Script) => request<{ ok: true }>("PUT", `/api/projects/${id}/review/script`, { script }),
  regenerateReview: (id: string, note: string) =>
    request<{ ok: true }>("POST", `/api/projects/${id}/review/regenerate`, { note }),
  uploadRecording: async (id: string, sceneId: string, blob: Blob, fileName?: string): Promise<{ durationMs: number }> => {
    const query = fileName ? `?name=${encodeURIComponent(fileName)}` : "";
    const response = await fetch(`/api/projects/${id}/scenes/${sceneId}/recording${query}`, { method: "POST", body: blob });
    const data = (await response.json().catch(() => ({}))) as { durationMs?: number; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Upload failed");
    return { durationMs: data.durationMs ?? 0 };
  },
  deleteRecording: (id: string, sceneId: string) =>
    request<{ ok: true }>("DELETE", `/api/projects/${id}/scenes/${sceneId}/recording`),
};

async function upload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(path, { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Upload failed (${response.status})`);
  return data;
}

const video = (id: string) => `/api/studio/videos/${encodeURIComponent(id)}`;

export const studio = {
  auth: () => request<{ required: boolean; ok: boolean }>("GET", "/api/auth"),
  login: (passcode: string) => request<{ ok: true }>("POST", "/api/auth", { passcode }),
  videos: () => request<VideoSummary[]>("GET", "/api/studio/videos"),
  video: (id: string) => request<VideoDetail>("GET", video(id)),
  create: (idea: string, mode: VideoMode, start = true) => request<VideoDetail>("POST", "/api/studio/videos", { idea, mode, start }),
  file: async (id: string, path: string): Promise<string> => {
    const response = await fetch(`${video(id)}/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`Couldn't open ${path}`);
    return response.text();
  },
  saveFile: (id: string, path: string, content: string) => request<VideoDetail>("PUT", `${video(id)}/file`, { path, content }),
  setMode: (id: string, mode: VideoMode) => request<VideoDetail>("POST", `${video(id)}/mode`, { mode }),
  answer: (id: string, answers: Record<string, string>) => request<VideoDetail>("POST", `${video(id)}/answers`, { answers }),
  approve: (id: string, stage: string, note?: string) => request<VideoDetail>("POST", `${video(id)}/approve`, { stage, note }),
  notes: (id: string, stage: string, notes: string) => request<VideoDetail>("POST", `${video(id)}/notes`, { stage, notes }),
  run: (id: string) => request<VideoDetail>("POST", `${video(id)}/run`),
  stop: (id: string) => request<VideoDetail>("POST", `${video(id)}/stop`),
  message: (id: string, text: string) => request<VideoDetail>("POST", `${video(id)}/message`, { text }),
  addToInbox: (id: string, file: File, note: string, intent: InboxIntent) => {
    const form = new FormData();
    form.append("file", file);
    form.append("note", note);
    form.append("intent", intent);
    return upload<VideoDetail>(`${video(id)}/inbox`, form);
  },
  transcribe: (file: Blob, name = "note.webm") => {
    const form = new FormData();
    form.append("file", new File([file], name, { type: file.type }));
    return upload<{ text: string }>("/api/studio/transcribe", form);
  },
  runner: () => request<RunnerStatus>("GET", "/api/studio/runner"),
  resume: () => request<RunnerStatus>("POST", "/api/studio/runner/resume"),
};
