// Assembles a video's edit: renders each beat as its own cached clip (only changed beats re-render), joins them, and mixes narration with a music bed that ducks under the voice.
// Usage: node scripts/assemble.mjs <videoId> [--final | --animatic] [--beats beat-01,beat-02] [--concurrency 4]
// --animatic renders the storyboard (planned shots as a moving camera over labelled subjects) to renders/animatic.mp4 with the narration only.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { bundleEdit, pkg, prepareEdit, remotion, root, run } from "./lib/edit.mjs";
import { musicGainAt, speechSpansFromPeaks } from "../packages/schema/src/mix.ts";

const args = process.argv.slice(2);
const id = args[0];
if (!id || id.startsWith("--")) {
  console.error("usage: node scripts/assemble.mjs <videoId> [--final] [--beats beat-01,beat-02] [--concurrency 4]");
  process.exit(1);
}
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const quality = flag("animatic") ? "animatic" : flag("final") ? "final" : "preview";
const onlyBeats = opt("beats", "")?.split(",").filter(Boolean) ?? [];
const concurrency = opt("concurrency", "4");

const prep = prepareEdit(id);
const { videoDir, editDir, spec } = prep;
// A library track's audio file (data/library/music/tracks.json lists what's downloaded).
const musicFile = (trackId) => {
  const dir = join(root, "data/library/music");
  const tracks = existsSync(join(dir, "tracks.json")) ? JSON.parse(readFileSync(join(dir, "tracks.json"), "utf8")) : [];
  const t = tracks.find((x) => x.id === trackId);
  if (!t?.file) throw new Error(`Music track "${trackId}" isn't in the music library yet (add its file on the Library page).`);
  return join(dir, t.file);
};

// Hash a file tree's contents, so a beat re-renders when its scene, its shared files or the library change.
const hashTree = (dir, h) => {
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) hashTree(p, h);
    else h.update(name).update(readFileSync(p));
  }
};
// The animatic only uses the long-form engine; real beats also depend on the whole motion library.
const libraryHash = createHash("sha1");
if (quality !== "animatic") hashTree(join(pkg, "src/library"), libraryHash);
hashTree(join(pkg, "src/long"), libraryHash);
const libDigest = libraryHash.digest("hex");

