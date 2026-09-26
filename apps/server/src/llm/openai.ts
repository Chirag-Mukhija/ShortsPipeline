// LLM provider for the OpenAI Responses API with JSON-schema formatted output over REST.
import { extractJson, toJsonSchema } from "./json";
import { estimateCostUsd } from "./pricing";
import type { LlmProvider, LlmRawResult, LlmRequest } from "./types";

type OpenAiResponse = {
  output?: { type: string; content?: { type: string; text?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

export class OpenAiProvider implements LlmProvider {
  readonly id = "openai";
  readonly billed = true;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async generate(request: LlmRequest): Promise<LlmRawResult> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        instructions: request.system,
        input: request.prompt,
        max_output_tokens: 16000,
        text: {
          format: { type: "json_schema", name: request.schemaName, schema: toJsonSchema(request.schema), strict: false },
        },
      }),
    });
    const body = (await response.json()) as OpenAiResponse;
    if (!response.ok) throw new Error(`OpenAI ${response.status}: ${body.error?.message ?? "request failed"}`);
    const text = (body.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text ?? "")
      .join("");
    if (!text) throw new Error("OpenAI returned no output text");
    const inputTokens = body.usage?.input_tokens ?? 0;
    const outputTokens = body.usage?.output_tokens ?? 0;
    return {
      data: extractJson(text),
      inputTokens,
      outputTokens,
      costUsd: estimateCostUsd(this.model, inputTokens, outputTokens),
    };
  }
}
