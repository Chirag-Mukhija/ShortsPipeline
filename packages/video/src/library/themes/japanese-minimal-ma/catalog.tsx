// Catalog of the Japanese minimal (ma) theme: one entry and one small demo per reusable item, each composed with the theme's 70 % empty page.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { useTime } from "../../core/time";
import { GREY, MARGIN, SERIF, SHU, SUMI, SUMI_SOFT } from "./theme";
import { MaPaper } from "./paper";
import { BreathHold, Brush, Caps, Fill, Hairline, Hanko, InkDot, MaSong, Stage, Text, VerticalText, hush } from "./primitives";
import { Colophon, HairlineDivide, KeyLine, MarginTitle, OneObject, QuietFigure, SteppingStones } from "./pieces";
import { EnsoCycle, HangingScroll, Kasumi } from "./signature";
import { MeasuredSilence } from "./music";

const ORIGIN = "theme build (japanese-minimal-ma board), not yet in a video";

// The paper alone, with the palette named small in the corner like a printer's note.
const WashiDemo: FC = () => (
  <>
    <Stage>
      <circle cx={MARGIN + 10} cy={930} r={10} fill="none" stroke={GREY} strokeWidth={1.4} />
      <InkDot x={MARGIN + 54} y={930} r={10} at={0.2} d={0.6} />
      <InkDot x={MARGIN + 98} y={930} r={10} at={0.5} d={0.6} color={SHU} />
    </Stage>
    <Caps x={MARGIN + 136} y={913} at={0.3}>
      {"washi · sumi · shu"}
    </Caps>
  </>
);

const VerticalDemo: FC = () => (
  <>
    <VerticalText x={1660} y={140} columns={["A QUIET HOUR BEFORE", "THE FIRST LINE OF CODE"]} size={34} at={0.3} />
    <VerticalText x={560} y={250} columns={["STILL"]} size={88} upright font={SERIF} weight={300} color={SUMI} at={1.4} stagger={0.12} />
  </>
);

const LineDemo: FC = () => (
  <Stage>
    <Brush ctrl={[[380, 420], [700, 370], [1040, 360], [1330, 392]]} width={34} at={0.2} d={1.5} seed={4} />
    <Brush ctrl={[[1460, 300], [1500, 420], [1490, 560]]} width={22} at={1.4} d={1.0} seed={8} tail={0.5} dry={0.4} />
    <Hairline pts={[[MARGIN, 760], [1728, 760]]} at={1.0} d={1.6} breath />
    <Hairline pts={[[MARGIN, 800], [900, 800]]} at={1.8} d={1.2} color={SUMI_SOFT} w={1.2} />
  </Stage>
);

const InkDemo: FC = () => (
  <Stage>
    <InkDot x={1240} y={600} r={250} at={0.2} d={2.4} wash={0.16} seed={3} />
    <InkDot x={640} y={420} r={62} at={0.9} d={1.4} seed={5} />
    <InkDot x={1240} y={600} r={22} at={1.8} d={1.0} seed={7} />
  </Stage>
);

const HankoDemo: FC = () => {
  const { t } = useTime();
  const dim = hush(t, 1.6);
  return (
    <Fill>
      <Fill style={{ opacity: dim }}>
        <Text x={MARGIN + 48} y={430} size={86} at={0.1}>
          ma
        </Text>
        <Text x={MARGIN + 48} y={540} size={46} italic at={0.5} color={SUMI_SOFT}>
          {"the interval; the space between"}
        </Text>
      </Fill>
      <Stage>
        <Hanko x={1180} y={520} size={210} at={1.6} />
      </Stage>
    </Fill>
  );
};

const TitleDemo: FC = () => <MarginTitle kicker="Chapter one" lines={["What to learn", "when AI writes code"]} side="AN HONEST ANSWER · NO. 01" at={0.2} />;

const KeyDemo: FC = () => (
  <KeyLine
    words={[
      { w: "The", t: 0.3 },
      { w: "work", t: 0.55 },
      { w: "is", t: 0.8 },
      { w: "mostly", t: 1.0 },
      { w: "reading.", t: 1.45, key: true },
    ]}
  />
);

const StonesDemo: FC = () => (
  <SteppingStones
    steps={[
      { label: "Idea", at: 0.3 },
      { label: "Research", at: 1.1 },
      { label: "Script", at: 1.9 },
      { label: "Record", at: 2.7 },
    ]}
  />
);

const FigureDemo: FC = () => <QuietFigure value={150} at={1.6} label="Words a minute" note="the pace of a narrator" folio="FIG. 01" />;

const DivideDemo: FC = () => (
  <HairlineDivide left={{ word: "Watch", note: "and you forget it" }} right={{ word: "Build", note: "and you keep it" }} at={{ line: 0.1, left: 0.7, right: 1.5, pick: 2.6 }} pick="right" />
);