const scratch = join(videoDir, "renders", ".assemble");
mkdirSync(scratch, { recursive: true });
const t0 = Date.now();
const bundled = bundleEdit(prep);
const bundle = bundled.dir;
try {
  const clipsDir = join(videoDir, "renders", "beats", quality);
  mkdirSync(clipsDir, { recursive: true });
  const clips = [];
  for (const beat of spec.beats) {
    const h = createHash("sha1").update(libDigest).update(JSON.stringify([beat.id, beat.scene, beat.start, beat.end])).update(String(spec.fps)).update(quality);
    if (quality === "animatic") {
      // The animatic depends only on this beat's planned shots (plus the engine, in libDigest).
      h.update(JSON.stringify((spec.shots ?? []).filter((s) => s.beat === beat.id)));
    } else {
    // Its own scene file plus the shared ones (anything in scenes/ not named beat-NN), never the other beats.
    const sceneFile = join(editDir, beat.scene);
    h.update(existsSync(sceneFile) ? readFileSync(sceneFile) : `placeholder:${beat.label ?? beat.id}`);
    for (const name of readdirSync(join(editDir, "scenes")).sort()) {
      if (/^beat-\d+/.test(name) || name.startsWith(".")) continue;
      const p = join(editDir, "scenes", name);
      if (statSync(p).isDirectory()) hashTree(p, h);
      else h.update(name).update(readFileSync(p));
    }
    }
    const digest = h.digest("hex").slice(0, 12);
    const clip = join(clipsDir, `${beat.id}-${digest}.mp4`);
    const first = Math.round(beat.start * spec.fps);
    const last = Math.round(beat.end * spec.fps) - 1;
    const forced = onlyBeats.includes(beat.id);
    if (!existsSync(clip) || forced) {
      const started = Date.now();
      remotion([
        "render", bundle, quality === "animatic" ? `animatic-${beat.id}` : beat.id, clip,
        `--frames=${first}-${last}`, "--muted", "--concurrency", concurrency, "--log", "error",
        ...(quality === "final" ? [] : ["--scale", "0.5"]),
      ]);
      // Older clips of this beat are stale once a new one exists.
      for (const old of readdirSync(clipsDir)) if (old.startsWith(`${beat.id}-`) && old !== clip.split("/").pop()) rmSync(join(clipsDir, old));
      console.log(`rendered ${beat.id} (${last - first + 1} frames) in ${((Date.now() - started) / 1000).toFixed(0)} s`);
    } else {
      console.log(`cached   ${beat.id}`);
    }
    clips.push(clip);
  }

  // Join the clips without re-encoding: every clip was rendered with the same settings.
  const list = join(scratch, "clips.txt");
  writeFileSync(list, clips.map((c) => `file '${c}'`).join("\n"));
  const silent = join(scratch, "video.mp4");
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent], root);

  // Audio. Previews carry only the narration: the Edit page mixes voice and music live in the browser, so changing a level never rewrites a file.
  // The final export bakes the mix once, with the same volume curve the live player uses (packages/schema/src/mix.ts).
  const out = join(videoDir, "renders", `${quality}.mp4`);
  const narration = join(videoDir, spec.narration);
  const mix = { voiceDb: 0, musicDb: -6, duckDb: 8, musicOn: true, musicStart: 0, fadeIn: 2, fadeOut: 3, ...(spec.mix ?? {}) };
  const track = quality === "final" && spec.music && mix.musicOn ? musicFile(spec.music.trackId) : null;
  const dur = String(spec.duration);
  const voiceGain = quality === "final" ? Math.pow(10, mix.voiceDb / 20).toFixed(4) : "1";
  if (track) {
    // The music bed: decoded from its start point, looped to length, then shaped sample by sample by the shared curve.
    const rate = 48000;
    const raw = execFileSync("ffmpeg", ["-v", "error", "-stream_loop", "-1", "-ss", String(mix.musicStart), "-i", track, "-t", dur, "-f", "s16le", "-ac", "2", "-ar", String(rate), "pipe:1"], { maxBuffer: 1024 * 1024 * 1024 });
    // Same peaks the Edit page's live player uses: 1000 Hz u8, max |sample| per 100 ms.
    const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", narration, "-ac", "1", "-ar", "1000", "-f", "u8", "pipe:1"], { maxBuffer: 1 << 28 });
    const peaks = [];
    for (let i = 0; i < pcm.length; i += 100) {
      let p = 0;
      for (let j = i; j < Math.min(i + 100, pcm.length); j++) p = Math.max(p, Math.abs(pcm[j] - 128) / 128);
      peaks.push(p);
    }
    const spans = speechSpansFromPeaks(peaks);
    const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
    const block = rate / 100;
    for (let i = 0; i < samples.length / 2; i += block) {
      const g = musicGainAt(i / rate, spec.duration, mix, spans);
      for (let j = i * 2; j < Math.min((i + block) * 2, samples.length); j++) samples[j] = Math.max(-32768, Math.min(32767, Math.round(samples[j] * g)));
    }
    const bed = join(scratch, "bed.raw");
    writeFileSync(bed, Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
    const filter = [`[1:a]atrim=0:${dur},asetpts=N/SR/TB,volume=${voiceGain},aresample=${rate},aformat=channel_layouts=stereo[voice]`, `[voice][2:a]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.97[mix]`].join(";");
    run("ffmpeg", ["-v", "error", "-y", "-i", silent, "-i", narration, "-f", "s16le", "-ar", String(rate), "-ac", "2", "-i", bed, "-filter_complex", filter, "-map", "0:v", "-map", "[mix]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", dur, out], root);
  } else {
    run("ffmpeg", ["-v", "error", "-y", "-i", silent, "-i", narration, "-filter_complex", `[1:a]atrim=0:${dur},asetpts=N/SR/TB,volume=${voiceGain},alimiter=limit=0.97[mix]`, "-map", "0:v", "-map", "[mix]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", dur, out], root);
  }
  console.log(`assembled ${out} (${quality}) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} finally {
  bundled.cleanup();
  rmSync(scratch, { recursive: true, force: true });
}
