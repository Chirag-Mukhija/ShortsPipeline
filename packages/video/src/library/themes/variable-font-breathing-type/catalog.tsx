// Catalog of the variable font breathing type theme: one entry and one demo per reusable item, each demo built to read as a still.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import { Track, type Section } from "../../core/beat";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { M, MUTED } from "./theme";
import { VarWord, weightWave } from "./type";
import { AxisReadout, Kicker, Specimen } from "./paper";
import { AxisList, PullQuote, SourceLabel, SpokenLine, TitleCard, Versus, WeightStat, WidthChart, type Spoken } from "./pieces";
import { AxisMorph, BeatBreath, FitStack, LineCut, SaysIt } from "./signature";

const ORIGIN = "variable-font-breathing-type board (data/references/themes/variable-font-breathing-type.md)";

// Demo words with evenly spaced fake timings, shaped like narration.json.
const said = (text: string, from: number, gap = 0.24): Spoken[] => text.split(" ").map((w, i) => ({ text: w, start: from + i * gap, end: from + (i + 1) * gap }));

const entry = (e: Omit<LibraryEntry, "origin">): LibraryEntry => ({ ...e, origin: ORIGIN });

const VarWordDemo: FC = () => {
  const { t } = useTime();
  const at = (i: number) => ({
    wght: weightWave(t, i, { base: 560, amp: 360, period: 2.4, phaseStep: 0.11 }),
    wdth: 100 + 24 * Math.sin(2 * Math.PI * (t / 2.4 - i * 0.11) - 0.8),
    slnt: -3 - 3 * Math.sin(2 * Math.PI * (t / 4 - i * 0.05)),
  });
  return (
    <AbsoluteFill>
      <Kicker text="VARWORD · AXES(T, I)" at={0.1} color={MUTED} style={{ position: "absolute", left: M + 6, top: 250 }} />
      <div style={{ position: "absolute", left: M, top: 330 }}>
        <VarWord text="Breathe" size={330} axes={at} />
      </div>
      <AxisReadout axes={at(0)} keys={["wght", "wdth", "slnt"]} color={MUTED} size={30} style={{ position: "absolute", left: M + 6, top: 680 }} />
    </AbsoluteFill>
  );
};

const SaysItDemo: FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: M, top: 210 }}>
      <SaysIt word="HEAVY" meaning="heavy" at={0.2} />
    </div>
    <div style={{ position: "absolute", left: 1010, top: 210 }}>
      <SaysIt word="NARROW" meaning="narrow" at={0.6} />
    </div>
    <div style={{ position: "absolute", left: M, top: 590 }}>
      <SaysIt word="WIDE" meaning="wide" at={1.0} />
    </div>
    <div style={{ position: "absolute", left: 1010, top: 590 }}>
      <SaysIt word="LEAN" meaning="lean" at={1.4} />
    </div>
  </AbsoluteFill>
);

const SECTIONS: Section[] = [
  { name: "build", start: 0, end: 2 },
  { name: "peak", start: 2, end: 8 },
];

const BeatDemo: FC = () => (
  <AbsoluteFill>
    <Specimen tone="night" ghost="Bb" label="PEAK · MUSIC ONLY" />
    <Track spec={{ bpm: 120, sections: SECTIONS }}>
      <BeatBreath
        cards={[
          { text: "One", at: { bar: 1 } },
          { text: "more", at: { bar: 2 } },
          { text: "beat.", at: { bar: 3 }, accent: true },
        ]}
      />
    </Track>
  </AbsoluteFill>
);

