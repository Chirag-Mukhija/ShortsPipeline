// The motion designer's eyes: typechecks a video's scenes, then renders stills of one beat at chosen video times plus a contact sheet, into edit/stills/<beat>/.
// Usage: node scripts/render-stills.mjs <videoId> <beatId> [--at 12.4,15.2,20] [--count 8]
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { bundleEdit, prepareEdit, remotion, typecheckScenes } from "./lib/edit.mjs";

const [id, beatId, ...rest] = process.argv.slice(2);
if (!id || !beatId) {
  console.error("usage: node scripts/render-stills.mjs <videoId> <beatId> [--at 12.4,15.2] [--count 8]");
  process.exit(1);
}
const opt = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

const prep = prepareEdit(id);
const beat = prep.spec.beats.find((b) => b.id === beatId);
if (!beat) throw new Error(`No ${beatId} in edit.json (beats: ${prep.spec.beats.map((b) => b.id).join(", ")})`);

const errors = typecheckScenes(prep);
if (errors.length) {
  console.error(`Typecheck failed (${errors.length}):\n${errors.slice(0, 30).join("\n")}`);
  process.exit(1);
}

// Default: evenly spaced through the beat, plus its last frame, so entrances, holds and exits all get seen.
const count = Number(opt("count") ?? 8);
const fps = prep.spec.fps;
const times = opt("at")
  ? opt("at").split(",").map(Number).filter((t) => t >= beat.start && t < beat.end)
  : Array.from({ length: count }, (_, i) => beat.start + ((beat.end - beat.start) * (i + 0.5)) / count).concat(beat.end - 1 / fps);

const out = join(prep.editDir, "stills", beatId);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const bundled = bundleEdit(prep);
try {
  for (const t of times) {
    const frame = Math.min(Math.round(t * fps), Math.round(beat.end * fps) - 1);
    const file = join(out, `${t.toFixed(2).padStart(7, "0")}.png`);
    remotion(["still", bundled.dir, beatId, file, "--frame", String(frame), "--log", "error"]);
  }
  const pngs = readdirSync(out).filter((f) => f.endsWith(".png")).sort();
  const cols = 3;
  const inputs = pngs.flatMap((f) => ["-i", join(out, f)]);
  // Sheet order = the file names (video seconds), left to right, top to bottom; this ffmpeg has no drawtext, so times live in the names.
  const scaled = pngs.map((_, i) => `[${i}:v]scale=640:360[s${i}]`).join(";");
  const layout = pngs.map((_, i) => `${(i % cols) * 640}_${Math.floor(i / cols) * 360}`).join("|");
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", pngs.length > 1 ? `${scaled};${pngs.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${pngs.length}:layout=${layout}:fill=black` : scaled.replace("[s0]", ""), "-frames:v", "1", join(out, "_sheet.jpg")]);
  console.log(`stills ${beatId}: ${pngs.length} frames at ${times.map((t) => t.toFixed(2)).join(", ")} s → ${out}/_sheet.jpg`);
} finally {
  bundled.cleanup();
}
