// Checks a video's upload package (package/upload.json) before it goes to YouTube: the metadata rules (chapters, credits, tags, title), the final video file and the thumbnail (1280×720 or larger 16:9, under 2 MB). Exits 1 on red problems.
// Usage: pnpm package:check <videoId> [--json]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { checkUpload, type PackageIssue } from "../packages/schema/src/package";
import { tracks } from "./lib/music";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const videosRoot = process.env.STUDIO_VIDEOS_DIR ? path.resolve(process.env.STUDIO_VIDEOS_DIR) : path.join(root, "videos");
const id = process.argv[2];
if (!id) {
  console.error("Usage: pnpm package:check <videoId> [--json]");
  process.exit(2);
}
const dir = path.join(videosRoot, id);
const file = path.join(dir, "package/upload.json");
if (!existsSync(file)) {
  console.error(`No package/upload.json for ${id} yet.`);
  process.exit(1);
}
const upload = JSON.parse(readFileSync(file, "utf8"));
const probe = (f: string, entries: string) => execFileSync("ffprobe", ["-v", "error", ...entries.split(" "), "-of", "csv=p=0", f]).toString().trim();

// Licence credits: the music track of the beat edit (edit.json) or the Cut plan (cut.json), whichever is set.
const credits: string[] = [];
for (const plan of ["edit/edit.json", "edit/cut.json"]) {
  const p = path.join(dir, plan);
  if (!existsSync(p)) continue;
  const music = JSON.parse(readFileSync(p, "utf8")).music;
  // The library's attribution is what the licence needs; a plan's own copy could be wrong.
  const credit = tracks().find((t) => t.id === music?.trackId)?.attribution ?? music?.credit;
  if (credit && !credits.includes(credit)) credits.push(credit);
}

const extra: PackageIssue[] = [];
const video = typeof upload.file === "string" ? path.join(dir, upload.file) : "";
let duration = 0;
if (video && existsSync(video)) duration = Number(probe(video, "-show_entries format=duration"));
else extra.push({ level: "red", rule: "file", message: `the video file ${upload.file} doesn't exist yet` });
if (!duration) {
  const narration = path.join(dir, "record/narration.json");
  if (existsSync(narration)) duration = JSON.parse(readFileSync(narration, "utf8")).duration;
}
const thumb = typeof upload.thumbnail === "string" ? path.join(dir, upload.thumbnail) : "";
if (thumb && existsSync(thumb)) {
  const [w, h] = probe(thumb, "-show_entries stream=width,height").split(",").map(Number);
  if (!w || !h || w < 1280 || Math.abs(w / h - 16 / 9) > 0.01) extra.push({ level: "red", rule: "thumbnail", message: `${w}×${h}; YouTube wants 16:9 at 1280×720 or larger` });
  if (statSync(thumb).size > 2 * 1024 * 1024) extra.push({ level: "red", rule: "thumbnail", message: `${(statSync(thumb).size / 1048576).toFixed(1)} MB; YouTube's limit is 2 MB` });
} else extra.push({ level: "red", rule: "thumbnail", message: `the thumbnail ${upload.thumbnail} doesn't exist yet` });

const report = checkUpload(upload, { duration, credits });
const issues = [...report.issues, ...extra];
const reds = issues.filter((i) => i.level === "red").length;
if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: reds === 0, issues }, null, 2));
else {
  console.log(`package/upload.json: ${reds} red, ${issues.length - reds} yellow · "${upload.title}" · ${Math.round(duration)} s`);
  for (const i of issues) console.log(`  ${i.level.toUpperCase().padEnd(6)} ${i.rule.padEnd(10)} ${i.message}`);
}
process.exitCode = reds === 0 ? 0 : 1;
