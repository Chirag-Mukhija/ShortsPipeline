// Tests face cam sync and export with generated media: a voice track, a camera file whose audio starts 0.37 s late, and cuts that must come out frame-exact.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bestLag, exportFacecam, finishCamera } from "./facecam";

const dir = mkdtempSync(path.join(tmpdir(), "facecam-test-"));
// Irregular tone bursts, so there's exactly one lag where the two copies line up.
const speech = "aevalsrc='0.6*sin(2*PI*440*t)*gt(sin(2*PI*1.3*t)+sin(2*PI*0.71*t)+sin(2*PI*2.9*t),1.2)'";
const ff = (...args: string[]) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

describe("bestLag", () => {
  it("finds a known shift between two envelopes", () => {
    const voice = Float32Array.from({ length: 800 }, (_, i) => Math.sin(i * 0.13) + Math.sin(i * 0.031));
    const cam = new Float32Array(800);
    for (let i = 0; i < 800; i++) cam[i] = voice[i - 37] ?? 0;
    expect(bestLag(voice, cam).lag).toBe(37);
  });
});

describe("face cam", () => {
  const voice = path.join(dir, "voice.wav");
  const raw = path.join(dir, "cam.raw");
  const cam = path.join(dir, "cam.mp4");

  it("syncs a camera whose audio starts 0.37 s late", async () => {
    ff("-f", "lavfi", "-i", `${speech}:s=48000:d=6`, "-ac", "1", "-c:a", "pcm_s16le", voice);
    ff("-f", "lavfi", "-i", "testsrc=size=640x360:rate=30:d=6.5", "-f", "lavfi", "-i", `${speech}:s=48000:d=6`, "-filter_complex", "[1:a]adelay=370[a]", "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-f", "mp4", raw);
    const info = await finishCamera(raw, voice, cam);
    expect(info?.synced).toBe(true);
    expect(info!.offset).toBeCloseTo(0.37, 1);
    expect([info!.width, info!.height]).toEqual([640, 360]);
  }, 60_000);

  it("cuts pieces to whole frames that add up to the voice length", async () => {
    const out = path.join(dir, "facecam.mp4");
    await exportFacecam(
      [
        { cam, offset: 0.37, start: 1, end: 2.01 },
        { cam, offset: 0.37, start: 3, end: 3.52 },
        { cam, offset: 0.37, start: 5.8, end: 6 },
      ],
      out,
    );
    const frames = Number(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", out]).toString());
    // 1.01 + 0.52 + 0.2 = 1.73 s of voice → 52 frames at 30 fps.
    expect(frames).toBe(Math.round(1.73 * 30));
  }, 60_000);
});
