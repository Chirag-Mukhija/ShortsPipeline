// Tests the voice-practice status against a temp voice folder: missing profile, fresh profile, new samples and staleness, plus the rotating topic.
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "studio-voice-"));
process.env.STUDIO_VOICE_DIR = dir;
let voice: typeof import("./voice");

beforeAll(async () => {
  voice = await import("./voice");
});

const at = (iso: string) => new Date(iso);

describe("voiceStatus", () => {
  it("is due when there's no profile yet", () => {
    expect(voice.voiceStatus()).toMatchObject({ exists: false, updatedAt: null, samples: 0, due: true });
  });

  it("is not due right after the profile is written, and due again after two weeks", () => {
    writeFileSync(path.join(dir, "voice.md"), "# voice");
    utimesSync(path.join(dir, "voice.md"), at("2026-11-11T10:00:00Z"), at("2026-11-11T10:00:00Z"));
    expect(voice.voiceStatus(at("2026-11-12T10:00:00Z"))).toMatchObject({ exists: true, newSamples: 0, due: false });
    expect(voice.voiceStatus(at("2026-11-25T11:00:00Z")).due).toBe(true);
  });

  it("counts samples newer than the profile as waiting to be folded in", () => {
    mkdirSync(path.join(dir, "samples"), { recursive: true });
    writeFileSync(path.join(dir, "samples", "old.txt"), "x");
    utimesSync(path.join(dir, "samples", "old.txt"), at("2026-11-10T10:00:00Z"), at("2026-11-10T10:00:00Z"));
    writeFileSync(path.join(dir, "samples", "new.txt"), "y");
    utimesSync(path.join(dir, "samples", "new.txt"), at("2026-11-12T10:00:00Z"), at("2026-11-12T10:00:00Z"));
    writeFileSync(path.join(dir, "samples", "new.webm"), "audio");
    expect(voice.voiceStatus(at("2026-11-12T12:00:00Z"))).toMatchObject({ samples: 2, newSamples: 1, due: true });
  });

  it("rotates through the practice topics day by day", () => {
    const a = voice.topicFor(at("2026-11-11T09:00:00Z"));
    expect(voice.PRACTICE_TOPICS).toContain(a);
    expect(voice.topicFor(at("2026-11-11T20:00:00Z"))).toBe(a);
    expect(voice.topicFor(at("2026-11-12T09:00:00Z"))).not.toBe(a);
  });
});
