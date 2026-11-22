// Catalog of the lyric visualiser theme: one entry and one demo per reusable item, each demo on a 120 BPM grid (beat 0.5 s, bar 2 s) and built to read as a still.
import type { FC, ReactNode } from "react";
import { interpolate } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { useTime } from "../../core/time";
import { H } from "../../core/video";
import { Track, type Section } from "./beat";
import { Lens, Night } from "./atmosphere";
import { BeatDots, GlowText, LyricLine, LyricScroll } from "./type";
import { Constellation, EnergyArc, ProgressTick, QuoteCard, SectionTitle, SourceLabel, StatGlow, ThenNow, TitleCard } from "./pieces";
import { BeatCrossfade, DropHit, DustDissolve, SpectrumHalo } from "./signature";
import { SKY } from "./theme";

const ORIGIN = "lyric-visualiser-music-only board (data/references/themes/lyric-visualiser-music-only.md)";
const entry = (e: Omit<LibraryEntry, "origin">): LibraryEntry => ({ ...e, origin: ORIGIN });

// A 96 s demo song: 8-bar intro, 12-bar build, 12-bar peak, 8-bar breathe, 8-bar out.
const SONG: Section[] = [
  { name: "intro", start: 0, end: 16 },
  { name: "build", start: 16, end: 40 },
  { name: "peak", start: 40, end: 64 },
  { name: "breathe", start: 64, end: 80 },
  { name: "out", start: 80, end: 96 },
];
const At: FC<{ sections?: Section[]; from?: number; children: ReactNode }> = ({ sections, from, children }) => (
  <Track spec={{ bpm: 120, sections }} from={from}>
    {children}
  </Track>
);
const PEAK: Section[] = [{ name: "peak", start: 0, end: 20 }];

const Background: FC = () => <Night />;

