// LLM provider that runs the Claude Code CLI headlessly, using the user's Claude plan instead of an API key.
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { exec } from "../lib/exec";
import { extractJson, toJsonSchema } from "./json";
import type { LlmProvider, LlmRawResult, LlmRequest } from "./types";

const PASS_THROUGH = [
  "HOME",
  "PATH",
  "USER",
  "LOGNAME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "TMPDIR",
  "TERM",
  "CLAUDE_CONFIG_DIR",
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "NO_PROXY",
  "NODE_EXTRA_CA_CERTS",
];

// Decision: the child gets a minimal environment and only project settings (none exist in its temp cwd), so a parent session's variables and the user's personal hooks never touch pipeline calls.
function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of PASS_THROUGH) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

type CliOutput = {
  is_error?: boolean;
  subtype?: string;
  result?: string;
  structured_output?: unknown;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
};

export class ClaudeCliProvider implements LlmProvider {
  readonly id = "claude-cli";
  readonly billed = false;

  constructor(
    readonly model: string,
    private readonly effort: string,
    private readonly bin: string,
  ) {}

  async generate(request: LlmRequest): Promise<LlmRawResult> {
    const workDir = path.join(os.tmpdir(), "clipforge-llm");
    mkdirSync(workDir, { recursive: true });
    const args = [
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(toJsonSchema(request.schema)),
      "--tools",
      "",
      "--model",
      this.model,
      "--effort",
      this.effort,
      "--no-session-persistence",
      "--strict-mcp-config",
      "--setting-sources",
      "project",
      "--system-prompt",
      request.system,
    ];
    const result = await exec(this.bin, args, {
      input: request.prompt,
      cwd: workDir,
      env: cleanEnv(),
      timeoutMs: 10 * 60_000,
    });
    let output: CliOutput;
    try {
      output = JSON.parse(result.stdout) as CliOutput;
    } catch {
      throw new Error(
        `claude CLI returned non-JSON output (exit ${result.code}): ${(result.stderr || result.stdout).trim().slice(-600)}`,
      );
    }
    if (output.is_error || result.code !== 0) {
      throw new Error(`claude CLI error (${output.subtype ?? result.code}): ${output.result ?? result.stderr.slice(-600)}`);
    }
    const data = output.structured_output ?? (output.result ? extractJson(output.result) : undefined);
    if (data === undefined) throw new Error("claude CLI returned no structured output");
    const usage = output.usage ?? {};
    return {
      data,
      inputTokens:
        (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
      outputTokens: usage.output_tokens ?? 0,
      costUsd: output.total_cost_usd ?? 0,
    };
  }
}
