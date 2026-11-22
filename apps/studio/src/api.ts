// Typed client for the ClipForge server API: the studio (videos, runs, inbox, voice, recording, login) and the older Shorts pipeline.
import type {
  Cleanup,
  CutReason,
  EditMix,
  EditNote,
  EditShot,
  EditState,
  InboxIntent,
  LibraryCatalog,
  ProjectDetail,
  ProjectSummary,
  RecordState,
  RunnerStatus,
  Script,
  Step,
  SystemStatus,
  VideoDetail,
  VideoAudio,
  VideoMode,
  VideoSummary,
  VoiceStatus,
} from "@clipforge/schema";

async function raw<T>(path: string, body: ArrayBuffer | Blob): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/octet-stream" }, body });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `POST ${path} failed (${response.status})`);
  return data;
}

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
  create: (idea: string, mode: VideoMode, audio: VideoAudio, start = true, picks: { look?: string; music?: string } = {}) =>
    request<VideoDetail>("POST", "/api/studio/videos", { idea, mode, audio, start, look: picks.look ?? "", music: picks.music ?? "" }),
  library: () => request<LibraryCatalog>("GET", "/api/studio/library"),
  addTrack: (file: File, meta: Record<string, string>) => {
    const form = new FormData();
    form.append("file", file);
    for (const [k, v] of Object.entries(meta)) form.append(k, v);
    return upload<LibraryCatalog>("/api/studio/library/music", form);
  },
  edit: (id: string) => request<EditState>("GET", `${video(id)}/edit`),
  patchEdit: (
    id: string,
    patch: { mix?: Partial<EditMix>; duration?: number; music?: { trackId: string } | null; beats?: { id: string; end?: number; label?: string; status?: string }[]; footage?: { id: string; in?: number; out?: number; speed?: number; crop?: { x: number; y: number; w: number; h: number } }[]; shots?: { beat: string; list: EditShot[] } },
  ) => request<EditState>("PATCH", `${video(id)}/edit`, patch),
  render: (id: string, kind: "preview" | "final" | "stills" | "animatic", beat?: string) => request<EditState>("POST", `${video(id)}/edit/render`, { kind, beat }),
  redoBeat: (id: string, beat: string, note: string) => request<EditState>("POST", `${video(id)}/edit/beats/${beat}/regenerate`, { note }),
  restoreTake: (id: string, beat: string, take: string) => request<EditState>("POST", `${video(id)}/edit/beats/${beat}/takes/${take}/restore`),
  saveNotes: (id: string, notes: EditNote[]) => request<EditState>("PUT", `${video(id)}/edit/notes`, notes),
  sendNotes: (id: string) => request<EditState>("POST", `${video(id)}/edit/send-notes`),
  approveStoryboard: (id: string) => request<EditState>("POST", `${video(id)}/edit/storyboard/approve`),
  approveCut: (id: string) => request<EditState>("POST", `${video(id)}/edit/approve`),
  uploadFootage: (id: string, slot: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return upload<EditState>(`${video(id)}/edit/footage/${encodeURIComponent(slot)}`, form);
  },
  file: async (id: string, path: string): Promise<string> => {
    const response = await fetch(`${video(id)}/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`Couldn't open ${path}`);
    return response.text();
  },
  saveFile: (id: string, path: string, content: string) => request<VideoDetail>("PUT", `${video(id)}/file`, { path, content }),
  setMode: (id: string, mode: VideoMode) => request<VideoDetail>("POST", `${video(id)}/mode`, { mode }),
  setAudio: (id: string, audio: VideoAudio) => request<VideoDetail>("POST", `${video(id)}/audio`, { audio }),
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
  voice: () => request<VoiceStatus>("GET", "/api/studio/voice"),
  record: (id: string) => request<RecordState>("GET", `/api/studio/videos/${id}/record`),
  startTake: (id: string, rate: number, from: number) => request<{ take: string }>("POST", `/api/studio/videos/${id}/record/takes`, { rate, from }),
  sendChunk: (id: string, take: string, pcm: ArrayBuffer) => raw<{ ok: true }>(`/api/studio/videos/${id}/record/takes/${take}/chunk`, pcm),
  sendVideoChunk: (id: string, take: string, piece: Blob) => raw<{ ok: true }>(`/api/studio/videos/${id}/record/takes/${take}/video`, piece),
  finishTake: (id: string, take: string) => request<RecordState>("POST", `/api/studio/videos/${id}/record/takes/${take}/finish`),
  retranscribe: (id: string, take: string) => request<RecordState>("POST", `/api/studio/videos/${id}/record/takes/${take}/retranscribe`),
  setCleanup: (id: string, cleanup: Cleanup) => request<RecordState>("PUT", `/api/studio/videos/${id}/record/cleanup`, { cleanup }),
  saveCuts: (id: string, take: string, cuts: (CutReason | null)[]) => request<{ ok: true }>("PUT", `/api/studio/videos/${id}/record/takes/${take}/cuts`, { cuts }),
  deleteTake: (id: string, take: string) => request<RecordState>("DELETE", `/api/studio/videos/${id}/record/takes/${take}`),
  listen: (id: string, from: number, pcm: ArrayBuffer) => raw<{ cursor: number; heard: string; busy?: true }>(`/api/studio/videos/${id}/record/listen?from=${from}`, pcm),
  exportNarration: (id: string, finish: boolean) => request<RecordState>("POST", `/api/studio/videos/${id}/record/export`, { finish }),
  addVoiceSample: (file: Blob, name: string, topic: string) => {
    const form = new FormData();
    form.append("file", new File([file], name, { type: file.type }));
    form.append("topic", topic);
    return upload<{ file: string; text: string; status: VoiceStatus }>("/api/studio/voice/sample", form);
  },
  runner: () => request<RunnerStatus>("GET", "/api/studio/runner"),
  resume: () => request<RunnerStatus>("POST", "/api/studio/runner/resume"),
  refreshUsage: () => request<RunnerStatus>("POST", "/api/studio/runner/usage"),
};