const EnergyArcDemo: FC = () => {
  const { t } = useTime();
  return (
    <At>
      <EnergyArc sections={SONG} at={0.3} now={interpolate(t, [0.5, 4.2], [4, 50], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} box={{ x0: 180, x1: 1740, y0: 330, y1: 800 }} />
    </At>
  );
};

const entries: LibraryEntry[] = [
  entry({
    id: "night",
    kind: "background",
    title: "Night sky: gradient drift, bokeh, dust, grain",
    useFor: "The whole film's background. The violet sky eases to each section's colours over 2 bars and hue-rotates 10° per 30 s; seeded bokeh drift with parallax and swell on the kick; dust rises at 0.1–0.3 px/f; 4 % grain at 15 fps. `day` gives the cream variant; `wave` adds a faint waveform along the bottom.",
    api: "<Night day? colors?={[deep, lifted]} shifts?={[{ at, colors }]} span?={2} bokeh?={16} dust? wave? grain? />  ·  parts: <GradientDrift> <BokehField count speed palette seed> <Dust> <Grain> <Vignette>",
    seconds: 3,
    Demo: () => (
      <At sections={PEAK}>
        <Night wave bokeh={22} boost={1.2} />
      </At>
    ),
  }),
  entry({
    id: "beat-clock",
    kind: "primitive",
    title: "Beat clock, progress tick and count-in dots",
    useFor: "Every cue on a music-only video comes from here: wrap a scene in <Track spec={{ bpm, offsetSec, signature, sections }} from={songTimeAtFrame0}> and give pieces song seconds or { bar, beat }. ProgressTick is the dotted timeline (one dot per bar, section names), BeatDots counts in the last bar before a change.",
    api: "beatClock({ bpm, offsetSec?, signature?, sections? }) → { spb, spBar, barSec(bar, beat), cue, pos(t), pulse(t), energy(t), sectionAt, table(bars) }  ·  <Track spec from?>  ·  useSong()  ·  <ProgressTick duration />  ·  <BeatDots from beats? />",
    seconds: 4,
    Demo: () => (
      <At sections={SONG} from={37.5}>
        <SectionTitle n={2} text="Build" at={16} out={39.75} />
        <SectionTitle n={3} text="Peak" at={{ bar: 21 }} />
        <LyricLine words="count it in" at={37.6} v="cool" size={64} upper y={H / 2 - 40} out={{ bar: 21 }} exit="blur" />
        <BeatDots from={{ bar: 20 }} y={H / 2 + 80} />
        <GlowText text="on the one." at={{ bar: 21 }} size={210} y={H / 2 - 40} />
        <ProgressTick duration={96} />
      </At>
    ),
  }),
  entry({
    id: "title-card",
    kind: "piece",
    title: "Title card: one word per beat, waveform grows beneath",
    useFor: "The opening frame or a chapter card. A wide-tracked kicker settles its tracking over a beat, the title lands one word per beat in Fraunces italic (stressed word flips to pink), then the waveform line draws outward over a bar and the subline fades up.",
    api: '<TitleCard title at kicker? sub? stress?={[i]} size?={190} out? wave? />  ·  wrap the scene in <Lens from to blurIn> for the slow 1.00 → 1.06 push',
    seconds: 4,
    Demo: () => (
      <At>
        <Lens from={0} to={4} blurIn={0}>
          <TitleCard kicker="a song about" title="learning to build" at={0.5} stress={[2]} sub="one desk · one year · no words" />
        </Lens>
      </At>
    ),
  }),
  entry({
    id: "lyric-line",
    kind: "primitive",
    title: "Lyric line, word by word on the beat",
    useFor: "Any text card: each word fades up 24 px in 12 f on its cue (3 f stagger, or one per beat); the stressed word flips to accent for a beat, glows and grows 8 %. `out=\"auto\"` holds it for the music-only rule (1.5 s + 0.3 s per word); exits drift up 16 px or blur out. Voices: emo (Fraunces italic), cool (Inter Light +80), drop (Bebas, 6 f hit).",
    api: '<LyricLine words={[{ text, at }] | "string"} at? stagger?={sec | "beat"} v?="emo|cool|drop" size? stress? align?="center|left" x? y? out?={cue | "auto"} exit?="drift|blur" />  ·  holdFor(words)',
    seconds: 3.5,
    Demo: () => (
      <At>
        <LyricLine
          words={[
            { text: "every", at: 0.3 },
            { text: "night", at: 0.55 },
            { text: "I", at: 0.8 },
            { text: "built", at: 1.05 },
            { text: "something", at: 1.3 },
            { text: "small", at: 1.8 },
          ]}
          stress={[3]}
          size={124}
          y={H / 2 - 60}
        />
        <LyricLine words="and it was enough" at={2.3} v="cool" size={50} y={H / 2 + 175} color="#CFC8EA" />
      </At>
    ),
  }),
  entry({
    id: "glow-word",
    kind: "primitive",
    title: "Glow word pulsing on the beat",
    useFor: "One key word or claim that has to carry a whole bar: it blurs in, then its glow blooms on every kick (scaled by the section's energy) or on chosen beats, and its letter-spacing breathes 0 → +20 px across each bar.",
    api: '<GlowText text at v?="emo|cool|drop" size?={220} pulseBeats?={"every" | [cues]} breathe? glowColor? y? out? />',
    seconds: 4.1,
    Demo: () => (
      <At sections={PEAK}>
        <LyricLine words="and it finally felt" at={0.2} v="cool" size={48} y={H / 2 - 175} color="#CFC8EA" />
        <GlowText text="alive." at={0.9} size={250} y={H / 2 + 20} />
      </At>
    ),
  }),
  entry({
    id: "lyric-scroll",
    kind: "piece",
    title: "Lyric scroll for lists and steps",
    useFor: "A list, steps or a verse: the active line is bright with a pink index; on each cue the stack eases up a row, past lines shrink, dim and soften, and the next line waits faintly a bar early. Up to ~6 short lines.",
    api: '<LyricScroll lines={[{ text, at, v? }]} x? y? size?={112} numbered? />',
    seconds: 4.2,
    Demo: () => (
      <At>
        <LyricScroll
          y={H * 0.66}
          size={104}
          lines={[
            { text: "write the idea down", at: 0.3 },
            { text: "find what already works", at: 1.3 },
            { text: "say it in your own words", at: 2.3 },
            { text: "then press record", at: 3.3 },
          ]}
        />
      </At>
    ),
  }),
  entry({
    id: "stat-glow",
    kind: "piece",
    title: "Stat counted on the beat",
    useFor: "The one number of a section: it steps up once per beat (a tick lights under it each beat), lands on the last beat with a pink bloom, then the label fades up 8 f later. Number in Fraunces Light, unit in italic.",
    api: "<StatGlow value at from? beats?={4} decimals? prefix? suffix? label? size?={300} y? out? />",
    seconds: 4.6,
    Demo: () => (
      <At>
        <StatGlow value={365} beats={8} at={0.4} suffix="days" label="of showing up" />
      </At>
    ),
  }),
  entry({
    id: "then-now",
    kind: "piece",
    title: "Then / now",
    useFor: "A comparison or before/after: the left line is cool and muted; a bar later the right line lands in emotive italic with a glow, and the left recedes (dims, softens). A pulsing waveform stands between them.",
    api: "<ThenNow a={{ tag, text }} b={{ tag, text, stress? }} at bAt? />",
    seconds: 3.6,
    Demo: () => (
      <At>
        <ThenNow a={{ tag: "Then", text: "watching tutorials at 2 am" }} b={{ tag: "Now", text: "shipping my own", stress: [2] }} at={0.3} bAt={1.8} />
      </At>
    ),
  }),
  entry({
    id: "quote-day",
    kind: "piece",
    title: "Quote card (day variant)",
    useFor: "A quote, a note to self or a callout: Fraunces italic word by word, a new line every half bar, a soft giant quote mark behind, accent words in colour, the attribution a bar after. Shown on the cream day palette; drop `day` for night.",
    api: "<QuoteCard lines={[…]} at by? accentWords?={['word']} day? size?={92} />  ·  background: <Night day />",
    seconds: 4.4,
    Demo: () => (
      <At>
        <Night day bokeh={10} />
        <QuoteCard day lines={["You don't find the time.", "You build it, one", "late night at a time."]} accentWords={["build"]} by="a note to self" at={0.3} />
      </At>
    ),
  }),
  entry({
    id: "captions",
    kind: "piece",
    title: "Section title and source label",
    useFor: "The film's quiet chrome. SectionTitle ('02 / Build') fades in top-left at each section start after a short pink line; SourceLabel wipes in lower-left under any fact card ([n] plus where it's from), so the cue sheet's [src] tags are visible.",
    api: "<SectionTitle n text at out? />  ·  <SourceLabel n? text at out? />",
    seconds: 3,
    Demo: () => (
      <At>
        <SectionTitle n={2} text="Build" at={0.2} />
        <LyricLine words="frame by frame, on the beat" at={0.5} v="emo" size={112} stress={[4]} />
        <SourceLabel n={2} text="remotion.dev · audio visualization" at={1.4} />
      </At>
    ),
  }),
  entry({
    id: "energy-arc",
    kind: "piece",
    title: "Energy arc / glowing curve chart",
    useFor: "A chart in this theme's language: a cyan-to-pink curve that draws point to point, one point per beat, over a soft area; one point can be the accent. EnergyArc maps song sections (intro, build, peak, breathe, out) to it with a playhead, and the same energy drives bokeh, glow and sway everywhere.",
    api: "<PulseChart points={[{ label, value }]} at perBeats? highlight? title? values?={(v) => string} box? />  ·  <EnergyArc sections at now? />  ·  clock.energy(t)",
    seconds: 4.2,
    Demo: EnergyArcDemo,
  }),
  entry({
    id: "constellation",
    kind: "piece",
    title: "Constellation flow",
    useFor: "A flow or a journey: each step is an orb that lights on its beat with a bloom and a ring that breathes on every beat; a thread draws from the last orb with a spark at its head. The highlighted step turns pink with an italic label.",
    api: "<Constellation nodes={[{ label, at }]} highlight?={i} y? rise? />",
    seconds: 4,
    Demo: () => (
      <At>
        <Constellation
          highlight={4}
          nodes={[
            { label: "blank page", at: 0.3 },
            { label: "rough idea", at: 1.05 },
            { label: "first draft", at: 1.8 },
            { label: "late nights", at: 2.55 },
            { label: "something real", at: 3.3 },
          ]}
        />
      </At>
    ),
  }),
  entry({
    id: "beat-crossfade",
    kind: "transition",
    title: "Crossfade on the beat with a sky shift",
    useFor: "The default way one card hands over to the next: the outgoing line blurs (or drifts) out 6 f before the beat, the incoming fades in on it, while the sky eases to the next section's colours over 2 bars.",
    api: "<BeatCrossfade at a={<…/>} b={<…/>} exit?=\"blur|drift\" />  ·  <Night shifts={[{ at, colors: SKY.breathe }]} span={2} />",
    seconds: 3.6,
    Demo: () => (
      <At>
        <Night shifts={[{ at: 1.5, colors: SKY.breathe }]} span={1} />
        <BeatCrossfade
          at={1.5}
          a={<LyricLine words="the quiet part" at={0.2} v="cool" size={84} upper />}
          b={<LyricLine words="then it clicked." at={1.5} v="emo" size={150} stress={[2]} />}
        />
      </At>
    ),
  }),
  entry({
    id: "drop-hit",
    kind: "piece",
    title: "The drop",
    useFor: "The peak's downbeat, once or twice a film: a riser line widens its tracking over the last bar while four dots count in; on the one a 2 f white flash, a hard cut to the pink peak sky, Bebas words hit on the 8ths (6 f from 130 %), a double shockwave and a camera kick.",
    api: "<DropHit at words riser? size?={300} sky? />  ·  <FlashCut at frames?={2} />",
    seconds: 3.6,
    Demo: () => (
      <At>
        <DropHit at={{ bar: 2 }} riser="wait for it" words="SHIP IT." />
      </At>
    ),
  }),
  entry({
    id: "spectrum-halo",
    kind: "piece",
    title: "Spectrum halo",
    useFor: "A peak or instrumental passage with no words to show: a ring of spectrum bars (bass at the top, mirrored) breathes around one word. Driven by the beat clock with no audio; pass `samples` (visualizeAudio per frame) for the real track, smoothed over 5 f.",
    api: '<SpectrumHalo at word? v?="drop|emo" r?={250} bars?={88} len?={170} samples?={(frame) => number[]} />  ·  <WaveformLine y amp bins samples? draw? />',
    seconds: 4.1,
    Demo: () => (
      <At sections={PEAK}>
        <SpectrumHalo at={0.2} word="LOUDER" size={150} r={220} />
      </At>
    ),
  }),
  entry({
    id: "dust-dissolve",
    kind: "transition",
    title: "Dissolve into dust",
    useFor: "The out section or a last line: the line breaks into glowing dust letter by letter, left to right across a bar (or `spread` s), and the dust rises and fades into the sky.",
    api: '<DustDissolve text at inAt? spread? v?="emo" size?={150} particles?={9} />',
    seconds: 3.8,
    Demo: () => (
      <At sections={[{ name: "out", start: 0, end: 10 }]}>
        <DustDissolve text="see you next year" inAt={0.2} at={1.5} spread={5} particles={14} />
      </At>
    ),
  }),
];

export const lyricVisualiserMusicOnly: LibraryTheme = {
  slug: "lyric-visualiser-music-only",
  name: "Lyric visualiser (music-only)",
  summary: "Short written lines land on the beat over a drifting violet night sky with bokeh, dust and grain; text and rhythm carry the whole video. Every cue is song time or a bar/beat on the BPM grid.",
  feel: ["rhythmic", "emotive", "minimal", "cinematic", "hypnotic"],
  status: "draft",
  board: "data/references/themes/lyric-visualiser-music-only.md",
  Background,
  entries,
};

export default lyricVisualiserMusicOnly;
