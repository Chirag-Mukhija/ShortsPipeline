// Loads .env, validates every setting and exposes resolved data paths and origins.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = path.resolve(here, "..");
export const ROOT_DIR = path.resolve(SERVER_DIR, "../..");

const envFile = path.join(ROOT_DIR, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const optional = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : undefined));

const EnvSchema = z.object({
  SERVER_PORT: z.coerce.number().int().default(4310),
  HOST: z.string().default("127.0.0.1"),
  DATA_DIR: z.string().default("data"),
  PUBLIC_URL: optional,
  MONTHLY_BUDGET_INR: z.coerce.number().default(500),
  AUTOPILOT_HOURS: z.coerce.number().min(0).default(0),
  USD_TO_INR: z.coerce.number().default(88),
  LLM_PROVIDER: z.enum(["auto", "claude-cli", "anthropic", "gemini", "openai"]).default("auto"),
  CLAUDE_CLI_PATH: z.string().default("claude"),
  CLAUDE_CLI_MODEL: z.string().default("opus"),
  CLAUDE_CLI_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("high"),
  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  GEMINI_BILLED: z.stringbool().default(false),
  OPENAI_API_KEY: optional,
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  TTS_PROVIDER: z.enum(["auto", "edge", "azure", "say"]).default("auto"),
  TTS_VOICE: z.string().default("en-IN-PrabhatNeural"),
  TTS_RATE: z.string().default("+15%"),
  AZURE_SPEECH_KEY: optional,
  AZURE_SPEECH_REGION: z.string().default("centralindia"),
  SAY_VOICE: z.string().default("Aman"),
  PAUSE_MAX_MS: z.coerce.number().int().min(0).default(300),
  PEXELS_API_KEY: optional,
  PIXABAY_API_KEY: optional,
  MUSIC_VOLUME: z.coerce.number().min(0).max(1).default(0.08),
  SFX_VOLUME: z.coerce.number().min(0).max(1).default(0.45),
  YOUTUBE_CLIENT_ID: optional,
  YOUTUBE_CLIENT_SECRET: optional,
  YOUTUBE_PRIVACY: z.enum(["private", "unlisted", "public"]).default("private"),
  RENDER_CONCURRENCY: optional,
});

export const env = EnvSchema.parse(process.env);

export const DATA_DIR = path.resolve(ROOT_DIR, env.DATA_DIR);

export const paths = {
  db: path.join(DATA_DIR, "clipforge.db"),
  projects: path.join(DATA_DIR, "projects"),
  sfx: path.join(DATA_DIR, "library", "sfx"),
  music: path.join(DATA_DIR, "library", "music"),
  cache: path.join(DATA_DIR, "cache"),
  secrets: path.join(DATA_DIR, "secrets"),
  exports: path.join(DATA_DIR, "exports"),
  studioDist: path.join(ROOT_DIR, "apps", "studio", "dist"),
  videoEntry: path.join(ROOT_DIR, "packages", "video", "src", "entry.ts"),
  videoSrc: path.join(ROOT_DIR, "packages", "video", "src"),
  migrations: path.join(SERVER_DIR, "drizzle"),
  project: (id: string) => path.join(DATA_DIR, "projects", id),
};

export const FILES_PREFIX = "/files";
export const internalOrigin = `http://127.0.0.1:${env.SERVER_PORT}`;
export const publicOrigin = env.PUBLIC_URL ?? `http://localhost:${env.SERVER_PORT}`;

export function relFromData(absolutePath: string): string {
  return path.relative(DATA_DIR, absolutePath).split(path.sep).join("/");
}

export function absFromData(relativePath: string): string {
  return path.join(DATA_DIR, ...relativePath.split("/"));
}

export function fileUrl(relativePath: string): string {
  return `${FILES_PREFIX}/${relativePath}`;
}
