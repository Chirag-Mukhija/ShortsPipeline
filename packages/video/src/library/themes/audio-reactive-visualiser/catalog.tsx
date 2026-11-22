// Catalog of the audio-reactive visualiser theme: one entry and demo per reusable item, all on a synthetic 120 BPM track (beat 0.5 s, bar 2 s).
import type { FC, ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { Track, type Section } from "../../core/beat";
import { useTime } from "../../core/time";
import { H } from "../../core/video";
import { MONO_WHITE, SUNRISE } from "./theme";
import { synthEnergyCurve } from "./signal";
import { BeatPulse, Void } from "./primitives";
import { EnergyEnvelope, RadialSpectrum, SpectrumBars, WaveRing } from "./spectrum";
import { BeatTunnel, GeometryLoop, ParticleBurst, VectorScope } from "./geometry";
import { KickWord, MeterStat, PresetSwitch, Sequencer, SignalQuote, SplitScope, TitleReveal, TrackId } from "./pieces";

const ORIGIN = "audio-reactive-visualiser board (data/references/themes/audio-reactive-visualiser.md)";
const entry = (e: Omit<LibraryEntry, "origin">): LibraryEntry => ({ ...e, origin: ORIGIN });

// Demos last N.1 s so the previewed last frame sits just after a beat, where the music is visibly hitting.
const PEAK: Section[] = [{ name: "peak", start: 0, end: 60 }];
const BUILD: Section[] = [{ name: "build", start: 0, end: 60 }];
const SONG: Section[] = [
  { name: "intro", start: 0, end: 16 },
  { name: "build", start: 16, end: 40 },
  { name: "peak", start: 40, end: 64 },
  { name: "breathe", start: 64, end: 80 },
  { name: "out", start: 80, end: 96 },
];
const CURVE = synthEnergyCurve(SONG, 0.25, 3);

const Song: FC<{ sections?: Section[]; children: ReactNode }> = ({ sections = PEAK, children }) => (
  <Track spec={{ bpm: 120, sections }}>
    <AbsoluteFill>{children}</AbsoluteFill>
  </Track>
);

const Background: FC = () => <Void />;

const EnvelopeDemo: FC = () => {
  const { t } = useTime();
  return (
    <Song>
      <EnergyEnvelope curve={CURVE} length={96} sections={SONG} at={0.2} now={interpolate(t, [0.5, 3.5], [2, 58], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    </Song>
  );
};

const entries: LibraryEntry[] = [
  entry({
    id: "void",
    kind: "background",
    title: "The void: orbiting particles, polar guides, floor trace",
    useFor: "Every scene's ground. Near-black #07070C, a tilted disc of seeded particles orbiting with short trails (brighter on the kick), polar guide rings turning 0.1°/f, a floor trace that never goes flat, slow hue drift, faint grain. Idle life even in silence.",
    api: "<Void palette?={NEON|SUNRISE|MONO_WHITE} particles?={240} guides? floor? samples? intensity? />",
    seconds: 3.1,
    Demo: () => null,
  }),
  entry({
    id: "spectrum-bars",
    kind: "primitive",
    title: "Mirrored spectrum bars with peak caps",
    useFor: "The classic centre-line visualiser for a whole section. Bass in the middle, highs at the edges, mirrored below; bars grow from the baseline staggered by bin (20 f) and shrink + desaturate on `out` (24 f). Peak caps hold and fall.",
    api: "<SpectrumBars at out? bins?={64} mirror? symmetric? height? y? palette? caps? samples?={Sampler} />",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <SpectrumBars at={0.2} />
      </Song>
    ),
  }),
  entry({
    id: "radial-dots",
    kind: "primitive",
    title: "Radial dot-matrix spectrum",
    useFor: "A logo-like centrepiece: 72 spokes of LED dots lit outward by the spectrum, mirrored with the bass at the top, opening from radius 0 (30 f out-expo) and turning 0.1°/f; the core ring scales up to 12 % on the bass.",
    api: "<RadialSpectrum at radius?={200} bins?={36} rows?={11} rotation?={0.1} core? palette? samples? />",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <RadialSpectrum at={0.2} />
      </Song>
    ),
  }),
  entry({
    id: "title-reveal",
    kind: "piece",
    title: "Title reveal in a wave ring",
    useFor: "The opening card or a chapter title: on the first downbeat a ring wipes out and the title blurs in, tracking from wide, held by a three-colour WaveRing. Kicker and metadata are tiny mono.",
    api: "<TitleReveal text at kicker? info? ring?={330} palette? samples? />  ·  <WaveRing r amplitude at harmonics? samples? />",
    seconds: 3.1,
    Demo: () => (
      <Song sections={BUILD}>
        <TitleReveal text="Night Drive" kicker="No. 07 — side A" info="120 BPM · 3:42 · instrumental" at={1} />
      </Song>
    ),
  }),
  entry({
    id: "kick-word",
    kind: "piece",
    title: "Kick word: punch, flash, chromatic split",
    useFor: "One word landing on a kick or a drop: zoom punch 1.2 → 1 in 12 f, a 2 f flash, a cyan/magenta split that decays and re-fires small on later kicks, speed lines out of both sides.",
    api: "<KickWord word at sub? size?={210} palette? />  ·  <ChromaticPeak amount palette>{…}</ChromaticPeak> works on anything",
    seconds: 2.6,
    Demo: () => (
      <Song>
        <KickWord word="Louder" sub="bar 17 · the drop" at={1} />
      </Song>
    ),
  }),
  entry({
    id: "sequencer",
    kind: "piece",
    title: "Step-sequencer list",
    useFor: "A list or steps as rows of a 16-step grid: each row arms on its cue, the playhead sweeps 16ths and lit cells flash as it passes; earlier rows dim so the newest step leads.",
    api: "<Sequencer items={[{ label, at }]} heading? steps?={16} palette? />",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <Sequencer heading="How a track gets made" items={[{ label: "Find the loop", at: 0.3 }, { label: "Stack the layers", at: 0.9 }, { label: "Cut the drop", at: 1.5 }, { label: "Let it breathe", at: 2.1 }]} />
      </Song>
    ),
  }),
  entry({
    id: "meter-stat",
    kind: "piece",
    title: "Meter stat: scanline number, L/R meters",
    useFor: "A big number or stat: counts up out-expo in scanline type (the spectrum's bars run through the digits), with stereo LED meters either side riding the bass and highs.",
    api: "<MeterStat value at label from? dur? prefix? suffix? palette? samples? />",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <MeterStat value={10000} at={0.3} label="hours of practice" />
      </Song>
    ),
  }),
  entry({
    id: "split-scope",
    kind: "piece",
    title: "Split scope: A vs B as two oscilloscopes",
    useFor: "A comparison: two graticule panels, a calm clean sine on the left and a busy trace built from the live spectrum on the right, each drawing on at its cue, VS between.",
    api: "<SplitScope a={{ tag, title, note?, at }} b={{ tag, title, note?, at }} palette? samples? />",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <SplitScope a={{ tag: "A · before", title: "One loop", note: "1 layer · 4 bars", at: 0.3 }} b={{ tag: "B · after", title: "The whole track", note: "12 layers · 64 bars", at: 1 }} />
      </Song>
    ),
  }),
  entry({
    id: "signal-quote",
    kind: "piece",
    title: "Signal-gap quote",
    useFor: "A quote or callout: a waveform across the frame parts into two traces on cue, goes quiet in the middle and the words blur in, one by one, in the gap.",
    api: "<SignalQuote text at by? size?={56} gap?={300} palette? samples? />",
    seconds: 3.6,
    Demo: () => (
      <Song>
        <SignalQuote text="Make the thing you wish you could hear." by="studio note" at={0.4} />
      </Song>
    ),
  }),
  entry({
    id: "energy-envelope",
    kind: "piece",
    title: "Energy envelope of the song",
    useFor: "The chart or map piece: the whole track's loudness as mirrored bars, sections bracketed underneath (peak in accent), lit up to a playhead with its timecode. Feed RMS per frame from an offline pass, or synthEnergyCurve(sections).",
    api: "<EnergyEnvelope curve={number[]} length={songSec} now sections? smoothing?={2} at? palette? />",
    seconds: 3.6,
    Demo: EnvelopeDemo,
  }),
  entry({
    id: "track-id",
    kind: "piece",
    title: "Now-playing lower third with licence",
    useFor: "Source label for the music: track, artist and licence (the studio records every track's licence) beside a spinning mini radial spectrum, wiped in behind a bright scan edge.",
    api: "<TrackId title artist license at out? palette? samples? />",
    seconds: 2.6,
    Demo: () => (
      <Song>
        <AbsoluteFill style={{ opacity: 0.55 }}>
          <WaveRing r={200} amplitude={30} at={0} cy={H / 2 - 60} />
        </AbsoluteFill>
        <TrackId title="Night Drive" artist="Example Artist" license="CC BY 4.0" at={0.3} />
      </Song>
    ),
  }),
  entry({
    id: "preset-switch",
    kind: "transition",
    title: "Preset switch on the bar line",
    useFor: "Section changes: visual presets swap on a bar line with a 6 f dissolve and a palette change; cues in `drops` also zoom-punch 1 → 1.2 → 1 and flash.",
    api: "<PresetSwitch at={[{ bar: 9 }, …]} drops?={[{ bar: 17 }]} labels?>{scene1}{scene2}…</PresetSwitch>",
    seconds: 4.6,
    Demo: () => (
      <Song>
        <PresetSwitch at={[{ bar: 2 }, { bar: 3 }]} drops={[{ bar: 2 }]} labels={["01 / build · neon", "02 / peak · sunrise", "03 / breathe · mono"]} palette={SUNRISE}>
          <SpectrumBars at={0} />
          <RadialSpectrum at={2} palette={SUNRISE} />
          <GeometryLoop at={3.6} palette={MONO_WHITE} />
        </PresetSwitch>
      </Song>
    ),
  }),
  entry({
    id: "vector-scope",
    kind: "piece",
    title: "Vector scope: Lissajous with trails",
    useFor: "Signature hold for a calm or hypnotic passage: an XY oscilloscope figure on a graticule, swelling on the bass, fizzing on the highs, trailing its last 9 frames; its ratio changes with each song section.",
    api: "<VectorScope at size?={340} ratio?={[3, 2]} length?={9} fade?={0.7} palette? samples? />  ·  trail(length, fade, draw) / <TrailBuffer>",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <VectorScope at={0.2} />
      </Song>
    ),
  }),
  entry({
    id: "geometry-loop",
    kind: "piece",
    title: "Geometry loop: nested polygons",
    useFor: "Signature for builds and ambient loops: nine nested hexagons, each turning at a multiple of the base angle so they drift in and out of alignment, tied by lattice lines; each layer breathes on its own spectrum bin.",
    api: "<GeometryLoop at sides?={6} layers?={9} base?={5} lattice? palette? samples? />  ·  wrap in <BeatPulse strength bpm? samples?>",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <BeatPulse strength={0.04}>
          <GeometryLoop at={0.1} />
        </BeatPulse>
      </Song>
    ),
  }),
  entry({
    id: "particle-burst",
    kind: "piece",
    title: "Particle burst on the beat table",
    useFor: "Signature for the drop: seeded particles leave the centre on every beat (downbeats bigger), streaking with drag; the `drop` cue fires a full shock ring; hi-hats scatter sparkles.",
    api: "<ParticleBurst at drop? count?={34} speed? life? sparkles? palette? />",
    seconds: 2.6,
    Demo: () => (
      <Song>
        <ParticleBurst at={0.5} drop={2} />
      </Song>
    ),
  }),
  entry({
    id: "beat-tunnel",
    kind: "piece",
    title: "Beat tunnel",
    useFor: "Signature push-in for builds: a polygon is born at the vanishing point on every beat and flies at the camera over 6 beats, downbeats doubled in white, colour stepping by bar, rails turning.",
    api: "<BeatTunnel at sides?={4} life?={6} spin?={6} rails? palette? />",
    seconds: 3.1,
    Demo: () => (
      <Song>
        <BeatTunnel at={0} />
      </Song>
    ),
  }),
];

export const audioReactiveVisualiser: LibraryTheme = {
  slug: "audio-reactive-visualiser",
  name: "Audio-reactive visualiser",
  summary: "Music-only, no lyrics. Neon geometry, particles, spectrum and scope forms on a near-black void, every one driven frame by frame by the beat clock or a real track's spectrum. Text is small and secondary.",
  feel: ["hypnotic", "electronic", "abstract", "hi-fi", "music-only"],
  status: "draft",
  board: "data/references/themes/audio-reactive-visualiser.md",
  Background,
  entries,
};

export default audioReactiveVisualiser;
