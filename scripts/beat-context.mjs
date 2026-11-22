// Builds the motion designer's context pack for one beat (edit/context/<beat>.md): the beat's script and cues, its spoken words with times, the video's shared style and whole-video notes, sketches, footage slots, creator decisions and the theme's catalog.
// Usage: node scripts/beat-context.mjs <videoId> <beatId>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { prepareEdit, root } from "./lib/edit.mjs";

const [id, beatId] = process.argv.slice(2);
if (!id || !beatId) {
  console.error("usage: node scripts/beat-context.mjs <videoId> <beatId>");
  process.exit(1);
}
const prep = prepareEdit(id);
const { spec, videoDir, editDir } = prep;
const beat = spec.beats.find((b) => b.id === beatId);
if (!beat) throw new Error(`No ${beatId} in edit.json`);
const n = Number(beatId.replace(/\D/g, ""));
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

// The script's "## Beat N…" section (a cue sheet on music-only videos uses the same headings).
const section = (md, num) => {
  const re = new RegExp(`^## Beat ${num}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |\\Z)`, "m");
  return md.match(re)?.[0]?.trim() ?? "";
};
const script = section(read(join(videoDir, "script.md")), n);
const spoken = section(read(join(videoDir, "record/transcript.md")), n);

// Spoken words inside the beat's time range, as word@seconds.
const narration = existsSync(join(videoDir, spec.narration.replace(/\.wav$/, ".json"))) ? JSON.parse(read(join(videoDir, spec.narration.replace(/\.wav$/, ".json")))) : { words: [] };
const words = narration.words.filter((w) => w.start >= beat.start && w.start < beat.end).map((w) => `${w.text}@${w.start.toFixed(2)}`);

// Sketches and attachments meant for this beat, plus everything sent as part of the idea.
const inbox = existsSync(join(videoDir, "inbox/index.json")) ? JSON.parse(read(join(videoDir, "inbox/index.json"))) : [];
const forBeat = inbox.filter((i) => new RegExp(`\\bbeat\\s*${n}\\b`, "i").test(i.note ?? "") || /^whole video\b/i.test(i.note ?? "") || i.intent === "part of the idea");

// The guardrail: the video's shared style file, and the creator's open notes about the whole video.
const style = read(join(editDir, "scenes", "style.ts"));
const notes = existsSync(join(editDir, "notes.json")) ? JSON.parse(read(join(editDir, "notes.json"))) : [];
const wholeVideo = notes.filter((x) => x.scope === "video");

