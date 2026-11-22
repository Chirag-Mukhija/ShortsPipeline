// Catalog of the ASCII/dither theme: pictures drawn out of characters and dither marks, one entry and demo per reusable item.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { Track, type Section } from "../../core/beat";
import { useTime } from "../../core/time";
import { W, H } from "../../core/video";
import { clamp01, place, smooth, type Field } from "./field";
import { chip, cube, eye, globe, sphere, sun, bolt } from "./pics";
import { GlyphGround, Headline, Mono, MonoWindow } from "./primitives";
import { GlyphChart, GlyphImage, GlyphStat, GlyphSteps, GlyphVersus, GlyphWord, MarkSheet, QuoteWall, SourceLabel } from "./pieces";
import { DitherSwap, GlyphMorph, GlyphZoom, ScanSwap } from "./transitions";
import { BeatField, CueCard } from "./music";
import { GROUND, M } from "./theme";

const ORIGIN = "ascii-dither-text-image board (data/references/themes/ascii-dither-text-image.md)";
const entry = (e: Omit<LibraryEntry, "origin">): LibraryEntry => ({ ...e, origin: ORIGIN });

const Background: FC = () => <GlyphGround />;

// Full-frame pictures shared by several demos.
const EYE = place(eye([0.25, -0.1]), W, H, 1.0, W / 2, H / 2 + 30);
const GLOBE = place(globe(0.4), W, H, 0.9);

// The quote wall reads the eye as light: bright sclera, dark pupil, a glow that falls off toward the frame edge.
const EYE_LIGHT: Field = (() => {
  const cy = H * 0.4;
  const e = place(eye([0.2, 0]), W, H, 0.95, W / 2, cy);
  return (x, y) => {
    const fall = 1 - smooth(0.7, 1.25, Math.hypot((x - W / 2) / 560, (y - cy) / 300));
    return clamp01(0.1 + 0.9 * (1 - e(x, y)) * fall);
  };
})();

const ImageDemo: FC = () => (
  <>
    <MonoWindow x={410} y={70} w={1100} h={660} title="eye.png" meta="109×36 · ascii" at={0.2}>
      <GlyphImage pic={eye([0.3, -0.1])} w={1096} h={604} at={1.0} scale={0.88} cell={10} />
    </MonoWindow>
    <Headline words={[{ w: "It", t: 2.2 }, { w: "learned", t: 2.35 }, { w: "to", t: 2.55 }, { w: "see.", t: 2.7, accent: true }]} y={800} size={120} />
  </>
);

const MorphDemo: FC = () => {
  const { t } = useTime();
  const keys = [
    { field: place(chip, W, H, 0.85), t: 0, name: "chip.svg" },
    { field: place(globe(0.3), W, H, 0.85), t: 0.9, name: "globe.svg" },
    { field: place(eye(), W, H, 0.95), t: 1.8, name: "eye.png" },
    { field: place(sun(0.1), W, H, 0.85), t: 2.7, name: "sun.svg" },
  ];
  const g = GROUND.paper;
  return (
    <>
      <GlyphMorph keys={keys} />
      <div style={{ position: "absolute", left: M, top: M - 40 }}>
        {keys.map((k, i) => {
          const on = t >= k.t && (keys[i + 1] === undefined || t < keys[i + 1]!.t);
          return <Mono key={k.name} color={on ? g.ink : g.soft} style={{ marginRight: 28, opacity: on ? 1 : 0.55 }}>{`${k.name}${i < keys.length - 1 ? "  →" : ""}`}</Mono>;
        })}
      </div>
    </>
  );
};

const PEAK: Section[] = [{ name: "peak", start: 0, end: 60 }];

