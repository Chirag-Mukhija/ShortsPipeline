// Writes data/library/catalog.json: every motion-library theme and entry without its React parts, for the website's Library page.
// Run with tsx from packages/video so remotion resolves: ../../apps/server/node_modules/.bin/tsx ../../scripts/library-catalog.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES } from "../packages/video/src/library/index";

const out = join(dirname(fileURLToPath(import.meta.url)), "../data/library/catalog.json");
const themes = THEMES.map(({ slug, name, summary, feel, status, board, entries }) => ({
  slug,
  name,
  summary,
  feel,
  status,
  board,
  entries: entries.map(({ id, kind, title, useFor, api, seconds, origin }) => ({ id, kind, title, useFor, api, seconds, origin })),
}));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), themes }, null, 2));
console.log(`catalog: ${themes.length} themes, ${themes.reduce((n, t) => n + t.entries.length, 0)} entries`);