const entries: LibraryEntry[] = [
  entry({
    id: "specimen",
    kind: "background",
    title: "Specimen paper with a breathing ghost",
    useFor: "The page every scene sits on: flat paper (or night) with 15 fps grain, a giant ghost 'Aa' bleeding off the corner that breathes through weight, width and slant, and live axis readouts at the top.",
    api: '<Specimen tone?="paper|night" ghost?="Aa" readout? label? />',
    seconds: 3,
    Demo: () => <AbsoluteFill />,
  }),
  entry({
    id: "var-word",
    kind: "primitive",
    title: "VarWord: per-letter axes from the frame",
    useFor: "The engine under everything: split any text into VarGlyphs and give each letter its own weight, width, slant (and opsz/SOFT/MONO) as a function of time and index. weightWave and breathe are the idle presets.",
    api: "<VarWord text size axes={(i, n, ch) => ({ wght, wdth, slnt, color, opacity })} /> · weightWave(t, i, { base, amp, period, phaseStep }) · breathe(t, i, n, base)",
    seconds: 4,
    Demo: VarWordDemo,
  }),
  entry({
    id: "title-card",
    kind: "piece",
    title: "Title card: a wave of weight fills the lines",
    useFor: "Hooks and chapter cards. Each letter starts as a hairline and fills in 2 f after its neighbour, the accent word inflates, then the card breathes until `out` thins it away.",
    api: "<TitleCard lines={[...]} at accent? accentAt? kicker? out? size? />",
    seconds: 3.5,
    Demo: () => <TitleCard kicker="CHAPTER 02 — THE HONEST ANSWER" lines={["What should", "I learn next?"]} accent="learn" at={0.2} accentAt={1.4} />,
  }),
  entry({
    id: "spoken-inflate",
    kind: "piece",
    title: "Spoken line: the key word inflates",
    useFor: "A claim or punchline on the narration's word times. Words fill in from hairline as they're said; key words swell +300 weight, +20 width in accent and the rest of the line compresses to make room.",
    api: "<SpokenLine words={narration words} keys={[idx]} breaks={[idx]} size? out? />",
    seconds: 4,
    Demo: () => <SpokenLine words={said("AI writes the code. You own the idea.", 0.2, 0.3)} breaks={[4]} keys={[7]} size={136} />,
  }),
  entry({
    id: "axis-list",
    kind: "piece",
    title: "Axis list: now is heavy, done is thin",
    useFor: "Steps, a chain, an agenda. The item being said fills in heavy and wide; when the next one arrives it thins and condenses to grey, so the eye always lands on the heaviest word.",
    api: "<AxisList title? items={[{ label, at }]} size? out? />",
    seconds: 3.6,
    Demo: () => (
      <AxisList
        title="THE CHAIN"
        items={[
          { label: "Idea", at: 0.2 },
          { label: "Research", at: 0.8 },
          { label: "Script", at: 1.4 },
          { label: "Record", at: 2.0 },
        ]}
      />
    ),
  }),
  entry({
    id: "weight-stat",
    kind: "piece",
    title: "Weight stat: the number gets heavier as it counts",
    useFor: "A big number on the word that says it. It counts up and its weight tracks the value (value / max), so a big number looks heavy; the readout prints the weight, the label lands after.",
    api: "<WeightStat value at max? prefix? suffix? decimals? label? out? />",
    seconds: 3.5,
    Demo: () => <WeightStat value={150} max={160} at={0.3} label="words a minute: a narrator's pace" />,
  }),
  entry({
    id: "versus",
    kind: "piece",
    title: "Stacked axes: A vs B",
    useFor: "A comparison. Two stacked words swing on opposed axes (one thickens as the other thins) until `at`, then the winner swells wide and heavy in accent and the loser collapses to a grey hairline.",
    api: "<Versus a b at winner?={0|1} notes?={[a, b]} enter? size? />",
    seconds: 3.6,
    Demo: () => <Versus a="BUILD" b="WATCH" at={2.0} notes={["you keep it", "you forget it"]} />,
  }),
  entry({
    id: "pull-quote",
    kind: "piece",
    title: "Soft quote, hard word",
    useFor: "A quote or callout. Fraunces with its SOFT axis breathing through the letters; the stressed word hardens (soft to sharp, light to heavy, WONK on) in accent.",
    api: "<PullQuote lines={[...]} at accent? accentAt? by? size? />",
    seconds: 4,
    Demo: () => <PullQuote lines={["Talk is cheap.", "Show me the code."]} accent="code" at={0.2} accentAt={1.6} by="LINUS TORVALDS · LKML, 2000" />,
  }),
  entry({
    id: "width-chart",
    kind: "piece",
    title: "Width chart: the words are the bars",
    useFor: "A small bar chart (2–5 rows). Each label is stretched by its width axis to its value's length; a hairline rule under it shows the exact length, so the data stays honest.",
    api: "<WidthChart rows={[{ label, value, key? }]} at title? unit? max? length? size? />",
    seconds: 3.6,
    Demo: () => (
      <WidthChart
        title="FRAMES PER MOVE · 30 FPS"
        unit=" f"
        at={0.3}
        rows={[
          { label: "EXIT", value: 10 },
          { label: "POP-IN", value: 15 },
          { label: "ENTRANCE", value: 20 },
          { label: "CAMERA", value: 36, key: true },
        ]}
      />
    ),
  }),
  entry({
    id: "source-label",
    kind: "piece",
    title: "Source lower third",
    useFor: "Citing a source or naming a person: an accent rule draws, the title fills in from hairline, the mono detail settles under it; leaves in 8 f on `out`.",
    api: "<SourceLabel title detail? at out? tag? />",
    seconds: 2.5,
    Demo: () => <SourceLabel title="Speech runs 150 to 160 words a minute" detail="core-motion/video.md · pacing to narration" at={0.2} />,
  }),
  entry({
    id: "line-cut",
    kind: "transition",
    title: "Line cut: squeezed to a line, unfolded into the next word",
    useFor: "The theme's scene transition. The outgoing word squeezes to 25 % width and hairline weight, flattens into an accent rule that sweeps the frame, and the next word unfolds out of it. collapseStyle/unfoldStyle do the same to any scene.",
    api: "<LineCut from to at size? fromLook? toLook? color? /> · collapseStyle(e) · unfoldStyle(e)",
    seconds: 3,
    Demo: () => <LineCut from="Learn" to="Build" at={1.5} toLook={{ wght: 920, wdth: 132 }} />,
  }),
  entry({
    id: "axis-morph",
    kind: "piece",
    title: "Axis morph: THICK to THIN to THINK",
    useFor: "Signature. A word re-cuts itself into the next word: shared letters hold and re-weight, the others cross-fade in 8 f while their slots open or close. Best when the axis change is the meaning.",
    api: "<AxisMorph steps={[{ text, at, look: { wght, wdth } }]} size? y? idle? readout? />",
    seconds: 4,
    Demo: () => (
      <AxisMorph
        steps={[
          { text: "THICK", at: 0.2, look: { wght: 1000, wdth: 151 } },
          { text: "THIN", at: 1.4, look: { wght: 100, wdth: 25 } },
          { text: "THINK", at: 2.6, look: { wght: 640, wdth: 100 } },
        ]}
      />
    ),
  }),
  entry({
    id: "fit-stack",
    kind: "piece",
    title: "Fit stack: weight goes up, width gives way",
    useFor: "Signature hero. A justified block where each line's weight swings on its own phase and MeasuredLine solves the width axis every frame, so both edges stay flush while the letters trade weight for width.",
    api: "<FitStack lines={[...]} at width? maxSize? accent? guides? /> · <MeasuredLine text size width wght /> · fitWidth(text, size, px, wght)",
    seconds: 4,
    Demo: () => <FitStack lines={["WEIGHT GOES UP,", "WIDTH GIVES WAY,", "EDGES STAY PUT."]} at={0.2} accent={2} />,
  }),
  entry({
    id: "says-it",
    kind: "piece",
    title: "Says it: the word acts out its meaning",
    useFor: "Signature. Meaning shown by the letterform alone: HEAVY gains weight, NARROW narrows, WIDE widens, LEAN leans (also light, grow, shrink). One per beat, on the spoken word.",
    api: '<SaysIt word meaning="heavy|light|wide|narrow|lean|grow|shrink" at dur? size? readout? />',
    seconds: 3,
    Demo: SaysItDemo,
  }),
  entry({
    id: "beat-breath",
    kind: "piece",
    title: "Beat breath: kicks ripple through the letters",
    useFor: "Music-only text cards inside <Track>. Each card fills in on its cue, every kick sends a weight ripple through the letters, downbeats widen them, and section energy sets the depth. A 1-2-3-4 counter pulses in the corner.",
    api: "<Track spec={{ bpm, sections }}><BeatBreath cards={[{ text, at: Cue, accent? }]} size? counter? tone? /></Track>",
    seconds: 5,
    Demo: BeatDemo,
  }),
];

const theme: LibraryTheme = {
  slug: "variable-font-breathing-type",
  name: "Variable font breathing type",
  summary: "Type as a living material: weight, width and slant ripple through each letter, emphasis lands by changing the letterform itself, on a flat specimen page.",
  feel: ["fluid", "editorial", "alive", "typographic", "monochrome + one accent"],
  status: "draft",
  board: "data/references/themes/variable-font-breathing-type.md",
  Background: () => <Specimen />,
  entries,
};

export default theme;
