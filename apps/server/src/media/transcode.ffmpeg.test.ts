// Integration test against real ffmpeg: a recording gets transcoded to the exact formats each downstream
// consumer expects (16kHz mono PCM for whisper, mp3 for the final scene file everything else assumes).
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { execOrThrow } from "../lib/exec";
import { transcodeToMp3, transcodeToWav } from "./ffmpeg";

const dir = mkdtempSync(path.join(os.tmpdir(), "clipforge-transcode-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function probeAudio(file: string): Promise<{ codec: string; sampleRate: string; channels: string }> {
  const { stdout } = await execOrThrow("ffprobe", [
    "-v", "error", "-select_streams", "a:0",
    "-show_entries", "stream=codec_name,sample_rate,channels",
    "-of", "csv=p=0", file,
  ]);
  const [codec, sampleRate, channels] = stdout.trim().split(",");
  return { codec: codec ?? "", sampleRate: sampleRate ?? "", channels: channels ?? "" };
}

describe("transcodeToWav / transcodeToMp3", () => {
  it("produces 16kHz mono PCM for whisper and mp3 for the final scene file from the same source", async () => {
    // A recording is rarely clean mono 16kHz to begin with (browsers typically capture stereo at 44.1/48kHz) —
    // this source is deliberately stereo at 48kHz so the test actually exercises the resample/downmix.
    const source = path.join(dir, "source.wav");
    await execOrThrow("ffmpeg", [
      "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=1:sample_rate=48000",
      "-ac", "2", source,
    ]);

    const wav = path.join(dir, "for-whisper.wav");
    await transcodeToWav(source, wav);
    const wavInfo = await probeAudio(wav);
    expect(wavInfo.codec).toBe("pcm_s16le");
    expect(wavInfo.sampleRate).toBe("16000");
    expect(wavInfo.channels).toBe("1");

    const mp3 = path.join(dir, "scene.mp3");
    await transcodeToMp3(source, mp3);
    const mp3Info = await probeAudio(mp3);
    expect(mp3Info.codec).toBe("mp3");
    expect(mp3Info.channels).toBe("1");
  });
});
