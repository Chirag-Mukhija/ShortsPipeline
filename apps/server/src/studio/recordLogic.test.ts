// Tests the record page's pure logic: reading spoken lines from a script, following a reader who rewords or restarts, suggested cuts, pickups landing mid-take, and coverage.
import { describe, expect, it } from "vitest";
import {
  alignHeard,
  buildTimeline,
  coverage,
  documentRuns,
  markRedone,
  normWord,
  parseRecordScript,
  similar,
  suggestCuts,
  trackReader,
  type Take,
  type TakeWord,
} from "@clipforge/schema";

const SCRIPT = `# Script: test

## Hooks
Hook text that is not spoken here.

## Beat 1: The hook (~0:00-0:30)

So basically, in a few months, I went from networking to **Claude Code**. [own]

[ON SCREEN: GRAPHIC: a chain
that wraps over two lines]

And honestly, most of it an AI agent wrote. [src: 3]

## Beat 2: The chain (~0:30-2:15)

Here's how it actually went. I started studying networking.

## Sketch notes
- not spoken
`;

const script = parseRecordScript(SCRIPT);
const norms = script.words.map((w) => w.norm);
const heard = (text: string) => text.split(/\s+/).map(normWord).filter(Boolean);

function take(id: string, createdAt: string, text: string, from = 0, step = 0.4): Take {
  const h = heard(text);
  const map = alignHeard(h, norms, from);
  const reasons = suggestCuts(h.map((norm, i) => ({ norm, idx: map[i] ?? null })));
  const words: TakeWord[] = h.map((norm, i) => ({
    text: norm,
    norm,
    start: i * step,
    end: i * step + step * 0.8,
    idx: map[i] ?? null,
    cut: reasons[i] !== null,
    ...(reasons[i] ? { reason: reasons[i]! } : {}),
  }));
  return { id, createdAt, from, duration: h.length * step + 1, gainDb: 0, scriptHash: script.hash, words };
}

describe("parseRecordScript", () => {
  it("keeps only spoken lines inside beats, without markup", () => {
    expect(script.beats).toEqual([
      { n: 1, name: "The hook" },
      { n: 2, name: "The chain" },
    ]);
    const text = script.words.map((w) => w.text).join(" ");
    expect(text).toContain("networking to Claude Code.");
    expect(text).not.toMatch(/own|src|GRAPHIC|wraps|Hook text|not spoken/);
    expect(script.words.at(-1)?.beat).toBe(2);
  });
});

describe("similar", () => {
  it("accepts Whisper's usual mishearing of names, not unrelated words", () => {
    expect(similar("claude", "cloud")).toBe(true);
    expect(similar("to", "to")).toBe(true);
    expect(similar("networking", "working")).toBe(false);
  });
});

describe("alignHeard", () => {
  it("follows a reader who rewords from A to B and rejoins the script", () => {
    const h = heard("So basically in a few months I hopped around like crazy from networking to Claude Code");
    const map = alignHeard(h, norms, 0);
    expect(map[h.indexOf("hopped")]).toBeNull();
    const code = map[h.lastIndexOf("code")]!;
    expect(script.words[code]?.text).toBe("Code.");
  });
});

describe("trackReader", () => {
  it("holds still during an ad-lib and picks the reader up again after it", () => {
    const start = norms.indexOf("went");
    expect(trackReader(heard("I went from"), norms, start)).toBe(norms.indexOf("networking"));
    expect(trackReader(heard("my own words that are nowhere"), norms, start)).toBe(start);
    expect(trackReader(heard("nowhere at all and honestly most of it"), norms, start)).toBe(norms.indexOf("an"));
  });
});

describe("suggestCuts", () => {
  it("cuts the abandoned attempt and keeps the restart, plus fillers and chatter outside the script", () => {
    const t = take("t1", "2026-11-14T10:00:00Z", "okay recording So basically in a few uh months I went from wait So basically in a few months I went from networking");
    const cut = t.words.filter((w) => w.cut).map((w) => `${w.text}:${w.reason}`);
    expect(cut.slice(0, 2)).toEqual(["okay:outside", "recording:outside"]);
    expect(cut).toContain("wait:retake");
    expect(t.words.filter((w) => !w.cut).map((w) => w.text).join(" ")).toBe("so basically in a few months i went from networking");
  });
});

describe("pickups", () => {
  it("cuts the older version and places the pickup where it belongs in the script", () => {
    const full = take("a", "2026-11-14T10:00:00Z", "So basically in a few months I went from networking to Claude Code And honestly most of it an AI agent wrote");
    const pickup = take("b", "2026-11-14T10:05:00Z", "And honestly most of it an AI agent wrote", norms.indexOf("and"));
    const redone = { ...full, words: markRedone(full.words, [norms.indexOf("and"), norms.indexOf("wrote")]) };
    const order = documentRuns([pickup, redone]).filter((r) => !r.cut).map((r) => r.take.id);
    expect(order).toEqual(["a", "b"]);
    expect(buildTimeline([redone, pickup]).map((s) => s.take)).toEqual(["a", "b"]);
    const cov = coverage(script, [redone, pickup]);
    expect(cov.slice(0, norms.indexOf("wrote") + 1).every((c) => c === "done")).toBe(true);
    expect(cov.at(-1)).toBe("missing");
  });

  it("marks script words skipped for an ad-lib as reworded, not missing", () => {
    const t = take("c", "2026-11-14T10:00:00Z", "So basically in a few months I hopped around like crazy from networking to Claude Code");
    const cov = coverage(script, [t]);
    expect(cov[norms.indexOf("went")]).toBe("reworded");
  });
});
