// Catalog of the split-flap departure board theme: one entry and a small demo per reusable piece, with the dormant station wall behind every one.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { Track } from "../../core/beat";
import { BoardCam, DepartureBoard, StationWall, type Column } from "./board";
import { FlapRow, FlapWords, Rail, rowLeft, rowSpecs } from "./rows";
import { CallingAt, CountdownBoard, FlapBars, FlapTitle, Leaderboard, NoticeBoard, SourceRow, StatBoard, VersusBoard } from "./pieces";
import { ClickStrip, ClickTrack, FlipWipe } from "./transition";
import { BeatBoard } from "./music";
import { DIM, PAINT } from "./theme";

const ORIGIN = "split-flap-departure-board theme build (library draft)";

const Caption: FC<{ text: string; y?: number }> = ({ text, y = 930 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: PAINT, fontWeight: 600, fontSize: 32, letterSpacing: "0.16em", color: DIM }}>{text}</div>
);

const CellDemo: FC = () => {
  const h = 400;
  const specs = rowSpecs({ text: "FLAP", at: 0.25, laps: 1, seed: 4, stagger: 5 });
  return (
    <>
      <FlapRow specs={specs} x={960} y={250} h={h} anchor="center" weight={600} rail />
      <ClickTrack specs={specs} />
      <Caption text="TOP HALF FALLS  ·  SHADOW ON THE LOWER FLAP  ·  4–6 F PER FINAL FLAP" y={760} />
    </>
  );
};

const ClickDemo: FC = () => {
  const specs = rowSpecs({ text: "ARRIVED", at: 0.2, seed: 8 });
  const h = 220;
  return (
    <>
      <FlapRow specs={specs} x={960} y={230} h={h} anchor="center" weight={600} rail />
      <ClickTrack specs={specs} />
      <ClickStrip specs={specs} x={(1920 - 1200) / 2} y={640} w={1200} frames={90} />
    </>
  );
};

const KeyLineDemo: FC = () => {
  const h = 112;
  const cols = 19;
  const l = rowLeft(960, h, cols, "center");
  return (
    <>
      <Rail x={l} y={330} h={h} cols={cols} />
      <Rail x={l} y={330 + h + 50} h={h} cols={cols} />
      <FlapWords x={l} y={330} h={h} cols={cols} words={[{ w: "AI", t: 0.2 }, { w: "WRITES", t: 0.4 }, { w: "THE", t: 0.7 }, { w: "CODE.", t: 0.85 }]} />
      <FlapWords x={l} y={330 + h + 50} h={h} cols={cols} seed={6} words={[{ w: "SO", t: 1.4 }, { w: "WHAT", t: 1.55 }, { w: "DO", t: 1.75 }, { w: "I", t: 1.9 }, { w: "LEARN?", t: 2.1, tone: "amber" }]} />
    </>
  );
};

const DEP_COLS: Column[] = [
  { label: "TIME", cols: 5 },
  { label: "DESTINATION", cols: 10 },
  { label: "PLAT", cols: 2, align: "right", tone: "amber" },
  { label: "REMARKS", cols: 9 },
];

const DeparturesDemo: FC = () => (
  <BoardCam at={0} dur={4}>
    <DepartureBoard
      columns={DEP_COLS}
      h={66}
      at={0.1}
      title="DEPARTURES"
      sub="STUDIO CENTRAL"
      rows={[
        { cells: ["09:00", "IDEA", "1", "DEPARTED"], tones: [undefined, undefined, undefined, "green"] },
        { cells: ["09:20", "RESEARCH", "2", "DEPARTED"], tones: [undefined, undefined, undefined, "green"] },
        { cells: ["09:45", "SCRIPT", "3", "BOARDING"], tones: [undefined, "amber", undefined, "amber"], then: [{ at: 1.8, cells: ["09:45", "SCRIPT", "3", "DEPARTED"], tones: [undefined, undefined, undefined, "green"] }] },
        { cells: ["10:10", "RECORD", "4", "DELAYED"], tones: [undefined, undefined, undefined, "red"], then: [{ at: 2.3, cells: ["10:10", "RECORD", "4", "BOARDING"], tones: [undefined, "amber", undefined, "amber"] }] },
        { cells: ["10:30", "EDIT", "5", "ON TIME"] },
      ]}
      focus={[{ row: 2, at: 1.2 }, { row: 3, at: 2.6 }]}
    />
  </BoardCam>
);

