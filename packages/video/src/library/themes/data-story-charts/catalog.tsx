// Catalog of the data-story-charts theme: one entry and one demo per reusable item, built from the board; every demo runs on clearly fictional demo data.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { useTime } from "../../core/time";
import { CHAPTER, MONO, NIGHT, PAPER, SERIF, useTone, type Tone } from "./theme";
import { CountUp, Paper, SourceTag, Stage } from "./primitives";
import { BarGrow, Band, Callout, Heatmap, LineChart, ReferenceLine, SmallMultiples, Versus, type Series } from "./charts";
import { ClaimLine, Headline, RankedTable, type HeadWord } from "./words";
import { BarRace, ChapterPlate, ChartMorph, Dim, Scrub, type RacePeriod } from "./story";
import { fmt, plot, rng, walk } from "./scale";

const ORIGIN = "Built from the data-story-charts board (no video yet)";
const DEMO_SOURCE = "Demo data for the library, not a real dataset";

// Word times for a demo headline: one word every 0.09 s, the listed words highlighted.
const wordsOf = (text: string, at: number, hi: string[] = [], gap = 0.09): HeadWord[] =>
  text.split(" ").map((w, i) => ({ w, t: at + i * gap, hi: hi.includes(w) }));

const Title: FC<{ text: string; hi?: string[]; at?: number }> = ({ text, hi, at = 0.1 }) => <Headline y={90} size={62} words={wordsOf(text, at, hi)} />;

const MODELS = [
  { label: "Model A", value: 62 },
  { label: "Model B", value: 48 },
  { label: "Model C", value: 81 },
  { label: "Model D", value: 35 },
  { label: "Model E", value: 57 },
  { label: "Model F", value: 44 },
];
const BY_VALUE = MODELS.map((_, i) => i).sort((a, b) => MODELS[b]!.value - MODELS[a]!.value);
const AVG = MODELS.reduce((s, m) => s + m.value, 0) / MODELS.length;

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const yearTicks = YEARS.filter((_, i) => i % 1 === 0).map((y) => ({ v: y, label: `’${String(y).slice(2)}` }));
const LINES: Series[] = [
  { label: "Model A", data: YEARS.map((y, i) => [y, [38, 41, 45, 47, 52, 55, 57, 60][i]!]), labelDy: 4 },
  { label: "Model B", data: YEARS.map((y, i) => [y, [30, 33, 34, 38, 40, 41, 44, 46][i]!]), labelDy: 0 },
  { label: "Model D", data: YEARS.map((y, i) => [y, [22, 24, 23, 27, 28, 30, 31, 33][i]!]), labelDy: 0 },
  { label: "Model C", data: YEARS.map((y, i) => [y, [26, 28, 31, 33, 41, 58, 71, 84][i]!]), hi: true },
];
const LINE_PL = plot({ x: 250, y: 290, w: 1280, h: 540 }, [2019, 2026], [0, 100]);

const LineDemo: FC = () => (
  <>
    <Title text="Model C pulled away after 2023" hi={["Model", "C"]} />
    <Stage>
      <LineChart pl={LINE_PL} series={LINES} at={0.1} xTicks={yearTicks} yTicks={[0, 25, 50, 75, 100]} unit="score" thickenAt={2.8} />
    </Stage>
    <SourceTag at={2.4} source={DEMO_SOURCE} />
  </>
);

const CalloutDemo: FC = () => {
  const turn = LINES[3]!.data[4]!;
  return (
    <>
      <Title text="The price cut changed everything" hi={["price", "cut"]} at={-1} />
      <Stage>
        <Band pl={LINE_PL} x0={2023} x1={2026} at={0.3} label="after the cut" />
        <LineChart pl={LINE_PL} series={LINES} at={-3} xTicks={yearTicks} yTicks={[0, 25, 50, 75, 100]} unit="score" dimContextAt={0.2} />
        <Callout x={LINE_PL.sx(turn[0])} y={LINE_PL.sy(turn[1])} at={1.0} side="left" dx={70} dy={-190} kicker="March 2023" text={"Price cut in half;\nusage doubled in 8 weeks"} />
      </Stage>
    </>
  );
};

const RACE_NAMES: [string, number, number][] = [
  ["Kernel Club", 120, 1.18],
  ["Stack Tales", 150, 1.1],
  ["Pixel Forge", 90, 1.25],
  ["Null Pointer", 110, 1.14],
  ["Cache Me", 70, 1.3],
  ["Diff Daily", 130, 1.06],
  ["Loop Hole", 60, 1.22],
  ["Byte Lab", 50, 1.55],
  ["Ship It", 40, 1.2],
  ["Tab Space", 80, 1.08],
];
const RACE: RacePeriod[] = YEARS.map((year, k) => ({ year, values: Object.fromEntries(RACE_NAMES.map(([n, a, g]) => [n, a * g ** k])) }));

