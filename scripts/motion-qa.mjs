// Checks a rendered video for motion faults that stills can't show: the whole frame shaking for seconds, single-frame flashes, black frames and long freezes. ffmpeg decodes, plain arithmetic judges; no tokens.
// Usage: node scripts/motion-qa.mjs <video.mp4> [--from s] [--to s] [--json out.json]
import { execFileSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error("Usage: node scripts/motion-qa.mjs <video.mp4> [--from s] [--to s] [--json out.json]");
  process.exit(2);
}
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i > 0 ? args[i + 1] : undefined;
};
const from = Number(opt("from") ?? 0);
const to = opt("to") === undefined ? undefined : Number(opt("to"));

// Thresholds are mean absolute frame-to-frame differences (0–255) at 480 px wide, measured on video 001:
// a calm shot with boiling pencil lines sits near 0.1 (spikes to ~1.3 on boil frames); the 4:35 shake sat at 2.2–3.8 on every frame.
const RESTLESS = 1.5;
const RESTLESS_SECONDS = 2;
const FLASH = 4;
const FROZEN = 0.02;
const FROZEN_SECONDS = 4;

const fps = (() => {
  const [n, d] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", file]).toString().trim().split("/").map(Number);
  return n / (d || 1);
})();

const range = [...(from ? ["-ss", String(from)] : []), ...(to !== undefined ? ["-t", String(to - from)] : [])];
const W = 480;
const [srcW, srcH] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]).toString().split(/[,\s]+/).filter(Boolean).map(Number);
if (!srcW || !srcH) throw new Error(`couldn't read the video size of ${file}`);
const H = Math.round((srcH * W) / srcW / 2) * 2;
const N = W * H;

// Decision: differences are measured on decoded frames here rather than with ffmpeg's tblend filter, which reported jumps between identical frames near the end of a clip.
// d[i] = mean |frame i+1 − frame i| (0–255); back[i] = mean |frame i+2 − frame i|, used to confirm flashes; dark[k] = share of near-black pixels in frame k.
const d = [];
const back = [];
const dark = [];
await new Promise((resolve, reject) => {
  const ff = spawn("ffmpeg", ["-v", "error", ...range, "-i", file, "-vf", `scale=${W}:${H},format=gray`, "-vsync", "0", "-f", "rawvideo", "-"], { stdio: ["ignore", "pipe", "inherit"] });
  let pending = Buffer.alloc(0);
  let prev = null;
  let prev2 = null;
  const take = (frame) => {
    let black = 0;
    for (let i = 0; i < N; i++) if (frame[i] < 16) black++;
    dark.push(black / N);
    if (prev) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += Math.abs(frame[i] - prev[i]);
      d.push(sum / N);
    }
    if (prev2) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += Math.abs(frame[i] - prev2[i]);
      back.push(sum / N);
    }
    prev2 = prev;
    prev = frame;
  };
  ff.stdout.on("data", (chunk) => {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (pending.length >= N) {
      take(Buffer.from(pending.subarray(0, N)));
      pending = pending.subarray(N);
    }
  });
  ff.on("error", reject);
  ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
});

const at = (i) => from + (i + 1) / fps;
const stamp = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const runs = (test, minSeconds) => {
  const out = [];
  let start = -1;
  d.forEach((v, i) => {
    if (test(v) && start < 0) start = i;
    if ((!test(v) || i === d.length - 1) && start >= 0) {
      const end = test(v) ? i : i - 1;
      if ((end - start + 1) / fps >= minSeconds) out.push([start, end]);
      start = -1;
    }
  });
  return out;
};

const flags = [];
for (const [a, b] of runs((v) => v > RESTLESS, RESTLESS_SECONDS)) {
  const mean = d.slice(a, b + 1).reduce((s, v) => s + v, 0) / (b - a + 1);
  flags.push({ level: "red", kind: "restless", from: at(a), to: at(b), detail: `the whole frame changes on every frame for ${((b - a + 1) / fps).toFixed(1)} s (mean ${mean.toFixed(1)}): shake, jitter or a move that never settles` });
}
// Two big jumps in a row among calm frames is only a candidate: a quick two-frame transition (a tick drawing on) looks the same.
// A flash is confirmed when the frame after the odd one matches the frame before it, i.e. the picture flipped and came back.
d.forEach((v, i) => {
  const next = d[i + 1] ?? 0;
  const calm = Math.max(d[i - 1] ?? 0, d[i + 2] ?? 0);
  if (!(v > FLASH && next > FLASH && Math.min(v, next) > 3 * calm)) return;
  const returned = back[i] ?? Infinity;
  if (returned < 0.35 * Math.min(v, next)) flags.push({ level: "red", kind: "flash", from: at(i), to: at(i + 1), detail: `one frame jumps out and straight back (${v.toFixed(1)}, ${next.toFixed(1)}; before vs after ${returned.toFixed(1)}): a flicker or wrong frame` });
});
// Black: at least 0.15 s where nearly every pixel is near black.
{
  let start = -1;
  dark.forEach((share, k) => {
    const isDark = share > 0.98;
    if (isDark && start < 0) start = k;
    if ((!isDark || k === dark.length - 1) && start >= 0) {
      const end = isDark ? k : k - 1;
      if ((end - start + 1) / fps >= 0.15) flags.push({ level: "red", kind: "black", from: from + start / fps, to: from + (end + 1) / fps, detail: "black frames" });
      start = -1;
    }
  });
}
for (const [a, b] of runs((v) => v < FROZEN, FROZEN_SECONDS)) {
  flags.push({ level: "yellow", kind: "frozen", from: at(a), to: at(b), detail: `nothing moves for ${((b - a + 1) / fps).toFixed(1)} s` });
}
flags.sort((x, y) => x.from - y.from);

const report = { file, fps, frames: d.length, seconds: d.length / fps, red: flags.filter((f) => f.level === "red").length, flags };
const out = opt("json");
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`${file}: ${report.seconds.toFixed(1)} s checked, ${report.red} red, ${flags.length - report.red} yellow`);
for (const f of flags) console.log(`  ${f.level.toUpperCase().padEnd(6)} ${f.kind.padEnd(8)} ${stamp(f.from)}–${stamp(f.to)}  ${f.detail}`);
process.exitCode = report.red ? 1 : 0;
