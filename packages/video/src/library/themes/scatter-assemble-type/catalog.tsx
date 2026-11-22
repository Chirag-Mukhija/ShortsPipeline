// Catalog of the scatter and assemble type theme: one entry and one demo per reusable item, built from the board, each demo reading as a still on its last frame.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import type { Section } from "../../core/beat";
import { H, W } from "../../core/video";
import { TONE } from "./theme";
import { CENTRE, Song, display } from "./glyphs";
import { Assemble } from "./assemble";
import { DustRing, Field } from "./field";
import { BeatMeter, ColumnSteps, LetterBars, LetterRing, OrbitTitle, PercentCounter, QuoteSign, SourceLine, SplitSort, WordLand } from "./pieces";
import { IrisWipe, NumberGather, RingFocus, SHAPES, ShapeMorph } from "./signature";

const ORIGIN = "scatter-assemble-type board (data/references/themes/scatter-assemble-type.md), after maxmilkin.com";
const entry = (e: Omit<LibraryEntry, "origin">): LibraryEntry => ({ ...e, origin: ORIGIN });

const Background: FC = () => <Field />;

// 120 BPM demo song: beat 0.5 s, bar 2 s.
const SONG: Section[] = [
  { name: "intro", start: 0, end: 2 },
  { name: "build", start: 2, end: 6 },
];

