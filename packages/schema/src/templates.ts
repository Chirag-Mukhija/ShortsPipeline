// Scene template catalog: LLM-facing props schemas, usage guide and the icon vocabulary every template understands.
import { z } from "zod";

export const TEMPLATE_NAMES = [
  "HookSlam",
  "KineticText",
  "Diagram",
  "CodeBlock",
  "Compare",
  "ListReveal",
  "StatCounter",
  "Media",
] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export const ICON_NAMES = [
  "cpu", "memory-stick", "hard-drive", "server", "cloud", "cloud-upload", "cloud-download", "wifi", "smartphone",
  "laptop", "monitor", "tablet", "keyboard", "mouse", "lock", "lock-open", "key", "shield", "shield-check",
  "database", "file", "file-text", "file-archive", "file-code", "folder", "folder-open", "search", "globe", "zap",
  "brain", "bug", "code", "terminal", "braces", "binary", "git-branch", "router", "satellite", "satellite-dish",
  "radio", "signal", "antenna", "credit-card", "indian-rupee", "wallet", "landmark", "banknote", "qr-code",
  "scan-line", "scan-text", "car", "map-pin", "map", "navigation", "route", "camera", "image", "video", "mic",
  "music", "headphones", "speaker", "audio-waveform", "download", "upload", "users", "user", "clock", "timer",
  "hourglass", "gauge", "battery", "battery-charging", "plug", "cable", "circuit-board", "microchip",
  "washing-machine", "package", "layers", "network", "share-2", "link", "trophy", "list-ordered", "sparkles",
  "flame", "rocket", "triangle-alert", "circle-check", "circle-x", "arrow-right", "refresh-cw", "recycle",
  "scissors", "eye", "eye-off", "fingerprint-pattern", "hash", "box", "boxes", "building", "store",
  "shopping-cart", "send", "message-square", "bell", "settings", "wrench", "hammer", "cog", "activity",
  "trending-up", "trending-down", "chart-column", "chart-pie", "percent", "infinity", "split", "merge", "funnel",
  "shuffle", "repeat", "play", "pause", "power", "thermometer", "sun", "moon", "bot", "cookie", "gamepad-2",
  "puzzle", "magnet", "atom", "dna", "languages", "mail", "phone", "card-sim", "app-window", "apple", "ear",
  "hand-coins", "receipt", "ticket", "train-front", "plane", "bike", "bus", "tv",
] as const;

const Icon = z
  .string()
  .describe("Either one emoji (e.g. 🧠) or 'lucide:<name>' using a name from the allowed icon list.");

const Tone = z.enum(["accent", "blue", "green", "red", "neutral"]);

export const HookSlamPropsSchema = z.object({
  lines: z.array(z.string()).min(1).max(3).describe("1-3 punchy lines, max 4 words each, shown huge."),
  highlight: z.array(z.string()).max(3).describe("Words from the lines to paint in the accent color."),
  icon: Icon.optional(),
  kicker: z.string().optional().describe("Tiny label above the lines, max 3 words, e.g. 'WAIT, WHAT?'."),
});

export const KineticTextPropsSchema = z.object({
  text: z.string().describe("Short on-screen phrase, max 9 words: the punchline of the narration, not a copy of it."),
  highlight: z.array(z.string()).max(3).describe("Words from text to paint in the accent color."),
  icon: Icon.optional(),
});

export const DiagramNodeSchema = z.object({
  id: z.string().describe("Short lowercase id, e.g. cpu, ram, app."),
  label: z.string().describe("Max 3 words."),
  icon: Icon.optional(),
  col: z.number().int().min(0).max(2).describe("Column 0-2 (left to right)."),
  row: z.number().int().min(0).max(4).describe("Row 0-4 (top to bottom)."),
  tone: Tone.optional(),
});

export const DiagramEdgeSchema = z.object({
  from: z.string().describe("Node id."),
  to: z.string().describe("Node id."),
  label: z.string().optional().describe("Max 2 words."),
  dashed: z.boolean().optional(),
});

export const DiagramPropsSchema = z.object({
  title: z.string().optional().describe("Max 4 words."),
  nodes: z.array(DiagramNodeSchema).min(2).max(7).describe("No two nodes may share the same col and row."),
  edges: z.array(DiagramEdgeSchema).max(8),
});

