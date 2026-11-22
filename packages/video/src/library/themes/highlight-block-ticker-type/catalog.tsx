// Catalog of the highlight block ticker theme: one entry and one demo per reusable item, each demo built to read as a still.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { Track } from "../../core/beat";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { BLACK, BLUE, GREEN, RED, YELLOW } from "./theme";
import { stack, wordRect } from "./grid";
import { TickerBlack, TypeGrid } from "./type";
import { BarTicker, BlockFill, HookStack, PipelineHop, QuoteSelect, SourceTape, SpokenSelect, StatRoll, StepTable, VersusTable, type Spoken } from "./pieces";
import { BeatWall, SelectReplace, WordPicker } from "./signature";

const ORIGIN = "highlight-block-ticker-type board (data/references/themes/highlight-block-ticker-type.md)";
const entry = (e: Omit<LibraryEntry, "origin">): LibraryEntry => ({ ...e, origin: ORIGIN });

// Demo words with evenly spaced fake timings, shaped like narration.json.
const said = (text: string, from: number, gap = 0.26): Spoken[] => text.split(" ").map((w, i) => ({ text: w, start: from + i * gap, end: from + (i + 1) * gap }));

const TickerRowDemo: FC = () => {
  const rows = stack(
    [
      { text: "SHIP SMALL.", size: 130, tail: "  SHIP SMALL.  SHIP SMALL.  SHIP SMALL." },
      { text: "EVERY ROW TICKS IN", size: 96 },
      { text: "FROM THE RIGHT", size: 96 },
      { text: "AND TYPES ITSELF", size: 96 },
    ],
    { at: 0.2, stagger: 6 },
  );
  return <TypeGrid rows={rows} caret={3} />;
};

const BlockDemo: FC = () => {
  const rows = stack(
    [
      { text: "PICK ANY WORD", size: 110 },
      { text: "THE BLOCK JUMPS", size: 110 },
      { text: "AND HOLDS ON", size: 110 },
      { text: "THE ONE THAT", size: 110 },
      { text: "MATTERS.", size: 160 },
    ],
    { at: 0.1 },
  );
  const hits = [
    { row: 0, word: "PICK", at: 0.9 },
    { row: 0, word: "WORD", at: 1.15 },
    { row: 1, word: "JUMPS", at: 1.4 },
    { row: 2, word: "HOLDS", at: 1.65 },
    { row: 4, word: "MATTERS", at: 2.0 },
  ];
  return <TypeGrid rows={rows} blocks={[{ hits, settle: YELLOW }]} />;
};

const FillDemo: FC = () => {
  const rows = stack(
    [
      { text: "THAT WAS", size: 150 },
      { text: "THE SETUP.", size: 150 },
    ],
    { at: 0.1, index: false },
  );
  const next = stack(
    [
      { text: "PART 02", size: 110, color: BLACK },
      { text: "THE PAYOFF.", size: 170, color: BLACK },
    ],
    { at: 1.85, index: false },
  );
  return (
    <AbsoluteFill>
      <TypeGrid rows={rows} blocks={[{ hits: [{ row: 1, word: "SETUP", at: 0.7 }], settle: BLUE }]} />
      <BlockFill from={wordRect(rows[1]!, "SETUP")} at={1.3} color={BLUE}>
        <TypeGrid rows={next} />
      </BlockFill>
    </AbsoluteFill>
  );
};

const SourceDemo: FC = () => {
  const rows = stack(
    [
      { text: "STACKED ROWS.", size: 120 },
      { text: "HOPPING BLOCKS.", size: 120 },
    ],
    { at: 0.1, top: 260, index: false },
  );
  return (
    <AbsoluteFill>
      <TypeGrid rows={rows} blocks={[{ hits: [{ row: 1, word: "BLOCKS", at: 0.7 }], settle: RED }]} />
      <SourceTape text="recent.design ▪ Kinetic Token API Concept ▪ X post" at={1.0} />
    </AbsoluteFill>
  );
};

