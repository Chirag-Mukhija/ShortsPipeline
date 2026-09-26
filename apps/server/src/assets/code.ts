// Syntax-highlights storyboard code with Shiki on the server so the video only renders pre-colored tokens.
import type { CodeToken } from "@clipforge/schema";
import { bundledLanguages, codeToTokens, type BundledLanguage } from "shiki";

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  terminal: "bash",
  console: "bash",
  yml: "yaml",
  "c++": "cpp",
  "c#": "csharp",
  golang: "go",
  rs: "rust",
  kt: "kotlin",
};

const THEME = "one-dark-pro";

function resolveLanguage(language: string): BundledLanguage | null {
  const key = language.trim().toLowerCase();
  const name = ALIASES[key] ?? key;
  return name in bundledLanguages ? (name as BundledLanguage) : null;
}

export async function highlightCode(code: string, language: string): Promise<{ tokens: CodeToken[][]; background: string }> {
  const lang = resolveLanguage(language);
  if (!lang) {
    return { tokens: code.split("\n").map((line) => [{ text: line, color: "#E6EAF2" }]), background: "" };
  }
  const result = await codeToTokens(code, { lang, theme: THEME });
  return {
    tokens: result.tokens.map((line) => line.map((token) => ({ text: token.content, color: token.color ?? "#E6EAF2" }))),
    background: "",
  };
}