const Scene: FC<{ text: string; tone?: "ink" | "amber"; kicker: string }> = ({ text, tone = "ink", kicker }) => {
  const h = 230;
  return (
    <AbsoluteFill>
      <StationWall />
      <FlapRow specs={rowSpecs({ text: kicker, at: -3, tone: "amber", seed: 2 })} x={960} y={300} h={72} anchor="center" rail />
      <FlapRow specs={rowSpecs({ text, at: -3, tone, seed: 3 })} x={960} y={440} h={h} anchor="center" weight={600} rail />
    </AbsoluteFill>
  );
};

const entries: LibraryEntry[] = [
  {
    id: "station-wall",
    kind: "background",
    title: "Dormant station board",
    useFor: "The surface every scene sits on: a wall of dark, blank flap cells under a warm overhead light; one cell somewhere flips a few faces by itself every 40–90 frames and a soft light sweep crosses every 7 s.",
    api: "<StationWall />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "flap-cell",
    kind: "primitive",
    title: "Flap cell (CSS 3D)",
    useFor: "The mechanism under everything: four faces, the old top half falls forward and darkens, the new lower half lands and brightens, the falling flap shadows the lower flap, and the last flap rebounds. Steps come from the drum distance, eased out-quad, with a seeded lag and 4–6 f final flip per cell.",
    api: "<FlapCell spec={{ keys: [{ f, ch, tone?, cap?, laps?, land? }], seed, drum? }} h /> · flapState(spec, frame) · drums ALPHA | NUM | NUMX | DOWN",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: CellDemo,
  },
  {
    id: "click-track",
    kind: "primitive",
    title: "Clack track (SFX on every landing)",
    useFor: "Sound for any flap scene: synthesized plastic clacks placed on the exact frames the cells land, read from the same specs that draw them; simultaneous landings merge into one louder clack. ClickStrip shows the same timing for checking.",
    api: "<ClickTrack specs={[...rowSpecs(...), ...]} volume /> · clackFrames(spec) · <ClickStrip specs x y w frames />",
    seconds: 3,
    origin: ORIGIN,
    Demo: ClickDemo,
  },
  {
    id: "key-line",
    kind: "primitive",
    title: "Words flip in on their spoken word",
    useFor: "The main claim or question, each word starting its flaps on the narration's word time; tone the one key word amber. Up to about 20 cells a row; the board is not for long sentences.",
    api: "<FlapWords x y h cols words={[{ w, t, tone? }]} rail /> · <FlapText text at then out />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: KeyLineDemo,
  },
  {
    id: "title-board",
    kind: "piece",
    title: "Chapter title board",
    useFor: "A chapter or hook card: the amber kicker flips, the big row reads CHAPTER 03 and then re-scrambles into the chapter name, with a status cell that turns from BOARDING to ON TIME.",
    api: '<FlapTitle kicker chapter? title at swapAt? label sub status={[{ at, text, tone }]} out? />',
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <BoardCam dur={3.6}>
        <FlapTitle kicker="NOW DEPARTING" chapter="CHAPTER 03" title="THE PAYOFF" at={0.25} swapAt={1.7} sub="PLATFORM 3" status={[{ at: 0.4, text: "BOARDING", tone: "amber" }, { at: 2.6, text: "ON TIME", tone: "green" }]} />
      </BoardCam>
    ),
  },
  {
    id: "departures",
    kind: "piece",
    title: "List as departures",
    useFor: "Steps, a process, a timeline or any list: each item is a departure with time, destination, platform and remarks. Rows stagger 6 f and columns 2 f; remarks flip between DEPARTED, BOARDING and DELAYED, the active row's lamp blinks and the row nudges.",
    api: "<DepartureBoard columns={[{ label, cols, align?, tone?, drum? }]} rows={[{ cells, tones?, then?: [{ at, cells }] }]} h at title sub focus={[{ row, at }]} out? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: DeparturesDemo,
  },
  {
    id: "stat-board",
    kind: "piece",
    title: "Big number on digit modules",
    useFor: "A stat the narrator says: the number sits on digit-only modules, so every digit reaches its value in a few flaps and the right-hand digits whirr a lap longer. Amber label above, optional unit and caption.",
    api: "<StatBoard label value from? unit? caption? at tone? /> · <FlapNumber value from? cols at x y h />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => <StatBoard label="LINES REVIEWED" value={12480} unit="LOC" caption="IN ONE WEEK - EXAMPLE FIGURE" at={0.2} />,
  },
  {
    id: "countdown",
    kind: "piece",
    title: "Countdown on backwards drums",
    useFor: "Deadlines, timers, 'in the next N minutes', or a music-only intro: mm:ss on modules strung backwards so each second is exactly one flap, with a blinking boarding lamp.",
    api: "<CountdownBoard from={seconds} at label sub status note? /> · <FlapCountdown from at x y h />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => <CountdownBoard from={12} at={0.3} sub="GATE 4" note="PLATFORM 1" />,
  },
  {
    id: "versus",
    kind: "piece",
    title: "A vs B as two gates",
    useFor: "A comparison: two gates side by side, each with its big word and attribute rows, and a verdict row that flips one to ON TIME (green) and the other to CANCELLED (red).",
    api: "<VersusBoard at a={{ gate, word, rows: [[label, value]], verdict: [{ at, text, tone }] }} b={…} />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <VersusBoard
        at={0.2}
        a={{ gate: "GATE A", word: "TUTORIAL", rows: [["YOU KEEP", "NOTES"], ["TIME", "10 HRS"], ["PROOF", "NONE"]], verdict: [{ at: 1.0, text: "BOARDING", tone: "amber" }, { at: 2.5, text: "CANCELLED", tone: "red" }] }}
        b={{ gate: "GATE B", word: "PROJECT", rows: [["YOU KEEP", "SKILLS"], ["TIME", "10 HRS"], ["PROOF", "A REPO"]], verdict: [{ at: 1.3, text: "BOARDING", tone: "amber" }, { at: 2.7, text: "ON TIME", tone: "green" }] }}
      />
    ),
  },
  {
    id: "notice",
    kind: "piece",
    title: "Passenger notice (quote or callout)",
    useFor: "A quote, definition or callout: wrapped onto the board row by row under a PASSENGER NOTICE header with a blinking lamp, attribution in amber. Keep it under about 12 words.",
    api: "<NoticeBoard text by? at label? cols? tone? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <NoticeBoard text={'"SHIP THE UGLY VERSION FIRST."'} by="- THE CREATOR" at={0.2} />,
  },
  {
    id: "source-row",
    kind: "piece",
    title: "Source row (lower third)",
    useFor: "Citing a source or naming a speaker: a slim module bottom-left with an amber SOURCE plate; flips in, and flips back to blank in reverse stagger with `out`.",
    api: "<SourceRow text at out? tag? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => <SourceRow text="DOCS.EXAMPLE.COM/RESEARCH" at={0.2} />,
  },
  {
    id: "leaderboard",
    kind: "piece",
    title: "Leaderboard that re-sorts by flipping",
    useFor: "Rankings that change: rows never move; at the cue every name and score re-scrambles in place to the new order, trend cells flip to green ▲ or red ▼ and changed rows nudge.",
    api: "<Leaderboard title before={[{ name, score }]} after={[…]} at resortAt unit? />",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: () => (
      <Leaderboard title="MOST USED THIS MONTH" unit="VOTES" at={0.1} resortAt={1.8}
        before={[{ name: "JAVASCRIPT", score: 412 }, { name: "PYTHON", score: 388 }, { name: "TYPESCRIPT", score: 301 }, { name: "RUST", score: 120 }, { name: "GO", score: 96 }]}
        after={[{ name: "PYTHON", score: 455 }, { name: "TYPESCRIPT", score: 430 }, { name: "JAVASCRIPT", score: 401 }, { name: "GO", score: 162 }, { name: "RUST", score: 150 }]} />
    ),
  },
  {
    id: "flap-bars",
    kind: "piece",
    title: "Bar chart in flap blocks",
    useFor: "A small chart: each bar is a row of cells that flip to solid blocks left to right, 3 f apart, then its value flips in. Tone the bar that matters amber.",
    api: "<FlapBars title bars={[{ label, value, tone? }]} at max? cells? suffix? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => <FlapBars title="HOURS PER STAGE" suffix=" HRS" at={0.2} bars={[{ label: "IDEA", value: 2 }, { label: "RESEARCH", value: 6 }, { label: "SCRIPT", value: 9, tone: "amber" }, { label: "RECORD", value: 4 }]} />,
  },
  {
    id: "calling-at",
    kind: "piece",
    title: "Calling at (route flow)",
    useFor: "A flow, pipeline or roadmap: stops on a route line, a lamp travels between them on cue, the reached stop re-flips amber and passed stops dim.",
    api: "<CallingAt stops={[…]} at reach={[seconds per stop]} title? sub? />",
    seconds: 3.8,
    origin: ORIGIN,
    Demo: () => <CallingAt stops={["IDEA", "RESEARCH", "SCRIPT", "RECORD", "EDIT"]} at={0.2} reach={[0.9, 1.9, 2.9]} sub="STUDIO LINE" />,
  },
  {
    id: "flip-wipe",
    kind: "transition",
    title: "Flip-wipe between scenes",
    useFor: "This theme's scene change: the frame becomes a stack of giant split-flaps and they fall top to bottom, the old scene's top halves dropping to reveal the new one, with a heavy rebound. Use between chapters; use the board's re-scramble (`then` with scramble) inside one board.",
    api: "<FlipWipe at dur? bands? flip? from={<SceneA/>} to={<SceneB/>} />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => <FlipWipe at={0.5} from={<Scene kicker="NOW ARRIVING" text="PART 01" />} to={<Scene kicker="NOW DEPARTING" text="PART 02" tone="amber" />} />,
  },
  {
    id: "beat-board",
    kind: "piece",
    title: "Now playing (music-only, on the beat clock)",
    useFor: "Music-only videos: inside <Track>, each word's flaps all land together on a downbeat (one big clack), the beat row lands a block on every beat, and the lamp meter follows section energy and the kick.",
    api: "<Track spec={{ bpm, offsetSec, sections }}><BeatBoard words startBar? label? artist? /></Track> · barCues(clock, n) · keys with land: true",
    seconds: 7.6,
    origin: ORIGIN,
    Demo: () => (
      <Track spec={{ bpm: 128, offsetSec: 0.6, sections: [{ name: "intro", start: 0, end: 2.5 }, { name: "build", start: 2.5, end: 5 }, { name: "peak", start: 5, end: 8 }] }}>
        <BeatBoard words={["SHIP", "BREAK", "FIX", "REPEAT"]} />
      </Track>
    ),
  },
];

const theme: LibraryTheme = {
  slug: "split-flap-departure-board",
  name: "Split-flap departure board",
  summary: "Mechanical flip cells that clatter through their drums to land words, numbers and statuses, mounted in a station board with painted amber headers. Built for stats, lists, rankings and chapter cards, and for music-only videos where flaps land on the beat.",
  feel: ["tactile", "nostalgic", "rhythmic", "precise"],
  status: "draft",
  board: "data/references/themes/split-flap-departure-board.md",
  Background: StationWall,
  entries,
};

export default theme;