const entries: LibraryEntry[] = [
  entry({
    id: "ticker-black",
    kind: "background",
    title: "Ticker black",
    useFor: "Every scene's floor: flat #000, faint row rules every 120 px, and a dim tape along the bottom edge whose scanner hops one word every 4 f so holds never freeze.",
    api: "<TickerBlack rules? tape? />",
    seconds: 1,
    Demo: () => <AbsoluteFill />,
  }),
  entry({
    id: "ticker-row",
    kind: "primitive",
    title: "Ticker row",
    useFor: "Any line of type in this theme: scrolls in from the right (600 px, 20 f expo-out) while typing a char per frame, grey row number at far left, optional dim tail that runs off the frame, underscore caret.",
    api: "<TypeGrid rows={stack(lines, { at, out?, stagger? })} caret? />  ·  <TickerRow row under? />  ·  GridRow { text size x y at out? tail? drift? charAt? }",
    seconds: 2,
    Demo: TickerRowDemo,
  }),
  entry({
    id: "highlight-block",
    kind: "primitive",
    title: "Highlight block hop",
    useFor: "The theme's emphasis: a sharp block hops word to word (leading edge 3 f, trailing 6 f), flashes through red/yellow/green/blue/violet every 2 f, then settles; text under it inverts to black.",
    api: "<TypeGrid rows blocks={[{ hits: [{ row, word: index|'WORD'|[from,to], at }], settle?, cycle?, off? }]} scan? />  ·  blockAt(t, hits, opts)",
    seconds: 3.5,
    Demo: BlockDemo,
  }),
  entry({
    id: "hook-stack",
    kind: "piece",
    title: "Hook stack",
    useFor: "Cold opens and title cards: 3–6 numbered rows tick in with a 3 f stagger, one hero row larger, the block lands on the hook word and a dim scanner walks the stack while it holds.",
    api: "<HookStack lines={[{ text, size }]} at hits={[{ row, word, at }]} settle? out? off? scan? caret? lift? />",
    seconds: 3.5,
    Demo: () => (
      <HookStack
        lines={[
          { text: "AI WRITES", size: 120 },
          { text: "THE CODE.", size: 120 },
          { text: "SO WHAT DO I", size: 120 },
          { text: "LEARN?", size: 190 },
        ]}
        at={0.1}
        hits={[
          { row: 0, word: "WRITES", at: 1.0 },
          { row: 1, word: "CODE", at: 1.3 },
          { row: 3, word: "LEARN", at: 1.75 },
        ]}
      />
    ),
  }),
  entry({
    id: "spoken-select",
    kind: "piece",
    title: "Spoken keyword select",
    useFor: "A claim straight from narration.json (up to ~12 words): each word types in 3 f before it's said, wrapped to rows; the block jumps onto each key word on its spoken frame and holds.",
    api: "<SpokenSelect words={narration.words.slice(a, b)} keys={[{ idx, color? }]} size? maxChars? settle? off? />",
    seconds: 3.8,
    Demo: () => <SpokenSelect words={said("You don't need more tutorials. You need one shipped project.", 0.3)} keys={[{ idx: 4, color: RED }, { idx: 8, color: GREEN }]} size={110} />,
  }),
  entry({
    id: "step-table",
    kind: "piece",
    title: "Step table",
    useFor: "Lists and steps: a numbered table with hairline rules and a status column; on each cue the block steps down to the next name in a new colour and the one above flips to DONE.",
    api: "<StepTable steps={['Idea', …]} at cues={[t1, t2, …]} title? size? />",
    seconds: 3.2,
    Demo: () => <StepTable steps={["Idea", "Research", "Script", "Record", "Edit"]} at={0.2} cues={[0.8, 1.3, 1.8, 2.3]} title="THE CHAIN" />,
  }),
  entry({
    id: "stat-roll",
    kind: "piece",
    title: "Stat roll",
    useFor: "A big number: digits roll like a departure board (stepped every 2 f) and lock left to right, then the block slams over the figure and the unit and label tick in.",
    api: "<StatRoll value='600' unit? above? below? at size? settle? />",
    seconds: 2.8,
    Demo: () => <StatRoll value="600" unit="PX" above="TICKER ENTRANCE TRAVEL" below="IN 20 FRAMES, EXPO-OUT" at={0.3} />,
  }),
  entry({
    id: "versus-table",
    kind: "piece",
    title: "Versus table",
    useFor: "A vs B: two value columns under big headers; the block picks the winning cell row by row (losers go grey), then jumps to the winning header in red.",
    api: "<VersusTable a b rows={[[label, aVal, bVal, 'a'|'b']]} at cues pick winner />",
    seconds: 3.6,
    Demo: () => (
      <VersusTable
        a="BUILD"
        b="WATCH"
        rows={[
          ["YOU KEEP", "SKILLS", "VIBES", "a"],
          ["FEELS", "HARD", "PRODUCTIVE", "b"],
          ["SHOWS UP", "ON GITHUB", "IN HISTORY", "a"],
        ]}
        at={0.15}
        cues={[1.0, 1.45, 1.9]}
        pick={2.5}
        winner="a"
      />
    ),
  }),
  entry({
    id: "quote-select",
    kind: "piece",
    title: "Quote select",
    useFor: "Quotes and callouts: a colour-cycling quote block, the quote typed across big mono rows, the highlight landing on its key words as they're read, attribution in grey.",
    api: "<QuoteSelect lines by at keys={[{ row, word, at, color? }]} size? settle? />",
    seconds: 3.4,
    Demo: () => (
      <QuoteSelect
        lines={["Talk is cheap.", "Show me the code."]}
        by="— Linus Torvalds · LKML, 2000"
        at={0.2}
        keys={[
          { row: 0, word: "CHEAP", at: 1.3 },
          { row: 1, word: "CODE", at: 1.8 },
        ]}
      />
    ),
  }),
  entry({
    id: "bar-ticker",
    kind: "piece",
    title: "Bar ticker",
    useFor: "Charts: a tabular bar chart where bars light one segment per frame with a colour-flashing head, values type in at the bar ends, and the top row's label gets the block.",
    api: "<BarTicker title? bars={[{ label, value }]} at max? seg? />",
    seconds: 3,
    Demo: () => (
      <BarTicker
        title="frames per move · this theme"
        bars={[
          { label: "Entrance", value: 20 },
          { label: "Transition", value: 12 },
          { label: "Colour cycle", value: 10 },
          { label: "Exit", value: 10 },
          { label: "Stagger", value: 3 },
        ]}
        at={0.2}
      />
    ),
  }),
  entry({
    id: "pipeline-hop",
    kind: "piece",
    title: "Pipeline hop",
    useFor: "Flows and pipelines: single-word stages joined by > marks in one mono row; the block hops stage to stage on cue and each stage's output below lights up in that stage's colour.",
    api: "<PipelineHop stages={[{ name, out }]} at cues size? />",
    seconds: 3.4,
    Demo: () => (
      <PipelineHop
        stages={[
          { name: "Idea", out: "idea.md" },
          { name: "Research", out: "brief.md" },
          { name: "Script", out: "script.md" },
          { name: "Record", out: "narration.wav" },
        ]}
        at={0.2}
        cues={[0.9, 1.4, 1.9, 2.4]}
      />
    ),
  }),
  entry({
    id: "source-tape",
    kind: "piece",
    title: "Source tape",
    useFor: "Source labels and lower thirds: a ruled strip wipes across, a SOURCE block flashes and settles, and the citation types in, holds `hold` s to be read, then tickers slowly left, cropped by the frame.",
    api: "<SourceTape label? text at y? size? settle? speed? hold?=2.5 />",
    seconds: 3,
    Demo: SourceDemo,
  }),
  entry({
    id: "block-fill",
    kind: "transition",
    title: "Block fill",
    useFor: "Scene changes: the held block expands to the full frame in 12 f (expo in-out) and becomes the next scene's background, where type runs black on colour.",
    api: "<BlockFill from={wordRect(row, word)} at color>{next scene}</BlockFill>",
    seconds: 3.2,
    Demo: FillDemo,
  }),
  entry({
    id: "word-picker",
    kind: "piece",
    title: "Word picker (signature)",
    useFor: "The ticker choosing what to say: the block shuffles between options, decelerating like a slot reel, and lands on the pick while the rest go grey. Great for 'which one?' hooks.",
    api: "<WordPicker prompt options pick at shuffleAt seed? settle? size? />",
    seconds: 3.4,
    Demo: () => <WordPicker prompt="Learn next?" options={["Python", "Rust", "Go", "TypeScript", "Zig"]} pick={3} at={0.2} shuffleAt={0.8} />,
  }),
  entry({
    id: "beat-wall",
    kind: "piece",
    title: "Beat wall (signature, music-only)",
    useFor: "Music-only typography: endless tapes run in alternating directions, the block hops on every beat to the word passing a seeded spot, the hero row takes each downbeat and the settle colour changes per bar.",
    api: "<Track spec={{ bpm, offsetSec, sections }}><BeatWall lines={[{ text, size, speed }]} hero? top? /></Track>",
    seconds: 4,
    Demo: () => (
      <Track spec={{ bpm: 120, offsetSec: 0.2 }}>
        <BeatWall
          lines={[
            { text: "SHIP ▪ BREAK ▪ FIX ▪ LEARN ▪ ", size: 110, speed: -120 },
            { text: "TYPE ▪ SELECT ▪ CYCLE ▪ HOLD ▪ ", size: 110, speed: 90 },
            { text: "ON THE BEAT ▪ ", size: 180, speed: -70 },
            { text: "LOUD ▪ FAST ▪ PRECISE ▪ ", size: 110, speed: 140 },
            { text: "ROW ▪ BLOCK ▪ TAPE ▪ GRID ▪ ", size: 110, speed: -100 },
          ]}
        />
      </Track>
    ),
  }),
  entry({
    id: "select-replace",
    kind: "piece",
    title: "Select and replace (signature)",
    useFor: "Reframes ('not X, Y'): a word is selected one char per frame, flashes and goes red, then is retyped as the replacement under a green block while a find/replace bar logs it.",
    api: "<SelectReplace lines row word replacement at selectAt replaceAt size? />",
    seconds: 3.4,
    Demo: () => <SelectReplace lines={["Learn by", "watching."]} row={1} word={0} replacement="building." at={0.15} selectAt={0.85} replaceAt={1.85} size={170} />,
  }),
];

const theme: LibraryTheme = {
  slug: "highlight-block-ticker-type",
  name: "Highlight block ticker type",
  summary: "Uppercase mono rows tick in on pure black while sharp colour blocks hop word to word, flashing red, yellow, green, blue and violet before settling; text under a block inverts to black.",
  feel: ["fast", "techy", "rhythmic", "loud", "precise"],
  status: "draft",
  board: "data/references/themes/highlight-block-ticker-type.md",
  Background: () => <TickerBlack />,
  entries,
};

export default theme;
