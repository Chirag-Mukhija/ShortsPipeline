// Voice recording vocabulary and the pure logic behind the record page: script words, matching heard words to the script, suggested cuts, the edit timeline, coverage and live teleprompter tracking.

export type ScriptWord = { i: number; text: string; norm: string; beat: number; para: number };
export type RecordScript = { hash: string; beats: { n: number; name: string }[]; words: ScriptWord[] };

// retake: an abandoned attempt you restarted; filler: um/uh; redone: replaced by a newer take; outside: chatter before or after your script lines; you: cut by hand.
export type CutReason = "retake" | "filler" | "redone" | "outside" | "you";
export type TakeWord = { text: string; norm: string; start: number; end: number; idx: number | null; cut: boolean; reason?: CutReason };
// glitches: stretches (in seconds) where the mic crackled or dropped out, found by findClicks.
// `video`: the take has face cam. offset = camera time minus voice time (seconds); synced = matched by audio, not assumed.
export type Take = { id: string; createdAt: string; from: number; duration: number; gainDb: number; scriptHash: string; words: TakeWord[]; glitches?: [number, number][]; video?: { offset: number; width: number; height: number; synced: boolean } };
// Background-noise cleanup for playback and export; transcripts always come from the untouched recording.
export type Cleanup = "off" | "gentle" | "strong";
export type CleanupEngine = "deepfilternet" | "ffmpeg";
export type CleanupState = { level: Cleanup; engine: CleanupEngine; ready: string[]; pending: number; error: string | null };
export type UnfinishedTake = { id: string; createdAt: string; seconds: number };
export type RecordState = {
  script: RecordScript;
  takes: Take[];
  unfinished: UnfinishedTake[];
  exported: { at: string; duration: number; stale: boolean; cleanup: Cleanup; facecam: boolean } | null;
  cleanup: CleanupState;
  stageState: string;
};
export type Segment = { take: string; start: number; end: number; first: number; last: number; key: number };
export type Coverage = "done" | "missing" | "reworded";

export const normWord = (word: string): string => word.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]/g, "");

// Decision: hyphens and slashes split words because Whisper writes "one to one" where a script says "one-to-one".
export const splitSpoken = (text: string): string[] => text.split(/[\s\-–—/]+/).filter((word) => normWord(word) !== "");

export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}

const BEAT = /^##\s+Beat\s+(\d+)\s*:\s*(.+?)\s*(?:\(~[^)]*\))?\s*$/i;

