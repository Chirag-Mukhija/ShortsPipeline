// LLM provider for the Gemini API (free tier friendly) using JSON-schema constrained generation over REST.
import { extractJson, toJsonSchema } from "./json";
import type { LlmProvider, LlmRawResult, LlmRequest } from "./types";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { message?: string };
};

export class GeminiProvider implements LlmProvider {
  readonly id = "gemini";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    readonly billed: boolean,
  ) {}

  async generate(request: LlmRequest): Promise<LlmRawResult> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: toJsonSchema(request.schema),
            maxOutputTokens: 16000,
          },
        }),
      },
    );
    const body = (await response.json()) as GeminiResponse;
    if (!response.ok) throw new Error(`Gemini ${response.status}: ${body.error?.message ?? "request failed"}`);
    const text = (body.candidates?.[0]?.content?.parts ?? [])
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("");
    if (!text) throw new Error(`Gemini returned no text (finish reason ${body.candidates?.[0]?.finishReason ?? "unknown"})`);
    const usage = body.usageMetadata ?? {};
    return {
      data: extractJson(text),
      inputTokens: usage.promptTokenCount ?? 0,
      outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
      costUsd: 0,
    };
  }
}
