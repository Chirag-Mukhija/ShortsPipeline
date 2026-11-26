// Checks a Cut plan (edit.json version 2) against the real kit before anything renders: every second covered, templates exist and fit, props valid, media present, no repetition, and the face/graphics/footage mix. Exits 1 on red problems.
// Usage: pnpm cut:check <path/to/edit.json> [--json]
import { readFileSync } from "node:fs";
import { checkCut } from "../packages/schema/src/cut";
import { cutContext } from "./lib/cut-kit";

const file = process.argv[2];
if (!file) {
  console.error("Usage: pnpm cut:check <path/to/edit.json> [--json]");
  process.exit(2);
}
const plan = JSON.parse(readFileSync(file, "utf8"));
const ctx = cutContext(file);
const report = checkCut(plan, ctx);

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  console.log(`${file}: ${report.red} red, ${report.yellow} yellow · mix: face ${pct(report.mix.face)}, graphics ${pct(report.mix.graphic)}, footage ${pct(report.mix.footage)}`);
  for (const i of report.issues) {
    const at = i.at !== undefined ? `${Math.floor(i.at / 60)}:${(i.at % 60).toFixed(1).padStart(4, "0")}` : "     ";
    console.log(`  ${i.level.toUpperCase().padEnd(6)} ${at}  ${(i.segment ?? "").padEnd(10)} ${i.rule.padEnd(9)} ${i.message}`);
  }
}
process.exitCode = report.ok ? 0 : 1;
