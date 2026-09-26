// Contract every LLM provider implements: schema-constrained JSON generation with usage reporting.
import type { z } from "zod";

export type LlmRequest = {
  system: string;
  prompt: string;
  schema: z.ZodType;
  schemaName: string;
};

export type LlmRawResult = {
  data: unknown;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  readonly billed: boolean;
  generate(request: LlmRequest): Promise<LlmRawResult>;
}
