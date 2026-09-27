// Hand-written sample timeline (a file-compression explainer) for Remotion Studio previews and render smoke tests.
import {
  VIDEO_DEFAULTS,
  buildCaptionPages,
  estimateWordTimings,
  msToFrame,
  resolveCues,
  splitWords,
  type CodeToken,
  type Cue,
  type SceneTiming,
  type TimedWord,
  type Timeline,
  type TimelineScene,
} from "@clipforge/schema";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Draft = DistributiveOmit<TimelineScene, keyof SceneTiming> & { narration: string; cues: Cue[] };

const WORD_MS = 330;
const kw = "#FF7AB6";
const fn = "#7CC4FF";
const str = "#A6E3A1";
const num = "#FFB224";
const cm = "#6B7489";
const tx = "#E6EAF2";
const t = (text: string, color: string): CodeToken => ({ text, color });

const drafts: Draft[] = [
  {
    template: "HookSlam",
    narration: "Your four gig movie just became one gig. Nothing got deleted. So where did it go?",
    props: { lines: ["4 GB → 1 GB", "Nothing deleted?"], highlight: ["deleted?"], icon: "lucide:file-archive", kicker: "Wait, what?" },
    cues: [{ word: "deleted", action: "shake" }],
  },
  {
    template: "KineticText",
    narration: "Compression is basically your computer being lazy in the smartest possible way.",
    props: { text: "Lazy, but genius.", highlight: ["genius."], icon: "🦥" },
    cues: [{ word: "smartest", action: "pulse" }],
  },
  {
    template: "Diagram",
    narration: "It scans the file, finds patterns that repeat, and keeps only the first copy plus tiny pointers to it.",
    props: {
      title: "How zip thinks",
      nodes: [
        { id: "file", label: "Your file", icon: "lucide:file-text", col: 1, row: 0 },
        { id: "scan", label: "Find repeats", icon: "lucide:search", col: 1, row: 1, tone: "blue" },
        { id: "first", label: "First copy", icon: "lucide:database", col: 0, row: 2, tone: "green" },
        { id: "ptr", label: "Tiny pointers", icon: "lucide:link", col: 2, row: 2, tone: "accent" },
      ],
      edges: [
        { from: "file", to: "scan" },
        { from: "scan", to: "first", label: "keep" },
        { from: "scan", to: "ptr", label: "replace", dashed: true },
      ],
    },
    cues: [
      { word: "scans", action: "reveal", target: "node:scan" },
      { word: "repeat", action: "packet", target: "edge:file-scan" },
      { word: "first", action: "reveal", target: "node:first" },
      { word: "pointers", action: "reveal", target: "node:ptr" },
      { word: "pointers", action: "highlight", target: "node:ptr" },
    ],
  },
  {
    template: "CodeBlock",
    narration: "Watch this. Two thousand bytes of ha ha ha squeeze down to just twenty four.",
    props: {
      filename: "squeeze.py",
      language: "python",
      code: 'import zlib\n\ndata = b"ha" * 1000\npacked = zlib.compress(data)\n\nprint(len(data))    # 2000\nprint(len(packed))  # 24',
      focusLines: [7],
      background: "",
      tokens: [
        [t("import", kw), t(" zlib", tx)],
        [],
        [t("data", tx), t(" = ", kw), t('b"ha"', str), t(" * ", kw), t("1000", num)],
        [t("packed", tx), t(" = ", kw), t("zlib.", tx), t("compress", fn), t("(data)", tx)],
        [],
        [t("print", fn), t("(", tx), t("len", fn), t("(data))    ", tx), t("# 2000", cm)],
        [t("print", fn), t("(", tx), t("len", fn), t("(packed))  ", tx), t("# 24", cm)],
      ],
    },
    cues: [{ word: "twenty", action: "highlight", target: "line:7" }],
  },
  {
    template: "Compare",
    narration: "Lossless formats like ZIP give back every single bit. Lossy ones like JPEG quietly throw away detail your eyes won't miss.",
    props: {
      left: { title: "Lossless", icon: "lucide:file-archive", points: ["Every bit comes back", "ZIP, PNG, FLAC"] },
      right: { title: "Lossy", icon: "lucide:image", points: ["Drops invisible detail", "JPEG, MP3, MP4"] },
      verdict: "Pick what you can lose",
    },
    cues: [
      { word: "Lossless", action: "reveal", target: "left" },
      { word: "Lossy", action: "reveal", target: "right" },
      { word: "miss", action: "reveal", target: "verdict" },
    ],
  },
  {
    template: "StatCounter",
    narration: "Plain text often shrinks by seventy percent or more.",
    props: { value: 70, suffix: "%", label: "smaller text files", icon: "lucide:file-text" },
    cues: [],
  },
  {
    template: "KineticText",
    narration: "So nothing was deleted. It was just written down smarter.",
    props: { text: "Not deleted. Written smarter.", highlight: ["smarter."], icon: "lucide:brain" },
    cues: [{ word: "smarter", action: "pulse" }],
  },
];

function buildSample(): Timeline {
  const { fps } = VIDEO_DEFAULTS;
  const scenes: TimelineScene[] = [];
  const allWords: TimedWord[] = [];
  let from = 0;
  drafts.forEach((draft, i) => {
    const totalMs = splitWords(draft.narration).length * WORD_MS + 300;
    const durationInFrames = msToFrame(totalMs, fps);
    const words = estimateWordTimings(draft.narration, totalMs);
    const { cues } = resolveCues(draft.cues, words, fps, durationInFrames);
    scenes.push({ ...draft, id: `s${i + 1}`, from, durationInFrames, audio: null, words, cues } as TimelineScene);
    const offsetMs = (from / fps) * 1000;
    allWords.push(...words.map((w) => ({ ...w, startMs: w.startMs + offsetMs, endMs: w.endMs + offsetMs })));
    from += durationInFrames;
  });
  return {
    version: 1,
    ...VIDEO_DEFAULTS,
    durationInFrames: from,
    title: "How compression actually works",
    scenes,
    captions: buildCaptionPages(allWords),
    sfx: [],
    music: null,
    theme: { palette: "amberBlack" },
    background: null,
  };
}

export const sampleTimeline: Timeline = buildSample();
