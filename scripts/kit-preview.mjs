// Renders a kit template's example to data/library/kit/previews/<id>.mp4 (half size), makes a six-frame contact sheet <id>.jpg, and runs the motion check on it.
// Usage: node scripts/kit-preview.mjs <templateId> [--style studio|hand-drawn|night|film] [--split]  (--split renders the 1000×1080 panel version)
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pkg = join(root, "packages/video");
const out = join(root, "data/library/kit/previews");
const id = process.argv[2];
const si = process.argv.indexOf("--style");
const style = si > 0 ? process.argv[si + 1] : "studio";
const split = process.argv.includes("--split");
if (!id) {
  console.error("Usage: node scripts/kit-preview.mjs <templateId> [--style studio|hand-drawn|night|film]");
  process.exit(2);
}

const work = join(tmpdir(), `kit-${id}-${Date.now()}`);
const pub = `${work}-public`;
mkdirSync(out, { recursive: true });
cpSync(join(root, "data/library/kit/demo-media"), join(pub, "media"), { recursive: true });
const npx = (args) => execFileSync("npx", args, { cwd: pkg, stdio: ["ignore", "pipe", "inherit"] }).toString();
const name = `${id}${split ? ".split" : ""}${style === "studio" ? "" : `.${style}`}`;
const mp4 = join(out, `${name}.mp4`);
try {
  npx(["remotion", "bundle", "src/kit/entry.tsx", "--out-dir", work, "--public-dir", pub, "--log", "error"]);
  // Half size and two threads keep the laptop cool; the check's thresholds are measured at 480 px wide, so half size loses nothing.
  npx(["remotion", "render", work, `kit--${id}${split ? "--split" : ""}`, mp4, "--scale", "0.5", "--concurrency", "2", "--props", JSON.stringify({ style }), "--log", "error"]);
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(pub, { recursive: true, force: true });
}
const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString());
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-vf", `fps=${(6 / seconds).toFixed(4)},scale=640:-2,tile=3x2:padding=6:color=white`, "-frames:v", "1", join(out, `${name}.jpg`)]);
console.log(`preview: data/library/kit/previews/${name}.mp4 and .jpg (${seconds.toFixed(1)} s)`);
try {
  console.log(execFileSync("node", [join(root, "scripts/motion-qa.mjs"), mp4]).toString().trim());
} catch (error) {
  console.log(String(error.stdout ?? "").trim());
  process.exitCode = 1;
}