const decisions = (read(join(videoDir, "status.md")).match(/## Creator decisions\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? "").trim();
const catalog = existsSync(join(root, "data/library/catalog.json")) ? JSON.parse(read(join(root, "data/library/catalog.json"))) : { themes: [] };
const theme = catalog.themes.find((t) => t.slug === spec.theme);
const core = catalog.themes.find((t) => t.slug === "core");
const footage = (spec.footage ?? []).filter((f) => f.beat === beatId);
const rel = (p) => relative(root, p);

const lines = [
  `# Context: ${id} · ${beatId}${beat.label ? ` (${beat.label})` : ""}`,
  "",
  `- Time range: **${beat.start.toFixed(2)}–${beat.end.toFixed(2)} s** of video time (scenes read video time with \`useTime()\`; show nothing outside this range).`,
  `- Scene file to write: \`${rel(join(editDir, beat.scene))}\`, default-exporting the beat component.`,
  `- Theme: **${spec.theme ?? "not chosen"}**${theme ? ` — ${theme.summary}` : ""}. Import from \`@library/themes/${spec.theme}\` and \`@library/core\`.`,
  `- Check your work: \`node scripts/render-stills.mjs ${id} ${beatId}\` (typecheck + stills + \`${rel(join(editDir, "stills", beatId))}/_sheet.jpg\`). Use \`--at <times>\` for the key word moments.`,
  "",
  "## The script for this beat",
  script || "_(no matching section in script.md)_",
  "",
  "## What was actually said (wins over the script)",
  spoken || "_(no transcript section)_",
  "",
  "## Spoken words with start times (seconds) — land visuals 3–6 frames before the word",
  words.join(" ") || "_(no words in range)_",
  "",
  "## The video's shared style (`edit/scenes/style.ts`: import `STYLE` from `./style`; never hardcode a colour)",
  style ? "```ts\n" + style.trim() + "\n```" : "_(no style.ts yet: write it first, following the playbook's style step)_",
  "",
  "## Whole-video notes from the creator (standing direction for every beat)",
  ...(wholeVideo.length ? wholeVideo.map((x) => `- ${x.status === "done" ? "(applied) " : ""}${x.text}`) : ["_(none)_"]),
  "",
  "## Creator decisions (respect all of them)",
  decisions || "_(none)_",
  "",
  "## Sketches and attachments for this beat",
  ...(forBeat.length
    ? forBeat.map((i) => `- \`videos/${id}/inbox/${i.file}\` (${i.intent})${i.note ? `: "${i.note}"` : ""}${existsSync(join(videoDir, "inbox", `${i.file}.frames.jpg`)) ? ` · frames: \`inbox/${i.file}.frames.jpg\`` : ""}`)
    : ["_(none)_"]),
  "",
  "## Approved shots for this beat (the brief: build these, in this order; DIRECTION.md applies)",
  ...((spec.shots ?? []).filter((x) => x.beat === beatId).length
    ? (spec.shots ?? []).filter((x) => x.beat === beatId).sort((a, b) => a.at - b.at).map((x, i) => `${i + 1}. at ${x.at.toFixed(2)} s · ${x.size} · ${x.move} · **${x.subject}** ${x.action}${x.text ? ` · text: "${x.text}"` : ""}${x.transitionOut ? ` · out: ${x.transitionOut}` : ""}`)
    : ["_(no shots planned: plan them following DIRECTION.md before building)_"]),
  "",
  "## Footage slots for this beat (never use raw: frame, crop, zoom and grade it in the theme's style; empty slots render a labelled placeholder)",
  ...(footage.length ? footage.map((f) => `- \`${f.id}\`: ${f.need}${f.file ? ` → \`staticFile("${f.file}")\`` : " (not uploaded yet)"}${f.in != null ? `, in ${f.in}s` : ""}${f.out != null ? `, out ${f.out}s` : ""}${f.speed ? `, speed ${f.speed}×` : ""}`) : ["_(none)_"]),
  "",
  `## Theme catalog: ${theme?.name ?? spec.theme} (preview stills in \`data/library/previews/${spec.theme}/\`)`,
  ...(theme ? theme.entries.map((e) => `- **${e.id}** (${e.kind}) — ${e.useFor}\n  \`${e.api}\``) : ["_(theme not in the catalog; build it fresh in a new theme folder)_"]),
  "",
  "## Core (any theme)",
  ...(core ? core.entries.map((e) => `- **${e.id}** — ${e.useFor} \`${e.api}\``) : []),
  "",
  "## Rules",
  "- Frame-driven only (`useTime`, `interpolate`, `spring`, `Easing`); seeded randomness; no CSS transitions, timers or wall-clock code.",
  "- Reuse catalog pieces where they fit perfectly; make new pieces only where nothing fits, and keep them in the scene file (they may be promoted to the library after the rough cut).",
  "- Readable at 1080p: body ≥ 36 px, labels ≥ 28 px, 96 px safe margins, nothing clipped. Never invent numbers or quotes: every figure comes from the script.",
  "- Quality bar: `packages/video/src/oneshot/Beats12.tsx` (video 001 Beats 1–2) — the creator scored it top on every point.",
];
mkdirSync(join(editDir, "context"), { recursive: true });
const out = join(editDir, "context", `${beatId}.md`);
writeFileSync(out, lines.join("\n") + "\n");
console.log(`context ${beatId}: ${words.length} words, ${forBeat.length} attachments, ${footage.length} footage slots, ${theme?.entries.length ?? 0} theme entries → ${rel(out)}`);