const HEAT = (() => {
  const r = rng(7);
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 12 }, (_, c) => {
      const evening = Math.exp(-(((c - 10) / 2.2) ** 2));
      const lunch = 0.35 * Math.exp(-(((c - 6.5) / 1.2) ** 2));
      const weekend = d >= 5 ? 1.45 : 1;
      return (0.12 + evening + lunch) * weekend * (0.85 + r() * 0.3);
    }),
  );
})();
const HEAT_PEAK = (() => {
  let best = [0, 0];
  HEAT.forEach((row, d) => row.forEach((v, c) => (v > HEAT[best[0]!]![best[1]!]! ? (best = [d, c]) : null)));
  return best as [number, number];
})();

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const clock = (h: number) => `${h % 12 || 12} ${h % 24 < 12 ? "am" : "pm"}`;

const SCRUB_PL = plot({ x: 230, y: 330, w: 1300, h: 470 }, [0, 52], [0, 100]);
const weekly = (seed: number, drift: number, jump = 0) =>
  walk(seed, 53, 18, drift, 3).map((v, i) => [i, Math.min(96, v + (i >= 34 ? jump * Math.min(1, (i - 33) / 3) : 0))] as [number, number]);
const SCRUB_SERIES: Series[] = [
  { label: "Last year", data: weekly(3, 0.35), labelDy: 0 },
  { label: "This year", data: weekly(11, 0.4, 30), hi: true },
];

const FORMATS = ["Tutorials", "Shorts", "Reviews", "Vlogs", "Live", "Podcasts"].map((label, i) => ({
  label,
  values: walk(20 + i, 12, 20 + i * 4, i === 0 ? 4.2 : 0.6 + (i % 3) * 0.5, 4),
  hi: i === 0,
}));

const PlateInset: FC = () => {
  const tone = useTone();
  const pl = plot({ x: 120, y: 150, w: 560, h: 340 }, [0, 1], [0, 40]);
  return (
    <>
      <text x={40} y={74} fontFamily={MONO} fontSize={28} fill={tone.muted} letterSpacing="0.04em">FIG. 2 · COST PER RUN</text>
      <BarGrow pl={pl} data={[{ label: "Compute", value: 36 }, { label: "Storage", value: 9 }, { label: "Network", value: 4 }]} at={0.95} highlight={0} yTicks={[0, 20, 40]} valueFmt={(v) => `$${v}`} yFmt={(v) => `$${v}`} />
    </>
  );
};

const PlateDemo: FC = () => {
  const hi = LINES[3]!;
  const end = hi.data[hi.data.length - 1]!;
  return (
    <ChapterPlate at={0.5} from={{ x: LINE_PL.sx(end[0]), y: LINE_PL.sy(end[1]) }} color={CHAPTER.mustard} number="#02" date="Nov 2026" title="where the money went" dek="Three costs fell at once. Only one of them mattered." inset={<PlateInset />}>
      <Title text="Model C pulled away after 2023" hi={["Model", "C"]} at={-1} />
      <Stage>
        <LineChart pl={LINE_PL} series={LINES} at={-3} xTicks={yearTicks} yTicks={[0, 25, 50, 75, 100]} unit="score" />
      </Stage>
    </ChapterPlate>
  );
};

// Both surfaces side by side: paper on the left, night on the right, each named with its hex.
const PaperDemo: FC = () => {
  const swatch = (x: number, tone: Tone, name: string) => (
    <div style={{ position: "absolute", left: x, top: 880, fontFamily: MONO, fontSize: 30, letterSpacing: "0.06em", color: tone.muted }}>
      {name} · {tone.bg}
    </div>
  );
  return (
    <>
      <AbsoluteFill style={{ clipPath: "inset(0 0 0 50%)" }}>
        <Paper tone={NIGHT} />
      </AbsoluteFill>
      {swatch(96, PAPER, "PAPER")}
      {swatch(1056, NIGHT, "NIGHT")}
    </>
  );
};