const ScrollDemo: FC = () => (
  <>
    <VerticalText x={520} y={200} columns={["ON SIMPLICITY"]} size={32} at={0.2} />
    <HangingScroll lines={["Simplicity is", "prerequisite", "for reliability."]} by="Edsger W. Dijkstra" meta="EWD 498 · 1975" at={0.4} />
  </>
);

const EnsoDemo: FC = () => (
  <EnsoCycle
    title="THE LOOP"
    at={0.2}
    steps={[
      { label: "Learn", at: 1.3 },
      { label: "Build", at: 1.9 },
      { label: "Ship", at: 2.5 },
      { label: "Reflect", at: 3.1 },
    ]}
  />
);

const ColophonDemo: FC = () => (
  <>
    <Text x={1100} y={300} size={72} at={0.1} color={SUMI_SOFT} italic>
      {"“about 150 words a minute”"}
    </Text>
    <Colophon text="Narrated speech, 150–160 words a minute" detail="core-motion / video.md · pacing" at={0.8} />
  </>
);

const SceneA: FC = () => (
  <>
    <Caps x={MARGIN} y={300}>
      Part one
    </Caps>
    <Text x={MARGIN - 4} y={350} size={110}>
      Before
    </Text>
  </>
);
const SceneB: FC = () => (
  <>
    <Caps x={1728} y={600} align="right">
      Part two
    </Caps>
    <Text x={1732} y={650} size={110} align="right">
      After
    </Text>
  </>
);
const KasumiDemo: FC = () => <Kasumi at={1.4} from={<SceneA />} to={<SceneB />} />;

const ObjectDemo: FC = () => (
  <BreathHold at={0}>
    <Text x={MARGIN + 48} y={250} size={58} italic at={1.4} color={SUMI_SOFT}>
      one idea, held long enough to see
    </Text>
    <OneObject at={0.2} />
  </BreathHold>
);

const SilenceDemo: FC = () => (
  <MaSong spec={{ bpm: 72, offsetSec: 0.4, sections: [{ name: "intro", start: 0, end: 4 }, { name: "build", start: 4, end: 12 }] }}>
    <MeasuredSilence words={["breathe", "slowly", "again"]} accentBar={2} />
  </MaSong>
);