export const CodeBlockPropsSchema = z.object({
  filename: z.string().optional(),
  language: z
    .string()
    .describe("Language id: js, ts, python, bash, json, sql, html, css, c, cpp, rust, go, java, yaml."),
  code: z.string().describe("Max 12 lines and max 34 characters per line. Real, correct code."),
  focusLines: z.array(z.number().int().min(1)).max(4).optional().describe("1-based line numbers to spotlight."),
});

export const CompareSideSchema = z.object({
  title: z.string().describe("Max 3 words."),
  icon: Icon.optional(),
  points: z.array(z.string()).min(1).max(3).describe("Max 5 words each."),
});

export const ComparePropsSchema = z.object({
  left: CompareSideSchema.describe("Shown first (top card)."),
  right: CompareSideSchema.describe("Shown second (bottom card)."),
  verdict: z.string().optional().describe("Max 6 words, lands at the end."),
});

export const ListRevealPropsSchema = z.object({
  title: z.string().describe("Max 5 words."),
  items: z
    .array(z.object({ text: z.string().describe("Max 6 words."), icon: Icon.optional() }))
    .min(2)
    .max(5),
  numbered: z.boolean(),
});

export const StatCounterPropsSchema = z.object({
  value: z.number(),
  prefix: z.string().optional().describe("e.g. ₹ or $"),
  suffix: z.string().optional().describe("e.g. %, GB, x, ms"),
  decimals: z.number().int().min(0).max(2).optional(),
  label: z.string().describe("Max 6 words."),
  icon: Icon.optional(),
});

export const MediaPropsSchema = z.object({
  query: z.string().describe("2-4 word stock footage search query, concrete and visual (e.g. 'server room lights')."),
  kind: z.enum(["video", "image"]),
  overlay: z.string().optional().describe("Max 5 words shown over the footage."),
  icon: Icon.optional().describe("Shown instead when no footage is found."),
});

export type HookSlamProps = z.infer<typeof HookSlamPropsSchema>;
export type KineticTextProps = z.infer<typeof KineticTextPropsSchema>;
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;
export type DiagramProps = z.infer<typeof DiagramPropsSchema>;
export type CodeBlockProps = z.infer<typeof CodeBlockPropsSchema>;
export type CompareSide = z.infer<typeof CompareSideSchema>;
export type CompareProps = z.infer<typeof ComparePropsSchema>;
export type ListRevealProps = z.infer<typeof ListRevealPropsSchema>;
export type StatCounterProps = z.infer<typeof StatCounterPropsSchema>;
export type MediaProps = z.infer<typeof MediaPropsSchema>;

export const TEMPLATE_GUIDE: Record<TemplateName, { use: string; cues: string }> = {
  HookSlam: {
    use: "Scene 1 only. Slams the hook on screen in giant text.",
    cues: "Optional 'shake' on the most surprising word.",
  },
  KineticText: {
    use: "A punchline, definition, twist or joke as big animated text.",
    cues: "Optional 'pulse' on the key word.",
  },
  Diagram: {
    use: "How something works: systems, flows, requests, data moving between parts. The workhorse for explanations.",
    cues: "'reveal' with target node:<id> or edge:<from>-<to> to build it up as it is mentioned; 'highlight' node:<id>; 'packet' edge:<from>-<to> sends a glowing dot along an edge. Anything never revealed by a cue is visible from the start.",
  },
  CodeBlock: {
    use: "Real code, commands or config the narration talks about.",
    cues: "'highlight' with target line:<n> to spotlight a line when it is mentioned.",
  },
  Compare: {
    use: "A vs B contrasts (Mac vs Windows, SIM vs eSIM).",
    cues: "'reveal' with target left, right or verdict. Without cues they appear in order.",
  },
  ListReveal: {
    use: "Steps, reasons, or 'N ways' lists.",
    cues: "'reveal' with target item:<n> (1-based) as each item is mentioned. Without cues items appear evenly.",
  },
  StatCounter: {
    use: "One striking number that counts up.",
    cues: "Optional 'pulse' when the number lands.",
  },
  Media: {
    use: "Real-world stock footage or photo to ground an idea. Only when stock footage is available.",
    cues: "Optional 'zoom' punch-in.",
  },
};