const CountDemo: FC = () => {
  const tone = useTone();
  const { t } = useTime();
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: "0.06em", color: tone.muted, opacity: Math.min(1, t * 3) }}>VIDEO 001 · FIRST HOUR</div>
      <CountUp x={960} y={470} to={1284} at={1.5} dur={1.2} anchor="middle" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 650, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 50, color: tone.ink, opacity: Math.max(0, Math.min(1, (t - 1.75) * 4)) }}>views, with no promotion at all</div>
      <CountUp x={960} y={810} to={38} at={2.4} dur={0.7} anchor="middle" size={96} prefix="▲ +" suffix="%" color={tone.pos} />
    </>
  );
};

const entries: LibraryEntry[] = [
  {
    id: "paper",
    kind: "background",
    title: "Newsroom paper",
    useFor: "The surface every chart sits on: flat #FAFAF7 with a faint data lattice that a slow diagonal swell passes through, so a held chart never freezes. Pass the NIGHT tone for #101418.",
    api: "<Paper tone={PAPER | NIGHT} />  (wrap pieces in <WithTone tone={NIGHT}> for dark charts)",
    seconds: 2,
    origin: ORIGIN,
    Demo: PaperDemo,
  },
  {
    id: "finding-headline",
    kind: "piece",
    title: "Finding headline",
    useFor: "Title or hook card: the headline states the finding, word by word on the narration; the highlighted words get a colour swatch so the headline is also the chart's legend. Mono kicker, serif dek, credit line.",
    api: "<Headline y words={[{ w, t, hi? }]} kicker kickerAt dek dekAt credit creditAt size? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <Headline
        y={210}
        kicker="The numbers behind Model C"
        kickerAt={0.2}
        words={wordsOf("Running Model C got 12× cheaper in two years", 0.6, ["12×", "cheaper"], 0.14)}
        dek="Same quality score, a twelfth of the price. Here is where the drop came from."
        dekAt={2.0}
        credit="Demo data · Chart: ClipForge"
        creditAt={2.6}
      />
    ),
  },
  {
    id: "claim-sparkline",
    kind: "piece",
    title: "Claim with a word-sized chart",
    useFor: "A key claim landing on its spoken words: the figure gets a marker sweep in the highlight and can carry its own inline sparkline right in the sentence.",
    api: "<ClaimLine y words={[{ w, t, hi?, spark?: number[] }]} size? align? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <ClaimLine
        y={540}
        size={96}
        words={[
          { w: "Uploads", t: 0.3 },
          { w: "doubled", t: 0.65, hi: true, spark: [3, 3.4, 3.2, 4.1, 4.6, 5.2, 5.6, 6.4] },
          { w: "in", t: 1.3 },
          { w: "six", t: 1.45 },
          { w: "months.", t: 1.65 },
        ]}
      />
    ),
  },
  {
    id: "count-up",
    kind: "piece",
    title: "Odometer count-up with punch",
    useFor: "The big number: digits roll on tabular figures and land on the spoken word with a 1.08 punch; the label arrives a beat later. Use pos colour for gains.",
    api: "<CountUp x y to at dur? from? decimals? prefix? suffix? size? color? anchor? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: CountDemo,
  },
  {
    id: "bar-grow",
    kind: "piece",
    title: "Bars grow, re-rank, average rises",
    useFor: "Comparing a handful of values: axis first, bars rise 3 f apart, the highlight bar turns colour; then they re-sort on 'ranked', and a dashed average rises to its level and dims everything under it.",
    api: "<BarGrow pl={plot(box, [0,1], [0,max])} data highlight at order={{ at, by }} dimBelow={{ value, at }} /> + <ReferenceLine pl value label at />",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: () => {
      const pl = plot({ x: 250, y: 300, w: 1240, h: 520 }, [0, 1], [0, 100]);
      return (
        <>
          <Title text="Model C scores highest" hi={["Model", "C"]} />
          <Stage>
            <BarGrow pl={pl} data={MODELS} at={0.3} highlight={2} order={{ at: 1.6, by: BY_VALUE }} dimBelow={{ value: AVG, at: 3.1 }} yTicks={[0, 25, 50, 75, 100]} unit="score" />
            <ReferenceLine pl={pl} value={AVG} label="average" at={2.6} />
          </Stage>
        </>
      );
    },
  },
  {
    id: "line-draw",
    kind: "piece",
    title: "Line chart, context then highlight",
    useFor: "A trend over time: axes draw, grey context series follow 2 f apart, the highlight series draws last with a moving head, every line is labelled at its end and the last point keeps pulsing.",
    api: "<LineChart pl series={[{ label, data: [x,y][], hi?, labelDy? }]} at xTicks yTicks unit thickenAt? dimContextAt? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: LineDemo,
  },
  {
    id: "callout",
    kind: "piece",
    title: "Annotated turning point",
    useFor: "When the narrator names the moment: a ring on the data point, a leader line drawing in 12 f, a mono date and a serif note; a shaded band marks the period after it.",
    api: "<Callout x={pl.sx(x)} y={pl.sy(y)} at text kicker? side dx dy /> + <Band pl x0 x1 at label />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: CalloutDemo,
  },
  {
    id: "versus-ratio",
    kind: "piece",
    title: "A vs B with a ratio badge",
    useFor: "Two values drawn honestly to scale; the gap shows as a dashed ghost and the '12×' badge only lands after both bars are on screen.",
    api: "<Versus x y w a={{ label, value }} b={{ label, value }} at={{ a, b, ratio }} hi='a'|'b' ratioText? ratioNote? valueFmt? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Title text="Same job, a twelfth of the price" hi={["twelfth"]} />
        <Stage>
          <Versus x={250} y={400} w={960} a={{ label: "Model A · 2023", value: 36 }} b={{ label: "Model C · 2025", value: 3 }} at={{ a: 0.4, b: 1.0, ratio: 1.8 }} valueFmt={(v) => `$${v}`} ratioText="12×" ratioNote="cheaper per run" />
        </Stage>
        <SourceTag at={2.2} source={DEMO_SOURCE} />
      </>
    ),
  },
  {
    id: "ranked-table",
    kind: "piece",
    title: "Ranked table with in-cell bars",
    useFor: "A list or steps said one by one: each row lands on its word with a rank, an in-cell bar and a tabular value; a soft band follows the newest row.",
    api: "<RankedTable x y w at head={[left, right]} rows={[{ label, value, t, hi? }]} valueFmt? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Title text="Where the saved hours came from" hi={["saved", "hours"]} />
        <RankedTable
          x={200}
          y={240}
          w={1520}
          at={0.3}
          head={["task", "hours a week"]}
          valueFmt={(v) => `${v.toFixed(1)} h`}
          rows={[
            { label: "Auto-captions", value: 6.5, t: 0.5, hi: true },
            { label: "Script outline", value: 4.0, t: 0.95 },
            { label: "B-roll search", value: 3.2, t: 1.4 },
            { label: "Thumbnail drafts", value: 2.1, t: 1.85 },
            { label: "Upload metadata", value: 1.4, t: 2.3 },
          ]}
        />
      </>
    ),
  },
  {
    id: "bar-race",
    kind: "piece",
    title: "Bar chart race",
    useFor: "Rankings over time (top 8–10 only): values move linearly so speed stays honest, ranks re-sort with a smooth slide, gridlines fade as the scale grows, the year counts in the corner with a progress rule.",
    api: "<BarRace box periods={[{ year, values: { name: v } }]} at period={s} top={8} highlight valueFmt />",
    seconds: 6.4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Title text="Byte Lab went from ninth to first" hi={["Byte", "Lab"]} />
        <Stage>
          <BarRace box={{ x: 400, y: 250, w: 1300, h: 570 }} periods={RACE} at={0.6} period={0.75} top={8} highlight="Byte Lab" valueFmt={(v) => `${fmt(v)}k`} />
        </Stage>
      </>
    ),
  },
  {
    id: "chart-morph",
    kind: "transition",
    title: "Bars morph into a ranked dot plot",
    useFor: "Changing chart type without losing the viewer: the same marks shrink, round and travel into a sorted dot plot with stems; use it to go from 'how much' to 'who leads'.",
    api: "<ChartMorph box data max drawAt at highlight ticks valueFmt? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Title text="Same numbers, now ranked" hi={["ranked"]} />
        <Stage>
          <ChartMorph box={{ x: 250, y: 310, w: 1420, h: 520 }} data={MODELS} max={100} drawAt={0.2} at={1.3} highlight={2} ticks={[0, 25, 50, 75, 100]} />
        </Stage>
      </>
    ),
  },
  {
    id: "small-multiples",
    kind: "piece",
    title: "Small multiples",
    useFor: "Comparing 3–6 series precisely: panels deal in 4 f apart, each shows the others as a faint ghost behind its own line, one panel carries the highlight.",
    api: "<SmallMultiples box series={[{ label, values, hi? }]} cols at yMax? valueFmt? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Title text="Only tutorials kept growing" hi={["tutorials"]} />
        <Stage>
          <SmallMultiples box={{ x: 96, y: 240, w: 1728, h: 660 }} series={FORMATS} cols={3} at={0.3} valueFmt={(v) => `${fmt(v)}h`} />
        </Stage>
      </>
    ),
  },
  {
    id: "heatmap",
    kind: "piece",
    title: "Heatmap, diagonal reveal",
    useFor: "Patterns across two dimensions (day × hour, model × task): cells settle into colour along the diagonal one frame apart; pair with a Callout on the peak.",
    api: "<Heatmap x y cell={[w,h]} matrix rowLabels colLabels at colEvery? legend? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => {
      const x = 220;
      const y = 300;
      const cell: [number, number] = [100, 66];
      const [d, c] = HEAT_PEAK;
      const ax = x + c * cell[0] + cell[0] / 2;
      return (
        <>
          <Title text="Viewers show up on weekend evenings" hi={["weekend", "evenings"]} />
          <Stage>
            <Heatmap x={x} y={y} cell={cell} matrix={HEAT} rowLabels={DAYS.map((n) => n.slice(0, 3))} colLabels={Array.from({ length: 12 }, (_, i) => `${i * 2}h`)} colEvery={1} at={0.2} />
            <Callout x={ax} y={y + d * cell[1] + cell[1] / 2} at={2.1} side="right" dx={x + 12 * cell[0] + 50 - ax} dy={0} kicker="Peak" text={`${DAYS[d]}\n${clock(c * 2)} to ${clock(c * 2 + 2)}`} />
          </Stage>
        </>
      );
    },
  },
  {
    id: "time-cursor-zoom",
    kind: "camera",
    title: "Time cursor scrub, then zoom",
    useFor: "Walking through a timeline: a cursor sweeps the x axis at constant pace, drawing the highlight line and reading its value; then the camera pushes 1.5–2× into the region the story is about.",
    api: "<Scrub pl series at dur xFmt yFmt xTicks yTicks zoom={{ at, x0, x1, s? }}>{<Band …/>}</Scrub>",
    seconds: 5.2,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Title text="One week changed the year" hi={["One", "week"]} />
        <Stage>
          <Scrub
            pl={SCRUB_PL}
            series={SCRUB_SERIES}
            at={0.6}
            dur={2.4}
            xFmt={(x) => `WEEK ${Math.round(x)}`}
            xTicks={[0, 13, 26, 39, 52].map((v) => ({ v, label: `wk ${v}` }))}
            yTicks={[0, 50, 100]}
            unit="k subs"
            zoom={{ at: 3.3, x0: 28, x1: 46, s: 1.5 }}
          >
            <Band pl={SCRUB_PL} x0={33} x1={37} at={3.1} label="viral week" />
            <Callout x={SCRUB_PL.sx(34)} y={SCRUB_PL.sy(SCRUB_SERIES[1]!.data[34]![1])} at={4.1} side="left" dx={50} dy={-120} kicker="Week 34" text="One video took off" />
          </Scrub>
        </Stage>
      </>
    ),
  },
  {
    id: "source-tag",
    kind: "piece",
    title: "Source line",
    useFor: "Every chart's citation, bottom-left in 28 px muted: a short rule draws, then 'Source:' and the citation; an optional mono note for method or credit. The previous chart dims to 20 % behind it.",
    api: "<SourceTag at source note? x? y? />  ·  <Dim at to={0.2}>…</Dim> for context-keeping exits",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Stage>
          <Dim at={-1}>
            <BarGrow pl={plot({ x: 250, y: 200, w: 1240, h: 520 }, [0, 1], [0, 100])} data={MODELS} at={-3} highlight={2} yTicks={[0, 50, 100]} />
          </Dim>
        </Stage>
        <SourceTag at={0.3} source={DEMO_SOURCE} note="Chart: ClipForge · scores out of 100 · Nov 2026" />
      </>
    ),
  },
  {
    id: "chapter-plate",
    kind: "transition",
    title: "Chapter plate from a data point",
    useFor: "Chapter change: the last data point swells into a flat colour field, then an issue number, a lowercase title and a dark inset chart deal in 3 f apart. One colour per chapter.",
    api: "<ChapterPlate at from={{ x, y }} color={CHAPTER.mustard} number date title dek? inset={<svg content in 760×620>} outAt?>{previous scene}</ChapterPlate>",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: PlateDemo,
  },
];

export const dataStoryCharts: LibraryTheme = {
  slug: "data-story-charts",
  name: "Data story charts",
  summary: "Calm newsroom charts on flat paper: hairline grids, one vermilion highlight against grey context, direct labels, serif annotations, and every build stage landing on a spoken number.",
  feel: ["precise", "calm", "trustworthy", "newsroom", "minimal", "the numbers behind X"],
  status: "draft",
  board: "data/references/themes/data-story-charts.md",
  Background: () => <Paper />,
  entries,
};

export default dataStoryCharts;
