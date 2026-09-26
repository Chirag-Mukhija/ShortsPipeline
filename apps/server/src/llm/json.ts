// JSON helpers for providers: zod-to-JSON-Schema conversion tuned for LLM APIs and lenient JSON extraction.
import { z } from "zod";

function rewrite(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(rewrite);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "$schema") continue;
    out[key === "oneOf" ? "anyOf" : key] = rewrite(value);
  }
  return out;
}

export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return rewrite(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })) as Record<string, unknown>;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("No JSON object found in model output");
  return JSON.parse(body.slice(start, end + 1));
}
