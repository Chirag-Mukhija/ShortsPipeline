// Drizzle table definitions: projects, step artifacts, the job queue, project logs and the spend ledger.
import type { JobStatus, LogLevel, Mode, ProjectStatus, Step } from "@clipforge/schema";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  title: text("title"),
  status: text("status").$type<ProjectStatus>().notNull(),
  mode: text("mode").$type<Mode>().notNull().default("auto"),
  currentStep: text("current_step").$type<Step>(),
  pauseAfter: text("pause_after", { mode: "json" }).$type<Step[]>().notNull().default([]),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    step: text("step").$type<Step>().notNull(),
    data: text("data", { mode: "json" }).$type<unknown>().notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("artifacts_project_step").on(table.projectId, table.step)],
);

export type JobLane = "default" | "render";

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    step: text("step").$type<Step>().notNull(),
    lane: text("lane").$type<JobLane>().notNull(),
    status: text("status").$type<JobStatus>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    progress: real("progress").notNull().default(0),
    message: text("message"),
    error: text("error"),
    // A creator's note attached when re-running a step with feedback (currently: regenerating the review with instructions).
    feedbackNote: text("feedback_note"),
    runAfter: text("run_after").notNull(),
    createdAt: text("created_at").notNull(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
  },
  (table) => [index("jobs_claim").on(table.status, table.lane, table.runAfter)],
);

export const logs = sqliteTable(
  "logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    step: text("step").$type<Step>(),
    level: text("level").$type<LogLevel>().notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("logs_project").on(table.projectId)],
);

// One row per scene the creator has recorded or uploaded their own voice for; re-recording replaces the row
// (unlike artifacts, a stale recording's audio file should actually be freed, not kept as history).
export const recordings = sqliteTable(
  "recordings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sceneId: text("scene_id").notNull(),
    file: text("file").notNull(),
    originalName: text("original_name"),
    durationMs: real("duration_ms").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("recordings_project_scene").on(table.projectId, table.sceneId)],
);

export const spend = sqliteTable("spend", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  costInr: real("cost_inr").notNull(),
  billed: integer("billed", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type LogRow = typeof logs.$inferSelect;
export type RecordingRow = typeof recordings.$inferSelect;
