// Writes the kit's menu card: data/library/kit/MENU.md (short, what an agent reads first) and catalog.json (every template's exact props as JSON Schema), so a video agent finds a starting point without opening every template file.
// Usage: pnpm kit:catalog   (re-run after templates change; the kit queue output is picked up automatically)
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { KIT, toJSONSchema } from "../packages/video/src/kit/index";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "data/library/kit");

type Json = { type?: string | string[]; enum?: unknown[]; maxLength?: number; maxItems?: number; minimum?: number; maximum?: number; description?: string; items?: Json; properties?: Record<string, Json>; required?: string[]; anyOf?: Json[]; default?: unknown };

// One short line per prop: name, shape and limit, then its description cut to fit a menu.
function shape(s: Json): string {
  if (s.anyOf) return s.anyOf.map(shape).filter((x) => x !== "null").join(" | ");
  if (s.enum) return s.enum.map(String).join(" | ");
  if (s.type === "array") return `${s.items?.properties ? `{${Object.keys(s.items.properties).join(", ")}}` : shape(s.items ?? {})}[]${s.maxItems ? ` ≤ ${s.maxItems}` : ""}`;
  if (s.type === "object" && s.properties) return `{${Object.keys(s.properties).join(", ")}}`;
  if (s.type === "string") return `text${s.maxLength ? ` ≤ ${s.maxLength}` : ""}`;
  if (s.type === "number" || s.type === "integer") return `number${s.minimum !== undefined || s.maximum !== undefined ? ` ${s.minimum ?? ""}–${s.maximum ?? ""}` : ""}`;
  return String(s.type ?? "value");
}
const short = (text = "", max = 90) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const templates = KIT.map((t) => {
  const schema = toJSONSchema(t.schema, { unrepresentable: "any" }) as Json;
  const file = `packages/video/src/kit/templates/${t.id}.tsx`;
  const sheet = `data/library/kit/previews/${t.id}.jpg`;
  return {
    id: t.id,
    title: t.title,
    mode: t.mode,
    layouts: t.layouts,
    useFor: t.useFor,
    avoid: t.avoid,
    seconds: t.seconds,
    mediaSlots: t.mediaSlots,
    status: t.status,
    credit: t.credit ?? null,
    file,
    preview: existsSync(path.join(ROOT, sheet)) ? sheet : null,
    propsBrief: Object.entries(schema.properties ?? {}).map(([name, s]) => `${name}${schema.required?.includes(name) ? "" : "?"}: ${shape(s)}${s.description ? ` · ${short(s.description)}` : ""}`),
    props: schema,
    example: t.example,
  };
});

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "catalog.json"), `${JSON.stringify({ generated: new Date().toISOString(), count: templates.length, templates }, null, 2)}\n`);

const lines = [
  "# Kit menu card",
  "",
  `${templates.length} scene templates (generated ${new Date().toISOString().slice(0, 10)} by \`pnpm kit:catalog\`; don't edit by hand).`,
  "",
  "**These are starting points, not a menu to fill.** For each moment of a video, decide what it should look like first. Then look here for the closest template to start from: use it as is only if it truly fits, otherwise copy its code into the video's scenes and adapt it (layout, look, motion, content). Never pick a moment's visual because a template for it exists. Full props: `catalog.json`. Code: the file named in each entry.",
  "",
];
// Decision: the menu is one row per template (a few tokens each) so it stays cheap to read on every video; the details live in catalog.json and are opened only for a chosen template.
const firstSentence = (text: string) => short(text.split(/(?<=[.!?])\s/)[0] ?? text, 150).replace(/\|/g, "/");
lines.push("| Template | What it is | Mode | Fits | Media |", "|---|---|---|---|---|");
for (const t of templates) lines.push(`| \`${t.id}\` | ${firstSentence(t.useFor)} | ${t.mode} | ${t.layouts.join(", ")} | ${t.mediaSlots} |`);
lines.push("", "Details for one template (props, limits, example, what to avoid): its entry in `catalog.json`, which also has `propsBrief`.");
writeFileSync(path.join(OUT, "MENU.md"), `${lines.join("\n")}\n`);
console.log(`kit menu: ${templates.length} templates → data/library/kit/MENU.md and catalog.json`);