const entries: LibraryEntry[] = [
  {
    id: "washi",
    kind: "background",
    title: "Washi with falling motes",
    useFor: "Every ma scene: warm white paper with kozo fibres and cloudy pulp, a breath of edge shade, and a few motes and petals falling at 0.3 px a frame (more of them as music energy rises).",
    api: "<MaPaper /> (= <Washi /> + <PetalDrift count? seed? />)",
    seconds: 2,
    origin: ORIGIN,
    Demo: WashiDemo,
  },
  {
    id: "vertical-text",
    kind: "primitive",
    title: "Vertical columns",
    useFor: "Edge labels, a chapter's signature column, one upright word. Columns run top to bottom, first on the right; each letter fades in down the column. Sideways for phrases, upright for short words.",
    api: "<VerticalText x y columns={[...]} at size upright? stagger? times? font? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: VerticalDemo,
  },
  {
    id: "line-draw",
    kind: "primitive",
    title: "Brush stroke and hairline",
    useFor: "A loaded sumi stroke that swells, thins and goes dry at the tail; a 1.5 px hairline that draws in 40 f and breathes while it holds. Underlines, horizons, dividers, gestures.",
    api: "<Brush ctrl={P[]} width at d seed tail? dry? />  <Hairline pts at d breath? w? color? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: LineDemo,
  },
  {
    id: "ink-dot",
    kind: "primitive",
    title: "Ink dot spreading",
    useFor: "A point of attention, a node, a full stop, a soft wash behind a word. Spreads like ink on wet paper and keeps creeping a little while it holds.",
    api: "<InkDot x y r at d? wash={0..1} color? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: InkDemo,
  },
  {
    id: "hanko",
    kind: "piece",
    title: "Hanko seal",
    useFor: "The one emphasis of a scene: the vermillion 間 (ma) seal punches in at 1.15 → 1 over 8 f while everything else dims 10 % (wrap the rest with hush(t, at)). Text= swaps in Latin initials.",
    api: "<Hanko x y size? at text? />  ·  opacity: hush(t, at)",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: HankoDemo,
  },
  {
    id: "margin-title",
    kind: "piece",
    title: "Margin title, signed",
    useFor: "Hook or chapter card: a small light title low on the left third, a hairline, and a vertical signature column at the right edge with the seal pressed under it.",
    api: "<MarginTitle lines={[...]} kicker? side? at seal? until? />",
    seconds: 5.2,
    origin: ORIGIN,
    Demo: TitleDemo,
  },
  {
    id: "key-line",
    kind: "piece",
    title: "Key word with bōten",
    useFor: "A claim landing word by word on the narration; the key word turns italic and gets bōten, the emphasis dots of Japanese typesetting, in vermillion. Others dim 10 %.",
    api: "<KeyLine words={[{ w, t, key? }]} x? y? size? accent? until? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: KeyDemo,
  },
  {
    id: "stepping-stones",
    kind: "piece",
    title: "Stepping stones",
    useFor: "A list or steps said one after another: a stone settles on each word and turns to ink with raked-sand rings; earlier stones return to pale stone.",
    api: "<SteppingStones steps={[{ label, at }]} y? until? />",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: StonesDemo,
  },
  {
    id: "quiet-figure",
    kind: "piece",
    title: "Quiet figure",
    useFor: "A big number: a light numeral counts up and settles on the spoken word, a hairline runs out to one vermillion dot, the unit in tracked caps.",
    api: "<QuietFigure value at label note? prefix? suffix? decimals? folio? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: FigureDemo,
  },
  {
    id: "hairline-divide",
    kind: "piece",
    title: "Hairline divide (A vs B)",
    useFor: "A comparison: one hairline splits the page, each side lands on its word at a different height, then the chosen side keeps its ink and a vermillion dot marks the line.",
    api: '<HairlineDivide left={{ word, note? }} right={{…}} at={{ line, left, right, pick? }} pick="left|right" />',
    seconds: 4,
    origin: ORIGIN,
    Demo: DivideDemo,
  },
  {
    id: "hanging-scroll",
    kind: "piece",
    title: "Hanging scroll quote",
    useFor: "A quote or definition: a kakejiku unrolls from its nail, the lines appear as the paper passes them, the seal is pressed last. Narrator pauses while it reads.",
    api: "<HangingScroll lines={[...]} by? meta? at x? width? height? seal? />",
    seconds: 5.6,
    origin: ORIGIN,
    Demo: ScrollDemo,
  },
  {
    id: "enso-cycle",
    kind: "piece",
    title: "Ensō cycle",
    useFor: "A loop, a cycle, a flow that returns: one brush ensō in a single breath, then each stage lands round it on its word; the last stage carries the vermillion.",
    api: "<EnsoCycle steps={[{ label, at }]} at title? cx? cy? r? />",
    seconds: 4.4,
    origin: ORIGIN,
    Demo: EnsoDemo,
  },
  {
    id: "colophon",
    kind: "piece",
    title: "Colophon (source)",
    useFor: "A source label or name lower third: a short vertical rule and three quiet lines, low on the left, slow to arrive and slow to leave.",
    api: "<Colophon text detail? kicker? at until? />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: ColophonDemo,
  },
  {
    id: "kasumi",
    kind: "transition",
    title: "Kasumi mist dissolve",
    useFor: "Between scenes or chapters: bands of mist drift across like the clouds on a folding screen while the old scene fades in place, a breath of paper, then the new one rises.",
    api: "<Kasumi at from={<A/>} to={<B/>} d? />",
    seconds: 5.2,
    origin: ORIGIN,
    Demo: KasumiDemo,
  },
  {
    id: "one-object",
    kind: "piece",
    title: "One object, centred low",
    useFor: "The one-idea beat: a single object (a stone by default, or any SVG) low on a breathing horizon with a soft ink shadow, turning imperceptibly. Wrap scenes in BreathHold for the slow camera.",
    api: "<OneObject at x? y?>{svg?}</OneObject>  ·  <BreathHold at until>scene</BreathHold>",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: ObjectDemo,
  },
  {
    id: "measured-silence",
    kind: "piece",
    title: "Measured silence (music only)",
    useFor: "Music-only passages: one upright word per bar with a breath of paper between, an ink dot pressed on each downbeat that stays as a fading score, a quiet beat meter.",
    api: "<MaSong spec={{ bpm, sections }}><MeasuredSilence words startBar? accentBar? /></MaSong>",
    seconds: 9.5,
    origin: ORIGIN,
    Demo: SilenceDemo,
  },
];

export const japaneseMinimalMa: LibraryTheme = {
  slug: "japanese-minimal-ma",
  name: "Japanese minimal (ma)",
  summary: "Washi paper, sumi ink and one vermillion seal. Small light type set low on a third, vertical columns at the edge, brush and hairline drawn slowly, long holds with falling motes. Seventy per cent of every frame is empty on purpose.",
  feel: ["quiet", "spacious", "patient", "refined", "premium"],
  status: "draft",
  board: "data/references/themes/japanese-minimal-ma.md",
  Background: MaPaper,
  entries,
};

export default japaneseMinimalMa;
