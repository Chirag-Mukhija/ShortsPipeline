// Translates Claude Code's stream-json events into the studio's live feed, the run's session id and outcome, and Pro usage readings.
import type { FeedLine, Usage } from "@clipforge/schema";

type Block = { type: string; text?: string; name?: string; input?: Record<string, unknown> };
export type StreamEvent = {
  type: string;
  subtype?: string;
  session_id?: string;
  parent_tool_use_id?: string | null;
  message?: { content?: Block[] | string };
  description?: string;
  subagent_type?: string;
  last_tool_name?: string;
  tool_name?: string;
  status?: string;
  summary?: string;
  is_error?: boolean;
  result?: string;
  total_cost_usd?: number;
  rate_limit_info?: {
    status?: string;
    resetsAt?: number;
    unifiedWindows?: { five_hour?: { utilization?: number; resetsAt?: number }; seven_day?: { utilization?: number } };
  };
  message_text?: string;
  [key: string]: unknown;
};

export type Interpreted = {
  lines: Omit<FeedLine, "at">[];
  sessionId?: string;
  usage?: Omit<Usage, "checkedAt">;
  limited?: { resetsAt: string | null };
  result?: { ok: boolean; text: string; costUsd: number | null };
};

const clip = (text: string, max = 140) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

const short = (file: unknown) => (typeof file === "string" ? file.replace(/^.*?\/(videos|\.claude)\//, "$1/") : "");

export function describeTool(name: string, input: Record<string, unknown> = {}): string {
  switch (name) {
    case "Read":
      return `reading ${short(input.file_path)}`;
    case "Write":
      return `writing ${short(input.file_path)}`;
    case "Edit":
      return `editing ${short(input.file_path)}`;
    case "WebSearch":
      return `searching the web: ${clip(String(input.query ?? ""), 90)}`;
    case "WebFetch":
      return `reading ${clip(String(input.url ?? ""), 90)}`;
    case "Bash":
      return `running ${clip(String(input.description ?? input.command ?? ""), 100)}`;
    case "Skill":
      return `opening the ${String(input.skill ?? input.command ?? "")} skill`;
    case "Agent":
    case "Task":
      return `briefing the ${String(input.subagent_type ?? "general")} agent: ${clip(String(input.description ?? ""), 80)}`;
    case "Glob":
    case "Grep":
      return `looking through files (${name.toLowerCase()})`;
    default:
      return `using ${name}`;
  }
}

const USAGE_LIMIT = /usage limit|limit reached|rate.?limit/i;

export function interpret(event: StreamEvent): Interpreted {
  const out: Interpreted = { lines: [] };
  if (event.session_id) out.sessionId = event.session_id;

  if (event.type === "system" && event.subtype === "init") out.lines.push({ kind: "start", text: "showrunner started" });

  if (event.type === "assistant" && !event.parent_tool_use_id && Array.isArray(event.message?.content)) {
    for (const block of event.message.content) {
      if (block.type === "text" && block.text?.trim()) out.lines.push({ kind: "text", text: clip(block.text, 400) });
      if (block.type === "tool_use" && block.name) {
        const agent = block.name === "Agent" || block.name === "Task";
        out.lines.push({ kind: agent ? "agent" : "tool", text: describeTool(block.name, block.input) });
      }
    }
  }

  if (event.type === "system" && event.subtype === "task_started" && event.subagent_type) {
    out.lines.push({ kind: "agent", text: `${event.subagent_type} is working: ${clip(event.description ?? "", 90)}` });
  }
  if (event.type === "system" && event.subtype === "task_progress" && event.subagent_type && event.description) {
    out.lines.push({ kind: "tool", text: `${event.subagent_type}: ${clip(event.description, 110)}` });
  }
  if (event.type === "system" && event.subtype === "permission_denied") {
    out.lines.push({ kind: "error", text: `blocked: ${event.tool_name ?? "a tool"} (not on the studio's allowlist)` });
  }

  const info = event.type === "rate_limit_event" ? event.rate_limit_info : undefined;
  if (info) {
    const resetsAt = info.unifiedWindows?.five_hour?.resetsAt ?? info.resetsAt;
    out.usage = {
      fiveHour: info.unifiedWindows?.five_hour?.utilization ?? null,
      sevenDay: info.unifiedWindows?.seven_day?.utilization ?? null,
      resetsAt: resetsAt ? new Date(resetsAt * 1000).toISOString() : null,
    };
    if (info.status && info.status !== "allowed" && info.status !== "allowed_warning") {
      out.limited = { resetsAt: out.usage.resetsAt };
    }
  }

  if (event.type === "result") {
    const text = String(event.result ?? "");
    const ok = !event.is_error && event.subtype === "success";
    out.result = { ok, text, costUsd: typeof event.total_cost_usd === "number" ? event.total_cost_usd : null };
    if (!ok && USAGE_LIMIT.test(text)) out.limited = { resetsAt: null };
    out.lines.push(ok ? { kind: "result", text: clip(text, 600) || "done" } : { kind: "error", text: clip(text, 300) || `run ended: ${event.subtype}` });
  }
  return out;
}

// Decision: a limit message without a timestamp still pauses the queue; half an hour is a safe re-check, not a guess at the reset.
export function resumeTime(limited: { resetsAt: string | null }, now = Date.now()): string {
  const parsed = limited.resetsAt ? Date.parse(limited.resetsAt) : NaN;
  return new Date(Number.isFinite(parsed) && parsed > now ? parsed + 60_000 : now + 30 * 60_000).toISOString();
}
