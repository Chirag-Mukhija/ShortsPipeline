// Picks the configured LLM provider and wraps it with schema validation, repair retries, budget checks and spend logging.
import { z } from "zod";
import { env } from "../config";
import { monthSpendInr, recordSpend } from "../db/repo";
import { StepError } from "../pipeline/errors";
import { AnthropicProvider } from "./anthropic";
import { ClaudeCliProvider } from "./claudeCli";
import { GeminiProvider } from "./gemini";
import { OpenAiProvider } from "./openai";
import type { LlmProvider } from "./types";

let cached: LlmProvider | null = null;

function requireKey(name: string, value: string | undefined): string {
  if (!value) throw new StepError(`LLM_PROVIDER needs ${name} in .env`, false);
  return value;
}

export function llmProvider(): LlmProvider {
  if (cached) return cached;
  const choice = env.LLM_PROVIDER;
  if (choice === "anthropic" || (choice === "auto" && env.ANTHROPIC_API_KEY)) {
    cached = new AnthropicProvider(requireKey("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY), env.ANTHROPIC_MODEL);
  } else if (choice === "gemini" || (choice === "auto" && env.GEMINI_API_KEY)) {
    cached = new GeminiProvider(requireKey("GEMINI_API_KEY", env.GEMINI_API_KEY), env.GEMINI_MODEL, env.GEMINI_BILLED);
  } else if (choice === "openai" || (choice === "auto" && env.OPENAI_API_KEY)) {
    cached = new OpenAiProvider(requireKey("OPENAI_API_KEY", env.OPENAI_API_KEY), env.OPENAI_MODEL);
  } else {
    cached = new ClaudeCliProvider(env.CLAUDE_CLI_MODEL, env.CLAUDE_CLI_EFFORT, env.CLAUDE_CLI_PATH);
  }
  return cached;
}

export type StructuredRequest<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  projectId: string | null;
  validate?: (data: T) => string[];
  onWarning?: (message: string) => void;
};

const MAX_ATTEMPTS = 3;

export async function generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
  const provider = llmProvider();
  let prompt = request.prompt;
  let problems: string[] = [];
  let lastValid: T | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (provider.billed && monthSpendInr() >= env.MONTHLY_BUDGET_INR) {
      throw new StepError(
        `Monthly LLM budget of ₹${env.MONTHLY_BUDGET_INR} is used up. Raise MONTHLY_BUDGET_INR or switch LLM_PROVIDER to claude-cli.`,
        false,
      );
    }
    const raw = await provider.generate({
      system: request.system,
      prompt,
      schema: request.schema,
      schemaName: request.schemaName,
    });
    recordSpend({
      projectId: request.projectId,
      provider: provider.id,
      model: provider.model,
      inputTokens: raw.inputTokens,
      outputTokens: raw.outputTokens,
      costInr: raw.costUsd * env.USD_TO_INR,
      billed: provider.billed,
    });
    const parsed = request.schema.safeParse(raw.data);
    if (parsed.success) {
      lastValid = parsed.data;
      problems = request.validate ? request.validate(parsed.data) : [];
      if (problems.length === 0) return parsed.data;
    } else {
      problems = [z.prettifyError(parsed.error)];
    }
    if (attempt < MAX_ATTEMPTS) {
      request.onWarning?.(`Attempt ${attempt} needs fixes: ${problems.slice(0, 4).join(" | ")}`);
      prompt = [
        request.prompt,
        "",
        "---",
        "Your previous answer had these problems:",
        ...problems.map((problem) => `- ${problem}`),
        "",
        "Previous answer:",
        JSON.stringify(raw.data).slice(0, 14000),
        "",
        "Return a complete corrected answer that fixes every problem.",
      ].join("\n");
    }
  }
  if (lastValid !== undefined) {
    request.onWarning?.(`Accepted with remaining issues: ${problems.slice(0, 4).join(" | ")}`);
    return lastValid;
  }
  throw new StepError(`Model output failed validation ${MAX_ATTEMPTS} times: ${problems.join(" | ").slice(0, 600)}`, false);
}