const entries: LibraryEntry[] = [
  entry({
    id: "field",
    kind: "background",
    title: "Sage field with a drifting letter orbit",
    useFor: "Every scene's ground: flat sage (or near-black for dark sections) with a faint orbit of stray letters breathing 1.00 → 1.03 over 150 f, a bracketed scene mark top-left and a tiny letter spinner top-right. Inside <Song> the orbit swells on the kick.",
    api: '<Field tone?="sage|night" dust? mark?="(N°01)"|null spinner? />  ·  parts: <DustRing count r o seed> <Spinner x y text>',
    seconds: 3,
    Demo: () => <Field />,
  }),
  entry({
    id: "letter-loader",
    kind: "primitive",
    title: "Letter ring around a percent counter",
    useFor: "A loader, a cold open or a music-only intro: single letters spawn from the centre 1 f apart, spiral out to a 1.3-turn orbit and keep turning at 0.15°/f, while a tabular counter climbs 0 → 100 % in the dead centre. `out` collapses the ring back inward on the same spiral.",
    api: "<LetterRing text spawn out? tone? orbit?={{ r0, r1, turns, omega, size }} />  ·  <PercentCounter from to hide? x? y? size? ease? />",
    seconds: 4,
    Demo: () => (
      <>
        <LetterRing text="frontend developer creative ideas assemble" spawn={0.1} orbit={{ r0: 150, r1: 420, turns: 1.3, size: 36 }} />
        <PercentCounter from={0.4} to={3.6} />
      </>
    ),
  }),
  entry({
    id: "orbit-title",
    kind: "piece",
    title: "Orbit title: the ring unwinds into the headline",
    useFor: "The hook or chapter card. The title's own letters orbit a 0–100 % counter, then unwind from the ring into an Anton headline on `at`; the subline lands 0.4 s behind and the kicker settles last. Works on narration seconds or bar cues.",
    api: "<OrbitTitle title sub? kicker? spawn at out? exit? tone? size?={150} y? counter? />",
    seconds: 4.8,
    Demo: () => <OrbitTitle kicker="(Chapter 01)" title="What do I learn next?" sub="an honest answer from a student" spawn={0.1} at={3.6} />,
  }),
  entry({
    id: "word-land",
    kind: "piece",
    title: "Key word that snaps together on the spoken word",
    useFor: "One key word or claim: its letters hang scattered across the frame at depth, then snap into place exactly on the word's time and pop 1 → 1.25 → 1. Quiet support lines settle above and below. `mark` turns the word clay (once per scene at most).",
    api: "<WordLand word at pre? preAt? post? postAt? size?={230} y? mark? spread? out? exit? />",
    seconds: 3.6,
    Demo: () => <WordLand pre="Most of the work is" word="reading" post="not writing." at={2.2} mark />,
  }),
  entry({
    id: "ring-focus",
    kind: "piece",
    title: "Sentence ring gives up one word",
    useFor: "A spoken sentence orbits as a ring of letters; on the key word, that word's letters leave the ring, turn upright and line up big in the centre while the rest dim to 35 % and keep turning. The board's emphasis move.",
    api: "<RingFocus text word={index} spawn focus size?={150} ringSize?={40} mark? out? />",
    seconds: 4.2,
    Demo: () => <RingFocus text="every tool you learn is a lens not a ladder" word={6} spawn={0.1} focus={3.1} />,
  }),
  entry({
    id: "column-steps",
    kind: "piece",
    title: "Steps that rain into place in letter columns",
    useFor: "A list or process: each step's letters fall in columns with ghost trails and lock into a row on its word time; earlier rows dim when the next lands and a clay square follows the live row.",
    api: "<ColumnSteps steps={[...]} at={[t0, t1, ...]} heading? x? y? gap? size? out? />",
    seconds: 4.4,
    Demo: () => <ColumnSteps heading="[ The chain ]" steps={["Idea", "Research", "Script", "Record"]} at={[0.9, 1.8, 2.7, 3.6]} />,
  }),
  entry({
    id: "number-gather",
    kind: "piece",
    title: "Big number built from hundreds of letters",
    useFor: "A stat that has to land: the number's shape is filled with a few hundred of its own small digits (or any `letters`) that fly in from everywhere and lock into a grid; the label assembles underneath half a second later.",
    api: "<NumberGather value label? at labelAt? letters?={value} size?={600} step?={21} y? out? />",
    seconds: 3.6,
    Demo: () => <NumberGather value="150" label="words a minute, the pace of a narrator" at={2.2} />,
  }),
  entry({
    id: "split-sort",
    kind: "piece",
    title: "A vs B: one cloud of letters sorts itself",
    useFor: "Comparisons: the letters of both words drift as one mixed cloud, then swirl apart to their own sides on `at`. On `pickAt` the winner pops and gets a clay underline; the loser's letters slump, tilt and dim but stay readable.",
    api: '<SplitSort a b aSub? bSub? at pick?="a|b" pickAt? size?={170} out? />',
    seconds: 4,
    Demo: () => <SplitSort a="Learn" b="Copy" aSub="you own it" bSub="you borrow it" at={2.0} pick="a" pickAt={2.9} />,
  }),
  entry({
    id: "quote-sign",
    kind: "piece",
    title: "Signed quote in small drifting caps",
    useFor: "Quotes and sign-offs, the board's layout habit: left-aligned small caps whose letters drift in from scattered spots in random order, then a hand signature writes itself beside them (40 f, quad-out) and the attribution sets in mono.",
    api: "<QuoteSign quote who at signAt? x? y? maxW? label? out? />  ·  <SignatureStroke x y at scale? d? />",
    seconds: 4.6,
    Demo: () => <QuoteSign quote={"Talk is cheap.\nShow me the code."} who="Linus Torvalds · LKML, 2000" at={2.2} x={300} y={380} maxW={1300} />,
  }),
  entry({
    id: "letter-bars",
    kind: "piece",
    title: "Bar chart of falling letter stacks",
    useFor: "A small chart (2–6 bars): each bar is a stack of its label's letters raining into three columns, bottom row first, while its value counts up and rises with the stack. The highlighted bar is ink with a clay value; the rest stay grey.",
    api: "<LetterBars bars={[{ label, value, letters? }]} at gap?={0.35} max? highlight? title? out? />",
    seconds: 4.2,
    Demo: () => (
      <LetterBars
        title="[ Frames per move · 30 fps ]"
        bars={[
          { label: "Exit", value: 10 },
          { label: "Pop-in", value: 15 },
          { label: "Entrance", value: 18 },
          { label: "Camera", value: 36 },
        ]}
        highlight={3}
        at={1.6}
      />
    ),
  }),
  entry({
    id: "source-line",
    kind: "piece",
    title: "Source line: letters set like type",
    useFor: "Citations and lower thirds: a mono tag, the source's letters sliding in from the right and setting one by one, a mono detail line, a hairline drawn under them and one clay square at the start. Leaves by letting the letters fall.",
    api: '<SourceLine source detail? at out? x? y? tag?="[ SOURCE ]" />',
    seconds: 2.6,
    Demo: () => (
      <>
        <WordLand pre="a narrator speaks about" word="150" post="words a minute" at={0.6} size={200} y={400} spread={320} />
        <SourceLine source="Narrated speech, 150–160 words a minute" detail="core-motion/video.md · pacing to narration" at={1.3} />
      </>
    ),
  }),
  entry({
    id: "iris-wipe",
    kind: "transition",
    title: "Iris wipe that recolours the letters at its edge",
    useFor: "Chapter changes: the ring keeps orbiting while a circle grows from the centre (24 f, expo in-out) and turns sage into near-black; everything is drawn once per tone, so each letter flips colour exactly as the edge passes it. The next heading then rains in.",
    api: '<IrisWipe at from?="sage" to?="night" x? y? frames?={24} field?>{(tone) => <... tone={tone} />}</IrisWipe>',
    seconds: 3.8,
    Demo: () => (
      <IrisWipe at={1.3}>
        {(tone) => (
          <>
            <LetterRing text="chapter two begins where the letters land" spawn={0} tone={tone} out={tone === "night" ? 2.0 : undefined} orbit={{ r0: 160, r1: 430, size: 36 }} />
            {tone === "night" && <Assemble text="Part two" ty={display(190)} x={CENTRE.x} y={CENTRE.y} align="center" anchor="middle" at={3.2} from="above" order="columns" hang={0} dur={0.7} stagger={1.5 / 30} trails tone="night" />}
          </>
        )}
      </IrisWipe>
    ),
  }),
  entry({
    id: "shape-morph",
    kind: "piece",
    title: "Letters riding a stroke, shape to shape",
    useFor: "Diagrams and simple icons drawn with letters: they gather onto a circle, unwind into an arrow, settle into a tick (or any polyline), each on its cue, turning along the stroke; a mono caption names each stage.",
    api: "<ShapeMorph stages={[{ at, paths: SHAPES.circle(cx, cy, r), label? }]} text? n?={56} size?={36} out? />  ·  SHAPES.circle | arrow | check | square",
    seconds: 5,
    Demo: () => (
      <ShapeMorph
        text="idea"
        stages={[
          { at: 1.5, paths: SHAPES.circle(CENTRE.x, 470, 230), label: "an idea" },
          { at: 2.9, paths: SHAPES.arrow(CENTRE.x, 470, 760), label: "a move" },
          { at: 4.3, paths: SHAPES.check(CENTRE.x, 470, 600), label: "done" },
        ]}
      />
    ),
  }),
  entry({
    id: "fall-away",
    kind: "transition",
    title: "Letters fall away, the next line rains in",
    useFor: "A cut between two lines without a cut: every assembling piece takes `out` and an exit. Here `fall` (translateY += 0.8·f², 0.5 f stagger) drops the old line and the new one rains in from above. Other exits: collapse (spiral back to the centre), scatter, fade, slump.",
    api: '<Assemble ... out={cue} exit="fall|collapse|scatter|fade|slump" />  ·  same props on every piece',
    seconds: 3.2,
    Demo: () => (
      <>
        <Assemble text="Old plan." ty={display(220)} x={CENTRE.x} y={CENTRE.y} align="center" anchor="middle" at={0.5} from="scatter" hang={0.2} dur={0.5} out={1.15} exit="fall" />
        <Assemble text="New plan." ty={display(220)} x={CENTRE.x} y={CENTRE.y} align="center" anchor="middle" at={2.5} from="above" order="columns" hang={0} dur={0.75} stagger={1.2 / 30} trails stress={[1]} />
      </>
    ),
  }),
  entry({
    id: "beat-build",
    kind: "piece",
    title: "Music-only: one word lands on every beat",
    useFor: "Music-only cue sheets. Wrap the scene in <Song spec={{ bpm, sections }} from>; give any piece { bar, beat } cues and `perBeat` so word n lands n beats after the first. Stressed words pulse on the kick, the letter orbit swells with it, and BeatMeter shows bar and beat.",
    api: "<Song spec={{ bpm, offsetSec?, sections? }} from?>  ·  <Assemble ... at={{ bar, beat }} perBeat={1} />  ·  <BeatMeter x? y? />  ·  useStage() → { t, cue, pulse, energy, pos, spb }",
    seconds: 4.8,
    Demo: () => (
      <Song spec={{ bpm: 120, sections: SONG }}>
        <AbsoluteFill>
          <DustRing o={0.22} />
          <Assemble text="one word on every beat" ty={display(170)} x={CENTRE.x} y={H / 2 - 30} maxW={W - 400} align="center" anchor="middle" at={{ bar: 2 }} perBeat={1} from="scatter" spread={380} hang={0.4} dur={0.45} stagger={0.4 / 30} order="random" stress={[4]} stressColor={TONE.sage.mark} />
          <BeatMeter />
        </AbsoluteFill>
      </Song>
    ),
  }),
];

const theme: LibraryTheme = {
  slug: "scatter-assemble-type",
  name: "Scatter and assemble type",
  summary: "Single letters orbit, hang in space and snap into place to build words, numbers and shapes; flat sage and deep ink, Anton for the resolved word, Instrument Sans letters, Fragment Mono counters, one clay mark.",
  feel: ["calm", "precise", "orchestral", "quiet-luxury", "kinetic"],
  status: "draft",
  board: "data/references/themes/scatter-assemble-type.md",
  Background,
  entries,
};

export default theme;