const entries: LibraryEntry[] = [
  entry({
    id: "glyph-ground",
    kind: "background",
    title: "Glyph ground: paper with drifting dots",
    useFor: "Every scene's ground. Paper grey #ECECEC (or black #0A0A0A) with a barely-there field of '.' and ':' drifting slowly, 3 % of cells flickering: idle life that never competes with the picture.",
    api: '<GlyphGround ground?="paper"|"black" amount? />',
    seconds: 2,
    Demo: () => null,
  }),
  entry({
    id: "glyph-image",
    kind: "piece",
    title: "Glyph picture resolves from noise",
    useFor: "The hero: any picture (procedural SDF art, a field, or a photo via src) as a character grid. Cells start as random glyphs and lock radially from the centre, then the grid pushes in 8 % over the hold; scrambles out at `out`. Wrap in MonoWindow for the windowed look.",
    api: "<GlyphImage pic|field|src x y w h at out? mark? cell? scale? push? /> inside <MonoWindow title meta at>",
    seconds: 3.6,
    Demo: ImageDemo,
  }),
  entry({
    id: "title-card",
    kind: "piece",
    title: "Title card: a word engraved in characters",
    useFor: "Hook or chapter card: one big word built of type (dense glyphs on the outline, a lighter textured fill), resolving radially, with the human headline in serif under it.",
    api: "<GlyphWord words={[{ w, t }]} y h /> + <Headline words={[{ w, t, accent? }]} y size />",
    seconds: 3.4,
    Demo: () => (
      <>
        <Mono color={GROUND.paper.soft} style={{ position: "absolute", left: M, top: M - 40 }}>ep.04 / signal.txt</Mono>
        <GlyphWord words={[{ w: "SIGNAL", t: 0.3 }]} y={130} h={500} />
        <Headline words={[{ w: "How", t: 1.4 }, { w: "a", t: 1.5 }, { w: "model", t: 1.6 }, { w: "learns", t: 1.8 }, { w: "to", t: 2.0 }, { w: "read", t: 2.1, accent: true }, { w: "the", t: 2.3 }, { w: "world", t: 2.4 }]} y={730} size={96} />
      </>
    ),
  }),
  entry({
    id: "word-reform",
    kind: "piece",
    title: "Glyph word re-forms on each spoken word",
    useFor: "A key word or a three-beat claim landing on the narration: the letters scramble and their density lerps into the next word on its word time (12 f); the accent word flips red with a 6 f hard scramble, then locks. The Matthis Garnier intro, in our type.",
    api: "<GlyphWord words={[{ w, t, accent? }]} x y w h mark? out? />",
    seconds: 3.0,
    Demo: () => <GlyphWord words={[{ w: "DATA", t: 0.3 }, { w: "BECOMES", t: 1.2 }, { w: "IMAGE", t: 2.1, accent: true }]} y={220} h={620} />,
  }),
  entry({
    id: "glyph-steps",
    kind: "piece",
    title: "Steps with glyph thumbnails",
    useFor: "A list or process said item by item: each row's little picture resolves from noise as it's named, the label decodes in serif, earlier rows fade back and the live index turns red.",
    api: "<GlyphSteps steps={[{ label, note?, pic, t }]} mark? />",
    seconds: 3.8,
    Demo: () => (
      <GlyphSteps
        steps={[
          { label: "Sample the picture", note: "one luminance value per cell", pic: sphere(), t: 0.3 },
          { label: "Quantise it", note: "snap to ten levels of ink", pic: cube, t: 1.1 },
          { label: "Pick a mark", note: "a glyph, a dot or a dither", pic: sun(), t: 1.9 },
          { label: "Redraw every frame", note: "so the picture can move", pic: eye(), t: 2.7 },
        ]}
      />
    ),
  }),
  entry({
    id: "glyph-stat",
    kind: "piece",
    title: "A number made of digits",
    useFor: "The big stat: the figure is drawn out of the digits 0–9 (density → digit), counts up with the digits churning, and locks red on landing; serif label and mono caption under it.",
    api: "<GlyphStat value from? at dur? decimals? prefix? suffix? label={Word[]} caption? />",
    seconds: 3.2,
    Demo: () => <GlyphStat value={8640} at={0.3} label={[{ w: "glyphs", t: 1.7 }, { w: "redrawn", t: 1.85 }, { w: "every", t: 2.0 }, { w: "frame", t: 2.1 }]} caption="160 × 54 cells · 30 fps" />,
  }),
  entry({
    id: "glyph-versus",
    kind: "piece",
    title: "A vs B as two glyph pictures",
    useFor: "Comparisons: two pictures side by side, each in its own mark; at the verdict the winner's cells flip red and the loser fades to a ghost.",
    api: '<GlyphVersus a={{ label, pic, mark?, note? }} b={...} at verdict? winner?="a"|"b" />',
    seconds: 3.0,
    Demo: () => (
      <GlyphVersus
        a={{ label: "Pixels", pic: sphere(), mark: "bayer", note: "1 bit, Bayer 8×8" }}
        b={{ label: "Glyphs", pic: sphere(), mark: "ascii", note: "ten levels of ink" }}
        at={0.3}
        verdict={2.0}
      />
    ),
  }),
  entry({
    id: "quote-wall",
    kind: "piece",
    title: "Quote over a wall of its own letters",
    useFor: "A quote or callout: full-bleed black wall made of the quote's own text, letter opacity carrying a picture (the burgundy-studio eye), the quote in big serif over a scrim, attribution in mono.",
    api: "<QuoteWall quote={Word[]} by field|pic|src at? wall? cell? />",
    seconds: 3.5,
    Demo: () => (
      <QuoteWall
        field={EYE_LIGHT}
        at={0.2}
        quote={[{ w: "Talk", t: 1.2 }, { w: "is", t: 1.35 }, { w: "cheap.", t: 1.45 }, { w: "Show", t: 1.85 }, { w: "me", t: 2.0 }, { w: "the", t: 2.1 }, { w: "code.", t: 2.2, accent: true }]}
        by="— Linus Torvalds · LKML, 2000"
      />
    ),
  }),
  entry({
    id: "glyph-chart",
    kind: "piece",
    title: "Bar chart built of glyphs",
    useFor: "Charts and comparisons of size: bars made of characters, dense at the root and lighter at the tip; the growing tip churns, values decode as each bar lands, one bar may turn red.",
    api: "<GlyphChart bars={[{ label, value, accent? }]} at stagger? max? unit? title={Word[]} mark? />",
    seconds: 3.6,
    Demo: () => (
      <GlyphChart
        title={[{ w: "Cells", t: 0.1 }, { w: "per", t: 0.2 }, { w: "frame,", t: 0.3 }, { w: "by", t: 0.4 }, { w: "column", t: 0.5 }, { w: "width", t: 0.6 }]}
        at={0.6}
        bars={[{ label: "24 px", value: 2160 }, { label: "16 px", value: 4800 }, { label: "12 px", value: 8640, accent: true }, { label: "8 px", value: 19920 }]}
      />
    ),
  }),
  entry({
    id: "source-label",
    kind: "piece",
    title: "Source label with a dithered swatch",
    useFor: "Lower third for a source or a name: a little dithered sphere develops from noise, a red SOURCE tag, the citation decodes in mono; scrambles away at `out`.",
    api: "<SourceLabel text sub? at out? x? y? />",
    seconds: 2.4,
    Demo: () => (
      <>
        <GlyphImage pic={globe(0.6)} x={1000} y={120} w={820} h={640} at={0} push={0} scale={0.9} ink={GROUND.paper.soft} />
        <SourceLabel text="Bitmap Dream · one field, six mark renderers" sub="daniel-portfolio-bmf.pages.dev" at={0.4} />
      </>
    ),
  }),
  entry({
    id: "mark-sheet",
    kind: "piece",
    title: "One field, six mark renderers",
    useFor: "Signature: the same picture drawn as ASCII, Bayer 8×8, blue noise, halftone, hatch and scanlines at once. For 'it's all the same data' and for explaining how images become marks.",
    api: "<MarkSheet pic|field|src at stagger? live?={0..5} />",
    seconds: 2.8,
    Demo: () => <MarkSheet pic={sun(0.1)} at={0.2} live={0} />,
  }),
  entry({
    id: "glyph-morph",
    kind: "transition",
    title: "Density morph between pictures",
    useFor: "Signature transition and logo moment: a chip becomes a globe becomes an eye. Every cell lerps its brightness to the next shape over 12 f and re-picks its glyph, so the grid never cuts.",
    api: "<GlyphMorph keys={[{ field, t }]} dur? mark? />",
    seconds: 3.0,
    Demo: MorphDemo,
  }),
  entry({
    id: "dither-develop",
    kind: "transition",
    title: "Dither develop / wipe",
    useFor: "Scene change: picture A becomes picture B as each 1-bit cell flips once its Bayer threshold drops under the sweep (40 f), so it 'develops' in a stable ordered pattern; bias leans it into a left-to-right wipe.",
    api: '<DitherSwap a b at dur? bias? mark?="bayer" cell? />',
    seconds: 2.5,
    Demo: () => <DitherSwap a={EYE} b={GLOBE} at={0.5} bias={0.6} mark="bayer" cell={6} />,
  }),
  entry({
    id: "scan-swap",
    kind: "transition",
    title: "Scan-bar swap",
    useFor: "A crisp chapter change: a 2 px red bar sweeps left to right in 20 f, erasing picture A; B exists only behind it and the columns at the bar churn.",
    api: "<ScanSwap a b at dur? dir? mark? />",
    seconds: 2.0,
    Demo: () => <ScanSwap a={place(chip, W, H, 0.85)} b={place(bolt, W, H, 0.85)} at={0.5} />,
  }),
  entry({
    id: "glyph-zoom",
    kind: "camera",
    title: "Push into the glyphs",
    useFor: "Camera move: zoom about a point until single characters fill the frame and become the texture; each cell keeps its sample, so glyphs grow instead of flickering. A natural 'go deeper' or chapter push.",
    api: "<GlyphZoom field at dur? to? focus={[x, y]} />",
    seconds: 3.0,
    Demo: () => <GlyphZoom field={EYE} at={0.4} dur={2.2} to={9} focus={[1010, 500]} />,
  }),
  entry({
    id: "beat-field",
    kind: "piece",
    title: "Music-only: the field breathes on the beat",
    useFor: "Music-only videos: rings ride outward once per beat around a picture, the kick swells the field, energy drives shimmer and noise, and the mark renderer cuts on every downbeat. Cue cards decode over it and hold 1.5 s + 0.3 s a word. Wrap in core <Track>.",
    api: "<Track spec={{ bpm, sections }}><BeatField pic? marks? accentBars? /><CueCard words at /></Track>",
    seconds: 4.1,
    Demo: () => (
      <Track spec={{ bpm: 120, sections: PEAK }}>
        <AbsoluteFill>
          <BeatField pic={eye()} />
          <CueCard words={[{ w: "Every", t: 1.0 }, { w: "pixel", t: 1.0 }, { w: "is", t: 1.0 }, { w: "a", t: 1.0 }, { w: "letter.", t: 1.0, accent: true }]} at={1.0} y={860} size={96} />
        </AbsoluteFill>
      </Track>
    ),
  }),
];

const theme: LibraryTheme = {
  slug: "ascii-dither-text-image",
  name: "ASCII and dither text-image",
  summary: "Pictures, logos and words drawn out of characters and dither marks: one density field per frame, handed to ASCII, digit, text-wall, Bayer, blue-noise, halftone, hatch or scanline renderers, so images resolve, morph and scramble.",
  feel: ["nerdy", "monochrome", "hypnotic", "retro-terminal", "intelligent"],
  status: "draft",
  board: "data/references/themes/ascii-dither-text-image.md",
  Background,
  entries,
};

export default theme;

