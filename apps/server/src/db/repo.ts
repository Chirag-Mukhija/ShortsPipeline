// Data access for projects, artifacts, jobs, logs and spend, including the atomic job claim used by the runner.
import type { JobStatus, LogLevel, Mode, ProjectStatus, Step } from "@clipforge/schema";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import {
  artifacts,
  jobs,
  logs,
  projects,
  recordings,
  spend,
  type JobLane,
  type JobRow,
  type LogRow,
  type ProjectRow,
  type RecordingRow,
} from "./schema";

export const now = () => new Date().toISOString();

export function createProject(input: {
  topic: string;
  mode?: Mode;
  status?: ProjectStatus;
  pauseAfter?: Step[];
}): ProjectRow {
  const timestamp = now();
  const row: ProjectRow = {
    id: nanoid(10),
    topic: input.topic.trim(),
    title: null,
    status: input.status ?? "idea",
    mode: input.mode ?? "assisted",
    currentStep: null,
    pauseAfter: input.pauseAfter ?? ["review"],
    error: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.insert(projects).values(row).run();
  return row;
}

export function getProject(id: string): ProjectRow | undefined {
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function listProjects(): ProjectRow[] {
  return db.select().from(projects).orderBy(desc(projects.updatedAt), sql`rowid desc`).all();
}

export function countProjects(): number {
  return db.select({ n: sql<number>`count(*)` }).from(projects).get()?.n ?? 0;
}

export function updateProject(id: string, patch: Partial<Omit<ProjectRow, "id" | "createdAt">>): void {
  db.update(projects)
    .set({ ...patch, updatedAt: now() })
    .where(eq(projects.id, id))
    .run();
}

export function deleteProject(id: string): void {
  db.delete(projects).where(eq(projects.id, id)).run();
}

export function saveArtifact(projectId: string, step: Step, data: unknown): void {
  db.insert(artifacts).values({ projectId, step, data, createdAt: now() }).run();
}

export function latestArtifact<T>(projectId: string, step: Step): T | undefined {
  const row = db
    .select({ data: artifacts.data })
    .from(artifacts)
    .where(and(eq(artifacts.projectId, projectId), eq(artifacts.step, step)))
    .orderBy(desc(artifacts.id))
    .limit(1)
    .get();
  return row?.data as T | undefined;
}

export function latestArtifacts(projectId: string): Partial<Record<Step, unknown>> {
  const rows = db
    .select({ step: artifacts.step, data: artifacts.data })
    .from(artifacts)
    .where(eq(artifacts.projectId, projectId))
    .orderBy(asc(artifacts.id))
    .all();
  const result: Partial<Record<Step, unknown>> = {};
  for (const row of rows) result[row.step] = row.data;
  return result;
}

export function enqueueJob(projectId: string, step: Step, lane: JobLane, delayMs = 0, feedbackNote?: string): JobRow {
  const timestamp = now();
  const row: JobRow = {
    id: nanoid(12),
    projectId,
    step,
    lane,
    status: "queued",
    attempts: 0,
    maxAttempts: 3,
    progress: 0,
    message: null,
    error: null,
    feedbackNote: feedbackNote ?? null,
    runAfter: new Date(Date.now() + delayMs).toISOString(),
    createdAt: timestamp,
    startedAt: null,
    finishedAt: null,
  };
  db.insert(jobs).values(row).run();
  return row;
}

export function claimNextJob(lane: JobLane): JobRow | undefined {
  return db.transaction(
    (tx) => {
      const job = tx
        .select()
        .from(jobs)
        .where(and(eq(jobs.status, "queued"), eq(jobs.lane, lane), lte(jobs.runAfter, now())))
        .orderBy(asc(jobs.createdAt))
        .limit(1)
        .get();
      if (!job) return undefined;
      const claimed: JobRow = {
        ...job,
        status: "running",
        attempts: job.attempts + 1,
        startedAt: now(),
        progress: 0,
        message: null,
        error: null,
      };
      tx.update(jobs)
        .set({
          status: claimed.status,
          attempts: claimed.attempts,
          startedAt: claimed.startedAt,
          progress: 0,
          message: null,
          error: null,
        })
        .where(eq(jobs.id, job.id))
        .run();
      return claimed;
    },
    { behavior: "immediate" },
  );
}

export function updateJob(id: string, patch: Partial<Omit<JobRow, "id">>): void {
  db.update(jobs).set(patch).where(eq(jobs.id, id)).run();
}

export function finishJob(id: string, status: JobStatus, error: string | null = null): void {
  db.update(jobs)
    .set({ status, error, finishedAt: now(), progress: status === "done" ? 1 : undefined })
    .where(eq(jobs.id, id))
    .run();
}

export function requeueJob(id: string, delayMs: number, error: string): void {
  db.update(jobs)
    .set({ status: "queued", error, runAfter: new Date(Date.now() + delayMs).toISOString() })
    .where(eq(jobs.id, id))
    .run();
}

export function cancelQueuedJobs(projectId: string): void {
  db.update(jobs)
    .set({ status: "cancelled", finishedAt: now() })
    .where(and(eq(jobs.projectId, projectId), eq(jobs.status, "queued")))
    .run();
}

export function listJobs(projectId: string): JobRow[] {
  return db.select().from(jobs).where(eq(jobs.projectId, projectId)).orderBy(desc(jobs.createdAt)).limit(60).all();
}

export function activeJob(projectId: string): JobRow | undefined {
  return db
    .select()
    .from(jobs)
    .where(and(eq(jobs.projectId, projectId), inArray(jobs.status, ["queued", "running"])))
    .orderBy(desc(jobs.createdAt))
    .limit(1)
    .get();
}

export function requeueInterruptedJobs(): number {
  return db
    .update(jobs)
    .set({ status: "queued", startedAt: null, attempts: sql`max(${jobs.attempts} - 1, 0)` })
    .where(eq(jobs.status, "running"))
    .run().changes;
}

export function addLog(projectId: string, step: Step | null, level: LogLevel, message: string): LogRow {
  const row = { projectId, step, level, message, createdAt: now() };
  const result = db.insert(logs).values(row).run();
  return { ...row, id: Number(result.lastInsertRowid) };
}

export function listLogs(projectId: string, limit = 400): LogRow[] {
  return db.select().from(logs).where(eq(logs.projectId, projectId)).orderBy(desc(logs.id)).limit(limit).all().reverse();
}

// Decision: re-recording replaces the row (delete then insert) rather than versioning like artifacts — the old
// audio file is genuinely gone, so its database row should be too, not kept as unreachable history.
export function upsertRecording(entry: {
  projectId: string;
  sceneId: string;
  file: string;
  originalName: string | null;
  durationMs: number;
}): RecordingRow {
  db.delete(recordings).where(and(eq(recordings.projectId, entry.projectId), eq(recordings.sceneId, entry.sceneId))).run();
  const row = { ...entry, createdAt: now() };
  const result = db.insert(recordings).values(row).run();
  return { ...row, id: Number(result.lastInsertRowid) };
}

export function deleteRecording(projectId: string, sceneId: string): RecordingRow | undefined {
  const row = getRecording(projectId, sceneId);
  if (row) db.delete(recordings).where(and(eq(recordings.projectId, projectId), eq(recordings.sceneId, sceneId))).run();
  return row;
}

export function getRecording(projectId: string, sceneId: string): RecordingRow | undefined {
  return db
    .select()
    .from(recordings)
    .where(and(eq(recordings.projectId, projectId), eq(recordings.sceneId, sceneId)))
    .get();
}

export function listRecordings(projectId: string): RecordingRow[] {
  return db.select().from(recordings).where(eq(recordings.projectId, projectId)).all();
}

export function recordSpend(entry: {
  projectId: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costInr: number;
  billed: boolean;
}): void {
  db.insert(spend)
    .values({ ...entry, createdAt: now() })
    .run();
}

export function monthSpendInr(): number {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const row = db
    .select({ total: sql<number>`coalesce(sum(${spend.costInr}), 0)` })
    .from(spend)
    .where(and(eq(spend.billed, true), gte(spend.createdAt, start.toISOString())))
    .get();
  return row?.total ?? 0;
}

export function projectSpendInr(projectId: string): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${spend.costInr}), 0)` })
    .from(spend)
    .where(and(eq(spend.projectId, projectId), eq(spend.billed, true)))
    .get();
  return row?.total ?? 0;
}
