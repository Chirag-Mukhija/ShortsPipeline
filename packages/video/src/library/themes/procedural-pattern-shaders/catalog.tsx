// Catalog of the procedural-pattern-shaders theme: one entry and a still-readable demo per piece, all driven by the shared pattern engine.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { Track } from "../../core/beat";
import { FieldBackdrop, ChapterCard, HalftoneStat, HookRays, KnockoutWord, PatternBars, PatternWord, QuoteBorder, SourceTag, StepTiles, VersusSplit } from "./pieces";
import { BeatField, PatternDissolve, PatternIris, SwatchGrid } from "./scenes";
import { INK, MARGIN, PAGE, PALETTES, WHITE } from "./theme";
import { Display, Label, Page, RiseLines } from "./type";

const ORIGIN = "procedural-pattern-shaders board (draft, not yet used in a video)";

const Background: FC = () => <Page color={PAGE} />;

const Tag: FC<{ text: string; dark?: boolean }> = ({ text, dark }) => (
  <div style={{ position: "absolute", left: MARGIN, bottom: MARGIN }}>
    <Label color={dark ? INK : WHITE} plate={dark ? WHITE : INK}>{text}</Label>
  </div>
);

const entries: LibraryEntry[] = [
  {
    id: "field-backdrop",
    kind: "background",
    title: "Live pattern field",
    useFor: "A whole-frame pattern behind a chapter or a music-only stretch: idle life from pattern time, the slow hold camera (1 → 1.12, 0 → 6°) and a 4× speed ramp on stressed words. Any of the 10 patterns.",
    api: "<FieldBackdrop pattern colors params? speed? hold={[start, dur]} ramps={[t…]} /> · or <SpiralField|SwirlField|WaveField|VoronoiField|PerlinBlobs|DotGridOrbit|MetaballsField|GodRays|StripeField />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <FieldBackdrop pattern="spiral" colors={PALETTES.pool} params={[1, 8]} hold={[0, 3]} ramps={[1.4]}>
        <Tag text="spiral · pool · hold camera" />
      </FieldBackdrop>
    ),
  },
  {
    id: "hook-rays",
    kind: "piece",
    title: "Hook card on god rays",
    useFor: "The opening hook or a title: indigo rays fan down from above, the hook rises in line by line, the rays flare and speed up on the stressed word.",
    api: "<HookRays lines={[…]} at eyebrow? stress? colors? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => <HookRays eyebrow="before you buy another laptop" lines={["Your laptop", "is lying to you"]} at={0.3} stress={1.3} />,
  },
  {
    id: "chapter-card",
    kind: "piece",
    title: "Chapter window",
    useFor: "Chapter cards: a rounded window of pattern irises open on the flat page, one huge word lands in it (difference blend), number and chapter title rise below.",
    api: "<ChapterCard pattern colors at num word title page? ink? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => <ChapterCard pattern="swirl" colors={PALETTES.blush} at={0.2} num="02" word="Memory" title="Where the time actually goes" />,
  },
  {
    id: "pattern-word",
    kind: "piece",
    title: "Word filled with pattern",
    useFor: "The key word or claim landing on a spoken word: one giant word with the live pattern inside its letters; it stamps down at the word time while the pattern runs 4× and tightens.",
    api: "<PatternWord text pattern colors at size? y? page? caption? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => <PatternWord text="cache" pattern="waves" colors={PALETTES.mustard} params={[7, 3.4, 0.3, 0.32]} at={0.5} caption="lands on the stressed word" />,
  },
  {
    id: "knockout-word",
    kind: "piece",
    title: "Word knocked out of the field",
    useFor: "A loud claim or chapter keyword: the field assembles itself cell by cell, then the word cuts through it as a hole showing the flat page.",
    api: "<KnockoutWord text pattern colors at page? label? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => <KnockoutWord text="latency" pattern="voronoi" colors={PALETTES.amber} at={1.1} label="text knocked out of the pattern" />,
  },
  {
    id: "step-tiles",
    kind: "piece",
    title: "Steps as pattern tiles",
    useFor: "A list or 3–4 steps: each step is a square pattern window that irises open on its cue, with a number disc, a label and one line under it.",
    api: "<StepTiles steps={[{ label, sub?, pattern, colors, params? }]} at={[t1, t2, t3]} />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <StepTiles
        at={[0.3, 1.0, 1.7]}
        steps={[
          { label: "Measure", sub: "find the slow part", pattern: "spiral", colors: PALETTES.pool, params: [1, 7] },
          { label: "Profile", sub: "see where it waits", pattern: "voronoi", colors: PALETTES.amber, params: [3] },
          { label: "Fix", sub: "change one thing", pattern: "metaballs", colors: PALETTES.ember, params: [1.5, 0.8] },
        ]}
      />
    ),
  },
  {
    id: "halftone-stat",
    kind: "piece",
    title: "Halftone stat",
    useFor: "A big number or share: the number counts up while the dots inside a disc swell into a wedge of the same share. Percentages and 'x of y' stats.",
    api: "<HalftoneStat value suffix? caption at dur? colors? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => <HalftoneStat value={73} caption="the wedge of big dots is the same share as the number" at={0.4} />,
  },
  {
    id: "versus-split",
    kind: "piece",
    title: "Calm vs loud split",
    useFor: "A comparison (A vs B): two fields split on a leaning seam, a slow quiet pattern against a fast loud one, each side named on a flat plate.",
    api: "<VersusSplit a={{ word, sub?, pattern, colors }} b={{ … }} at aAt? bAt? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <VersusSplit
        at={0.2}
        a={{ word: "Order", sub: "one rule, repeated", pattern: "stripes", colors: PALETTES.pool, params: [0.7, 6, 0, 0] }}
        b={{ word: "Chaos", sub: "many rules colliding", pattern: "swirl", colors: PALETTES.sunset, params: [1, 2.8, 0.2] }}
      />
    ),
  },
  {
    id: "quote-border",
    kind: "piece",
    title: "Quote in a pulsing border",
    useFor: "A quote or callout: lines rise inside a glowing rounded outline whose colour flows around the frame and pulses on the cue.",
    api: "<QuoteBorder lines={[…]} by at colors? /> · <PulsingBorder box={{ x, y, w, h }} pulse? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => <QuoteBorder lines={["Let the pattern do the talking,", "then get out of its way."]} by="studio note" at={0.5} />,
  },
  {
    id: "pattern-bars",
    kind: "piece",
    title: "Pattern-filled bars",
    useFor: "A chart: every bar is a window into one stripe field and the bar that matters switches to a second pattern; values count up as bars grow.",
    api: "<PatternBars bars={[{ label, value }]} at title unit? highlight? base? hot? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <PatternBars title="Renders this week" at={0.5} highlight={3} bars={[{ label: "Mon", value: 3 }, { label: "Tue", value: 5 }, { label: "Wed", value: 4 }, { label: "Thu", value: 9 }, { label: "Fri", value: 6 }]} />
    ),
  },
  {
    id: "source-tag",
    kind: "piece",
    title: "Source tag",
    useFor: "Source labels and lower thirds: an ink plate wipes in with a small live pattern swatch, the source name and its address.",
    api: "<SourceTag name detail kind? at out? look? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <AbsoluteFill>
        <FieldBackdrop pattern="perlin" colors={PALETTES.lilac} speed={0.6} />
        <SourceTag name="Paper Shaders" detail="shaders.paper.design" at={0.3} />
      </AbsoluteFill>
    ),
  },
  {
    id: "pattern-iris",
    kind: "transition",
    title: "Pattern iris",
    useFor: "Cutting between two sections: a circle of the next pattern opens from a point (0 → 150 % in 20 f, expo-out) while both keep running.",
    api: "<PatternIris from={look} to={look} at centre? dur? fromContent? toContent? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <PatternIris
        at={0.86}
        from={{ pattern: "spiral", colors: PALETTES.pool, params: [1, 8] }}
        to={{ pattern: "metaballs", colors: PALETTES.ember, params: [1.4, 1] }}
        fromContent={<Tag text="section a" />}
        toContent={<Tag text="section b" dark />}
      />
    ),
  },
  {
    id: "pattern-dissolve",
    kind: "transition",
    title: "Pattern becomes the mask",
    useFor: "The board's signature transition: scene A's own pattern is the mask, so as the threshold rises it drops out cell by cell (or stripe by stripe) and scene B shows through.",
    api: "<PatternDissolve a={look} at dur? aContent?>{scene B}</PatternDissolve>",
    seconds: 2.2,
    origin: ORIGIN,
    Demo: () => (
      <PatternDissolve
        at={0.7}
        a={{ pattern: "voronoi", colors: PALETTES.amber }}
        aContent={<AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}><div style={{ background: INK, padding: "28px 44px 20px" }}><Display size={140}>Part one</Display></div></AbsoluteFill>}
      >
        <Page color={PAGE}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28 }}>
            <RiseLines at={1.1} lines={[<Display key="p" size={180} color={INK}>Part two</Display>]} />
            <Label color={INK} size={34}>the fix</Label>
          </AbsoluteFill>
        </Page>
      </PatternDissolve>
    ),
  },
  {
    id: "swatch-grid",
    kind: "camera",
    title: "Live swatch wall, zoom into one",
    useFor: "'Choose one of N' beats: a 4×3 wall of live patterns, the pick gets a ring while the rest dim, then the camera dives in until that pattern is the whole frame.",
    api: "<SwatchGrid pick at select? dur? items? title? />",
    seconds: 3.3,
    origin: ORIGIN,
    Demo: () => <SwatchGrid pick={3} at={1.7} select={0.8} />,
  },
  {
    id: "beat-field",
    kind: "piece",
    title: "Beat-driven field (music-only)",
    useFor: "Music-only sections: pattern speed follows section energy, dots punch on the kick, the palette crossfades at each section, one word per bar on top. Wrap in core <Track>.",
    api: "<Track spec={{ bpm, sections }}><BeatField pattern? palettes={{ intro, build, peak… }} words? labels? /></Track>",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <Track spec={{ bpm: 120, sections: [{ name: "intro", start: 0, end: 1 }, { name: "build", start: 1, end: 2.5 }, { name: "peak", start: 2.5, end: 4 }] }}>
        <BeatField palettes={{ intro: PALETTES.lilac, build: PALETTES.sunset, peak: PALETTES.ember }} words={["hold", "drop"]} />
      </Track>
    ),
  },
];

export const proceduralPatternShaders: LibraryTheme = {
  slug: "procedural-pattern-shaders",
  name: "Procedural pattern shaders",
  summary: "Bold, flat, hypnotic procedural patterns (spiral, swirl, zigzag waves, voronoi, perlin blobs, dot orbit, metaballs, god rays, stripes, pulsing border) as whole-frame backgrounds, windows, letter fills, knockouts and masks. One small WebGL engine with a CPU fallback.",
  feel: ["graphic", "hypnotic", "poster-like", "playful", "tactile"],
  status: "draft",
  board: "data/references/themes/procedural-pattern-shaders.md",
  Background,
  entries,
};

export default proceduralPatternShaders;
