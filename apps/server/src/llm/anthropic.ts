// LLM provider for the Anthropic API via the official SDK, using structured outputs parsed against the zod schema.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { StepError } from "../pipeline/errors";
import { estimateCostUsd } from "./pricing";
import type { LlmProvider, LlmRawResult, LlmRequest } from "./types";

const FALLBACK_MODELS = new Set(["claude-opus-5", "claude-fable-5-1"]);

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  readonly billed = true;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(request: LlmRequest): Promise<LlmRawResult> {
    // Decision: server-side refusal fallbacks are enabled for the models that support them, so a policy decline reroutes instead of failing the step.
    const fallback = FALLBACK_MODELS.has(this.model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {};
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
      output_config: { format: betaZodOutputFormat(request.schema) },
      ...fallback,
    });
    if (response.stop_reason === "refusal") throw new StepError("Claude declined this request", false);
    if (response.stop_reason === "max_tokens") throw new Error("Claude hit max_tokens before finishing");
    return {
      data: response.parsed_output,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCostUsd(this.model, response.usage.input_tokens, response.usage.output_tokens),
    };
  }
}
