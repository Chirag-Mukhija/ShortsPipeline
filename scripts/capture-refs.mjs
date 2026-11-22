// Records how a reference web page moves (intro frames, scroll frames, a hero still) with Remotion's headless Chrome over CDP, for the motion library research.
// Usage: node scripts/capture-refs.mjs <url> <outDir> [--frames 20] [--scrolls 6] [--delay 1500] [--step 250] [--width 1440] [--height 900]
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const [url, outDir, ...rest] = process.argv.slice(2);
if (!url || !outDir) {
  console.error("usage: node scripts/capture-refs.mjs <url> <outDir> [--frames 16] [--scrolls 6]");
  process.exit(1);
}
const opt = (name, dflt) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? Number(rest[i + 1]) : dflt;
};
const FRAMES = opt("frames", 20);
const DELAY = opt("delay", 1500);
const SCROLLS = opt("scrolls", 6);
const WIDTH = opt("width", 1440);
const HEIGHT = opt("height", 900);
const STEP_MS = opt("step", 250);

const findChrome = () => {
  const root = join(homedir(), ".cache/puppeteer/chrome-headless-shell");
  for (const ver of existsSync(root) ? readdirSync(root).sort().reverse() : []) {
    for (const plat of readdirSync(join(root, ver))) {
      const bin = join(root, ver, plat, "chrome-headless-shell");
      if (existsSync(bin)) return bin;
    }
  }
  throw new Error("No headless Chrome under ~/.cache/puppeteer (Remotion installs it on first render).");
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(outDir, { recursive: true });
const framesDir = join(outDir, "frames");
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const port = 9300 + Math.floor(Math.random() * 600);
const profile = join(tmpdir(), `refs-${port}`);
// SwiftShader so WebGL / three.js pages render without a GPU.
const chrome = spawn(findChrome(), [
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${WIDTH},${HEIGHT}`,
  "--hide-scrollbars", "--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "about:blank",
], { stdio: "ignore", detached: true });
// Chrome forks GPU and renderer helpers; kill the whole process group so nothing is left running (SwiftShader helpers burn CPU and heat the laptop).
const killChrome = () => {
  try { process.kill(-chrome.pid, "SIGKILL"); } catch {}
};
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { killChrome(); process.exit(130); });
process.on("exit", killChrome);
// Hard cap so a stuck page can never keep Chrome alive.
setTimeout(() => { console.error(`failed ${url}: timed out after 180 s`); killChrome(); process.exit(1); }, 180_000).unref();

let ws;
let seq = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId: send.session }));
  });

const shot = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
  writeFileSync(join(framesDir, name), Buffer.from(data, "base64"));
};

// Tiles frames into one image so a reader sees the motion at a glance.
const sheet = (pattern, cols, out) => {
  const files = readdirSync(framesDir).filter((f) => f.startsWith(pattern)).sort();
  if (!files.length) return;
  const rows = Math.ceil(files.length / cols);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-pattern_type", "glob", "-i", join(framesDir, `${pattern}*.jpg`),
    "-vf", `scale=480:-1,tile=${cols}x${rows}:padding=4:color=white`, "-frames:v", "1", "-q:v", "4", out]);
};

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      target = list.webSocketDebuggerUrl;
    } catch {}
  }
  if (!target) throw new Error("Chrome did not start");
  ws = new WebSocket(target);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  send.session = sessionId;
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });

  // Intro: frames from just after navigation, where load-in animations play.
  await sleep(DELAY);
  for (let i = 0; i < FRAMES; i++) {
    await shot(`a_intro_${String(i).padStart(2, "0")}.jpg`);
    await sleep(STEP_MS);
  }
  await sleep(1500);
  await shot("hero.jpg");

  // Scroll: smooth wheel steps with a few frames each, where scroll-triggered motion plays.
  for (let s = 0; s < SCROLLS; s++) {
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: WIDTH / 2, y: HEIGHT / 2, deltaX: 0, deltaY: Math.round(HEIGHT * 0.8) });
    for (let k = 0; k < 3; k++) {
      await sleep(300);
      await shot(`b_scroll_${String(s).padStart(2, "0")}_${k}.jpg`);
    }
  }
  const title = (await send("Runtime.evaluate", { expression: "document.title", returnByValue: true })).result?.value ?? "";

  execFileSync("cp", [join(framesDir, "hero.jpg"), join(outDir, "hero.jpg")]);
  sheet("a_intro_", 4, join(outDir, "intro-sheet.jpg"));
  sheet("b_scroll_", 3, join(outDir, "scroll-sheet.jpg"));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "4", "-pattern_type", "glob", "-i", join(framesDir, "*_*.jpg"),
    "-vf", "scale=960:-2", "-pix_fmt", "yuv420p", join(outDir, "motion.mp4")]);
  writeFileSync(join(outDir, "source.json"), JSON.stringify({ url, title, capturedAt: new Date().toISOString(), frameStepMs: STEP_MS }, null, 2));
  console.log(`ok ${url} -> ${outDir} (${title})`);
} catch (e) {
  console.error(`failed ${url}: ${e.message}`);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  killChrome();
  await sleep(400);
  // Chrome may still be flushing its profile; a leftover temp folder is harmless.
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {}
}