// Reads the spoken lines of script.md: everything inside "## Beat n" sections except [ON SCREEN]/[src] markup, headings and rules.
export function parseRecordScript(md: string): RecordScript {
  const beats: { n: number; name: string }[] = [];
  const words: ScriptWord[] = [];
  let beat: number | null = null;
  let para = 0;
  let inTag = false;
  for (const raw of md.replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
    const line = raw.trim();
    const heading = BEAT.exec(line);
    if (heading) {
      beat = Number(heading[1]);
      beats.push({ n: beat, name: (heading[2] ?? "").trim() });
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      beat = null;
      continue;
    }
    if (beat === null) continue;
    // Decision: a [ON SCREEN …] block may wrap over several lines; skip until its closing bracket.
    if (inTag) {
      if (line.includes("]")) inTag = false;
      continue;
    }
    if (line.startsWith("[")) {
      inTag = !line.includes("]");
      continue;
    }
    if (!line || line === "---" || line.startsWith("|") || line.startsWith("<")) continue;
    const spoken = line
      .replace(/^>\s*/, "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\*\([^)]*\)\*/g, " ")
      .replace(/\*\*|__|`/g, "")
      .replace(/(^|\s)[*_](?=\S)|(?<=\S)[*_](?=\s|$|[.,!?])/g, "$1");
    const parts = splitSpoken(spoken);
    if (parts.length === 0) continue;
    para++;
    for (const text of parts) words.push({ i: words.length, text, norm: normWord(text), beat, para });
  }
  return { hash: hashText(words.map((w) => w.norm).join(" ")), beats, words };
}

const skeleton = (word: string) => word[0] + word.slice(1).replace(/[aeiouy]/g, "");

// Decision: Whisper mishears names ("Claude" as "cloud" or "clod"), so words also match on their consonant skeleton when long enough.
export function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a[0] !== b[0]) return false;
  const sa = skeleton(a);
  return sa.length >= 3 && sa === skeleton(b);
}

const BACK = 80;
const AHEAD = 120;

// Maps each heard word to a script word index (or null when it isn't in the script), following the reader as they read on,
// skip, reword, or go back and restart. A jump needs several words in a row to agree, so a stray common word can't move it.
export function alignHeard(heard: string[], script: string[], from: number): (number | null)[] {
  const map: (number | null)[] = heard.map(() => null);
  let cursor = Math.max(0, Math.min(from, script.length));
  const eq = (i: number, p: number) => p >= 0 && p < script.length && i < heard.length && similar(heard[i]!, script[p]!);
  const run = (i: number, p: number) => {
    let k = 0;
    while (eq(i + k, p + k)) k++;
    return k;
  };
  for (let i = 0; i < heard.length; i++) {
    if (!heard[i]) continue;
    if (eq(i, cursor)) {
      map[i] = cursor++;
      continue;
    }
    let best: number | null = null;
    let bestLen = 0;
    let bestDist = Infinity;
    for (let p = Math.max(0, cursor - BACK); p < Math.min(script.length, cursor + AHEAD); p++) {
      if (p === cursor || !eq(i, p)) continue;
      const len = run(i, p);
      const d = p - cursor;
      if (len < (d > 0 && d <= 3 ? 2 : 3)) continue;
      if (len > bestLen || (len === bestLen && Math.abs(d) < bestDist)) {
        best = p;
        bestLen = len;
        bestDist = Math.abs(d);
      }
    }
    if (best !== null) {
      map[i] = best;
      cursor = best + 1;
    }
  }
  return map;
}

const FILLERS = new Set(["um", "uh", "umm", "uhh", "uhm", "erm", "er", "ah", "hmm", "mm", "mhm"]);

// Suggested cuts for a fresh take: an attempt you abandoned and restarted (the last attempt is kept), fillers, and chatter before your first or after your last script word.
export function suggestCuts(words: { norm: string; idx: number | null }[]): (CutReason | null)[] {
  const reasons: (CutReason | null)[] = words.map(() => null);
  let max = -1;
  words.forEach((word, i) => {
    if (word.idx === null) return;
    if (word.idx <= max) {
      // The abandoned attempt starts at its earliest script word at or past the restart point; ad-libs inside it go too.
      let start = i;
      for (let j = i - 1; j >= 0; j--) {
        const prev = words[j]!;
        if (prev.idx !== null && prev.idx < word.idx) break;
        if (prev.idx !== null) start = j;
      }
      for (let j = start; j < i; j++) reasons[j] ??= "retake";
    }
    max = word.idx;
  });
  const mapped = words.map((w, i) => (w.idx === null ? -1 : i)).filter((i) => i >= 0);
  const first = mapped[0] ?? words.length;
  const last = mapped.at(-1) ?? -1;
  words.forEach((word, i) => {
    if (reasons[i]) return;
    if (word.idx === null && (i < first || i > last)) reasons[i] = "outside";
    else if (word.idx === null && FILLERS.has(word.norm)) reasons[i] = "filler";
  });
  return reasons;
}

// When a new take covers script words an older take already has, the older version is cut ("redone"), including your ad-libs inside that stretch.
export function markRedone(older: TakeWord[], range: [number, number]): TakeWord[] {
  const [a, b] = range;
  const inside = older.map((w) => w.idx !== null && w.idx >= a && w.idx <= b);
  const firstIn = inside.indexOf(true);
  const lastIn = inside.lastIndexOf(true);
  return older.map((w, i) => {
    if (w.cut || firstIn < 0) return w;
    const covered = inside[i] || (w.idx === null && i > firstIn && i < lastIn);
    return covered ? { ...w, cut: true, reason: "redone" } : w;
  });
}

export function keptRange(words: TakeWord[]): [number, number] | null {
  const idx = words.filter((w) => !w.cut && w.idx !== null).map((w) => w.idx!);
  return idx.length >= 3 ? [Math.min(...idx), Math.max(...idx)] : null;
}

export const PRE_PAD = 0.12;
export const POST_PAD = 0.18;
export const MAX_PAUSE = 0.7;

type Run = { take: Take; first: number; last: number; cut: boolean; key: number };

// Splits every take into runs of kept or cut words and orders them by where they sit in the script, so a pickup lands
// in the middle of an older take where it belongs. Ties keep the older take first.
export function documentRuns(takes: Take[]): Run[] {
  const runs: Run[] = [];
  const order = [...takes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  order.forEach((take) => {
    if (take.words.length === 0) return;
    let lastIdx = take.from - 0.5;
    let start = 0;
    const words = take.words;
    for (let i = 0; i <= words.length; i++) {
      if (i < words.length && (i === start || words[i]!.cut === words[start]!.cut)) continue;
      const slice = words.slice(start, i);
      const mapped = slice.find((w) => w.idx !== null);
      const key = mapped ? mapped.idx! : lastIdx + 0.5;
      runs.push({ take, first: start, last: i - 1, cut: words[start]!.cut, key });
      const lastMapped = [...slice].reverse().find((w) => w.idx !== null);
      if (lastMapped) lastIdx = lastMapped.idx!;
      start = i;
    }
  });
  const rank = new Map(order.map((t, i) => [t.id, i]));
  return runs.sort((a, b) => a.key - b.key || rank.get(a.take.id)! - rank.get(b.take.id)! || a.first - b.first);
}

// The edit as audio: kept words, in document order, as time ranges in their takes. Pauses longer than MAX_PAUSE become a short gap.
export function buildTimeline(takes: Take[]): Segment[] {
  const segments: Segment[] = [];
  for (const run of documentRuns(takes)) {
    if (run.cut) continue;
    const words = run.take.words;
    let first = run.first;
    for (let i = run.first; i <= run.last; i++) {
      const next = words[i + 1];
      if (i < run.last && next && next.start - words[i]!.end <= MAX_PAUSE) continue;
      const prev = words[first - 1];
      const after = words[i + 1];
      const start = Math.max(prev ? (prev.end + words[first]!.start) / 2 : 0, words[first]!.start - PRE_PAD);
      const end = Math.min(after ? (words[i]!.end + after.start) / 2 : run.take.duration, words[i]!.end + POST_PAD);
      segments.push({ take: run.take.id, start: Math.max(0, start), end: Math.max(start + 0.02, end), first, last: i, key: run.key });
      first = i + 1;
    }
  }
  return segments;
}

export const timelineDuration = (segments: Segment[]) => segments.reduce((sum, s) => sum + (s.end - s.start), 0);

// RMS loudness in 10 ms frames; used to nudge cut points into the quietest spot nearby so a cut never clips a syllable.
export const FRAME = 0.01;
export function envelope(samples: ArrayLike<number>, rate: number, scale = 1): Float32Array {
  const size = Math.max(1, Math.round(rate * FRAME));
  const out = new Float32Array(Math.ceil(samples.length / size));
  for (let f = 0; f < out.length; f++) {
    let sum = 0;
    const end = Math.min(samples.length, (f + 1) * size);
    for (let i = f * size; i < end; i++) sum += (samples[i]! / scale) ** 2;
    out[f] = Math.sqrt(sum / Math.max(1, end - f * size));
  }
  return out;
}

function quietest(env: Float32Array, from: number, to: number): number {
  let best = from;
  let bestValue = Infinity;
  for (let t = from; t <= to + 1e-9; t += FRAME) {
    const value = env[Math.round(t / FRAME)] ?? Infinity;
    if (value < bestValue) {
      bestValue = value;
      best = t;
    }
  }
  return best;
}

export function refineSegments(segments: Segment[], takes: Map<string, Take>, envelopes: Map<string, Float32Array>): Segment[] {
  return segments.map((segment) => {
    const env = envelopes.get(segment.take);
    const take = takes.get(segment.take);
    if (!env || !take) return segment;
    const first = take.words[segment.first]!;
    const last = take.words[segment.last]!;
    const start = quietest(env, Math.max(0, segment.start - 0.06), Math.min(first.start, segment.start + 0.06));
    const end = quietest(env, Math.max(last.end, segment.end - 0.06), Math.min(take.duration, segment.end + 0.06));
    return { ...segment, start, end: Math.max(start + 0.02, end) };
  });
}

// Speech level of a take (the 90th percentile frame, in dBFS) and the gain that brings it to the shared target, so takes recorded at different distances match.
export function takeGainDb(env: Float32Array): number {
  const sorted = Array.from(env).filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)]!;
  const db = 20 * Math.log10(p90);
  return Math.max(-12, Math.min(12, Math.round((-18 - db) * 10) / 10));
}

export function coverage(script: RecordScript, takes: Take[]): Coverage[] {
  const out: Coverage[] = script.words.map(() => "missing");
  for (const take of takes) {
    let prev: { idx: number; at: number } | null = null;
    take.words.forEach((word, at) => {
      if (word.cut || word.idx === null) return;
      out[word.idx] = "done";
      // Decision: script words skipped between two kept words with only kept ad-libs (or nothing short) in between were
      // reworded on purpose; if anything was cut in between, that stretch still needs recording.
      if (prev && word.idx > prev.idx + 1) {
        const between = take.words.slice(prev.at + 1, at);
        const clean = between.every((w) => !w.cut);
        if (clean && (between.length > 0 || word.idx - prev.idx - 1 <= 2)) {
          for (let k = prev.idx + 1; k < word.idx; k++) if (out[k] === "missing") out[k] = "reworded";
        }
      }
      prev = { idx: word.idx, at };
    });
  }
  return out;
}

// Live teleprompter: where the reader is now, given the last few seconds Whisper heard. Holds still while they ad-lib and
// picks them up again once two words in a row match the script.
export function trackReader(heard: string[], script: string[], cursor: number): number {
  const map = alignHeard(heard, script, Math.max(0, cursor - 30));
  for (let i = map.length - 1; i >= 1; i--) {
    const idx = map[i];
    if (idx === null || idx === undefined) continue;
    const prev = map.slice(0, i).reverse().find((v) => v !== null);
    if (prev === undefined || prev === null || idx - prev > 3 || idx <= prev) continue;
    const next = idx + 1;
    return next > cursor + 80 ? cursor : next;
  }
  return cursor;
}

export type PlacedWord = { take: string; at: number; start: number; end: number };

// Where each kept word lands on the edited timeline (seconds), plus where each segment starts. Preview playback and the export share this.
export function placeWords(segments: Segment[], takes: Map<string, Take>): { words: PlacedWord[]; starts: number[]; duration: number } {
  const words: PlacedWord[] = [];
  const starts: number[] = [];
  let t0 = 0;
  for (const s of segments) {
    starts.push(t0);
    const dur = s.end - s.start;
    const take = takes.get(s.take);
    for (let i = s.first; take && i <= s.last; i++) {
      const w = take.words[i]!;
      if (w.cut) continue;
      const start = t0 + Math.max(0, w.start - s.start);
      words.push({ take: s.take, at: i, start, end: Math.max(start, t0 + Math.min(dur, w.end - s.start)) });
    }
    t0 += dur;
  }
  return { words, starts, duration: t0 };
}

// Mic glitches (a loose cable, a USB hiccup) show up as clicks: single-sample jumps far sharper than anything a voice
// makes. Calibrated on real takes: clean speech gives 0–1 a minute, a crackling mic gives hundreds.
const CLICK_BLOCK = 1024;
const CLICK_RATIO = 40;
const CLICK_MIN = 0.18;

// Streaming click finder: feed samples in any chunk size, get back the sample positions of clicks found so far.
export class ClickDetector {
  private block: Float32Array = new Float32Array(CLICK_BLOCK);
  private fill = 0;
  private seen = 0;

  constructor(private readonly scale = 1) {}

  push(chunk: ArrayLike<number>): number[] {
    const found: number[] = [];
    for (let i = 0; i < chunk.length; i++) {
      this.block[this.fill++] = chunk[i]! / this.scale;
      if (this.fill === CLICK_BLOCK) {
        const at = blockClick(this.block);
        if (at >= 0) found.push(this.seen + at);
        this.seen += CLICK_BLOCK;
        this.fill = 0;
      }
    }
    return found;
  }
}

function blockClick(block: Float32Array): number {
  const d2 = new Float32Array(block.length - 2);
  let max = 0;
  let maxAt = -1;
  for (let k = 1; k < block.length - 1; k++) {
    const v = Math.abs(block[k + 1]! - 2 * block[k]! + block[k - 1]!);
    d2[k - 1] = v;
    if (v > max) {
      max = v;
      maxAt = k;
    }
  }
  if (max <= CLICK_MIN) return -1;
  const median = d2.sort()[d2.length >> 1]! + 1 / 32768;
  return max > CLICK_RATIO * median ? maxAt : -1;
}

export function findClicks(samples: ArrayLike<number>, rate: number, scale = 1): number[] {
  return new ClickDetector(scale).push(samples).map((at) => at / rate);
}

// Decision: one stray click is a plosive or a bump; three or more within a second of each other is the mic glitching.
export function glitchSpans(clicks: number[], duration: number): [number, number][] {
  const spans: [number, number][] = [];
  let first = 0;
  for (let i = 0; i <= clicks.length; i++) {
    if (i < clicks.length && i > first && clicks[i]! - clicks[i - 1]! <= 1) continue;
    if (i > first && i - first >= 3) spans.push([Math.max(0, round3(clicks[first]! - 0.15)), Math.min(duration, round3(clicks[i - 1]! + 0.15))]);
    first = i;
  }
  return spans;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
