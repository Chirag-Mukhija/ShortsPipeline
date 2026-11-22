// Renders preview stills (last frame and a mid-animation frame) of every motion-library entry and a contact sheet per theme into data/library/previews/.
// Usage: node scripts/library-previews.mjs [themeSlug]
// With a slug it bundles only that theme (its catalog.tsx default export), so themes being built in parallel can't break each other's previews.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pkg = join(root, "packages/video");
const out = join(root, "data/library/previews");
const only = process.argv[2];
const bundle = join(out, `.bundle-${only ?? "all"}`);

const run = (args) => execFileSync("npx", args, { cwd: pkg, stdio: ["ignore", "pipe", "inherit"] }).toString();

rmSync(bundle, { recursive: true, force: true });
let entry = "src/library/entry.tsx";
let tempEntry;
if (only) {
  const catalog = only === "core" ? "./core/core-catalog" : `./themes/${only}/catalog`;
  tempEntry = join(pkg, `src/library/.preview-${only}.tsx`);
  writeFileSync(tempEntry, `import { registerRoot } from "remotion";\nimport { GalleryRoot } from "./gallery";\nimport theme from "${catalog}";\nregisterRoot(() => <GalleryRoot themes={[theme]} />);\n`);
  entry = tempEntry;
}
try {
  run(["remotion", "bundle", entry, "--out-dir", bundle, "--log", "error"]);
} finally {
  if (tempEntry) rmSync(tempEntry, { force: true });
}
// Each row reads: <id>  <fps>  <WxH>  <frames> (<sec> sec)
const rows = run(["remotion", "compositions", bundle]).split("\n")
  .map((l) => l.trim().split(/\s+/))
  .filter((c) => c[0]?.includes("--") && Number(c[3]) > 0 && (!only || c[0].startsWith(`${only}--`)));

const byTheme = new Map();
for (const [id, , , frames] of rows) {
  const [theme, entry] = id.split("--");
  mkdirSync(join(out, theme), { recursive: true });
  const file = join(out, theme, `${entry}.png`);
  // The last frame shows the entry fully drawn.
  run(["remotion", "still", bundle, id, file, "--frame", String(Number(frames) - 1), "--log", "error"]);
  // A mid-animation frame too, so motion states get checked, not just the settled end.
  run(["remotion", "still", bundle, id, join(out, theme, `${entry}.mid.png`), "--frame", String(Math.floor(Number(frames) * 0.45)), "--log", "error"]);
  byTheme.set(theme, [...(byTheme.get(theme) ?? []), file]);
  console.log(`still ${id}`);
}

for (const [theme, files] of byTheme) {
  const cols = 4;
  const rows = Math.ceil(files.length / cols);
  const inputs = files.flatMap((f) => ["-i", f]);
  const scaled = files.map((_, i) => `[${i}:v]scale=480:270[s${i}]`).join(";");
  const layout = files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|");
  const filter = files.length > 1
    ? `${scaled};${files.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=white`
    : `[0:v]scale=480:270`;
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, "-frames:v", "1", join(out, theme, "_sheet.jpg")]);
  console.log(`sheet ${theme}: ${files.length} entries, ${rows} rows`);
}
rmSync(bundle, { recursive: true, force: true });

// Keep the website's catalog in step with the themes just previewed.
execFileSync(join(root, "apps/server/node_modules/.bin/tsx"), [join(root, "scripts/library-catalog.ts")], { cwd: pkg, stdio: "inherit" });
