// Catalog of the math-explainer dark board: one entry and one self-explaining demo per reusable item, aimed at algorithm and complexity explainers.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { ramp, useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { BLUE, GREEN, INK, MUTED, RED, YELLOW } from "./theme";
import { Board, Create, Dot, Stage, Txt } from "./draw";
import { Eq, EqSteps } from "./eq";
import { ArraySort, BinarySearch, GraphBFS, type GNode, type SortOp } from "./algo";
import { BigStat, Callout, Claim, Compare, ComplexityCurves, MatrixTransform, ScenePan, SourceLabel, StepsList, TitleCard } from "./pieces";

const ORIGIN = "math-explainer-dark-board theme (library build)";

// The title card's figure: an interval halving toward a target, the picture of log n.
const Halving: FC<{ at: number }> = ({ at }) => {
  const { t } = useTime();
  const bars: [number, number, string][] = [[1180, 1760, "n"], [1470, 1760, "n/2"], [1615, 1760, "n/4"], [1615, 1688, "n/8"], [1652, 1688, "n/16"]];
  return (
    <g>
      {bars.map(([a, b, l], i) => {
        const y = 650 + i * 66;
        const col = i === 0 ? INK : i === bars.length - 1 ? YELLOW : BLUE;
        return (
          <g key={i}>
            <Create d={`M${a} ${y} L${b} ${y}`} at={at + i * 0.32} dur={0.35} color={col} w={6} cap="butt" />
            <Eq tex={l} x={a - 24} y={y + 13} size={38} anchor="end" color={MUTED} at={at + i * 0.32 + 0.1} fadeIn />
          </g>
        );
      })}
      {t > at + 1.7 && <Dot x={1670} y={650 + 4 * 66} r={9} color={YELLOW} glow={ramp(t, at + 1.7, 0.4)} />}
    </g>
  );
};

const SORT_OPS: SortOp[] = [
  { kind: "compare", i: 0, j: 1, at: 1.0 }, { kind: "swap", i: 0, j: 1, at: 1.45 },
  { kind: "compare", i: 1, j: 2, at: 2.0 },
  { kind: "compare", i: 2, j: 3, at: 2.6 }, { kind: "swap", i: 2, j: 3, at: 3.05 },
  { kind: "compare", i: 3, j: 4, at: 4.1 },
  { kind: "compare", i: 4, j: 5, at: 4.9 }, { kind: "swap", i: 4, j: 5, at: 5.35 },
  { kind: "sorted", i: 5, at: 6.3 },
];

const TREE: GNode[] = [
  { id: "A", x: 960, y: 210 }, { id: "B", x: 640, y: 410 }, { id: "C", x: 1280, y: 410 },
  { id: "D", x: 480, y: 620 }, { id: "E", x: 800, y: 620 }, { id: "F", x: 1120, y: 620 }, { id: "G", x: 1440, y: 620 },
];
const TREE_EDGES: [string, string][] = [["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "F"], ["C", "G"], ["E", "F"]];

const entries: LibraryEntry[] = [
  {
    id: "board",
    kind: "background",
    title: "Dark board with coordinate grid",
    useFor: "Every scene in this theme: flat charcoal, a faint blue unit grid (16 × 9 units of 120 px) and one slow light drifting across it as idle life.",
    api: "<Board /> · <Grid ox oy focus /> for camera pans",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "title-card",
    kind: "piece",
    title: "Title card with a figure",
    useFor: "The hook or a chapter opener: kicker, a title that Writes on (maths allowed), a rule a dot runs along, a quiet subtitle, and room for a small figure.",
    api: '<TitleCard kicker title="\\text{…} O(\\log n)" sub at figure={…} />',
    seconds: 4.5,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <TitleCard kicker="Chapter 2 · Algorithms" title="\text{Binary search is } O(\log n)" sub="Halve the problem, then count the halvings." at={0.2} y={360} size={100} figure={<Halving at={2.2} />} />
      </Stage>
    ),
  },
  {
    id: "write-equation",
    kind: "primitive",
    title: "Write an equation, then mark a term",
    useFor: "Any formula, recurrence or complexity: it Writes on glyph by glyph (outline, then fill). Colour terms by quantity, then Indicate, box, underline, recolour or dim a term on its spoken word.",
    api: '<Eq tex="T(n) = \\term{w}{O(n)}" x y size at colors={{ n: BLUE }} marks={[{ term, at, kind: "indicate"|"box"|"underline"|"color"|"dim" }]} />',
    seconds: 4.2,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Txt x={960} y={300} text="merge sort, as a recurrence" size={40} color={MUTED} anchor="middle" at={0} />
        <Eq tex="T(n) = 2\,T\left(\frac{n}{2}\right) + \term{w}{O(n)}" x={960} y={520} size={96} at={0.3} colors={{ n: BLUE, w: YELLOW }} marks={[{ term: "w", at: 2.2 }, { term: "w", at: 2.9, kind: "box" }]} />
        <Txt x={1340} y={720} text="the merge step" size={40} color={YELLOW} anchor="middle" at={3.2} />
      </Stage>
    ),
  },
  {
    id: "term-transform",
    kind: "piece",
    title: "Equation lines transform into each other",
    useFor: "A derivation or simplification said step by step: glyphs that persist slide to their new place (same character, same order), the rest fade. Mark terms first so the viewer knows what is about to go.",
    api: '<EqSteps lines={[tex1, tex2, …]} at={[t1, t2, …]} x y size colors marks={[{ term, at, kind: "color", color: RED }]} />',
    seconds: 5.8,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <EqSteps lines={["T(n) = 3n^2 + \\term{low}{5n + 2}", "T(n) \\approx \\term{c}{3}n^2", "T(n) = O(n^2)"]} at={[0.2, 2.7, 4.3]} x={960} y={540} size={110} colors={{ n: BLUE }} marks={[{ term: "low", at: 1.7, kind: "color", color: RED }, { term: "c", at: 3.6, kind: "color", color: RED }]} />
        <Txt x={960} y={760} text="drop the lower-order terms" size={42} color={MUTED} anchor="middle" at={1.8} out={2.7} />
        <Txt x={960} y={760} text="drop the constant" size={42} color={MUTED} anchor="middle" at={3.7} out={4.3} />
        <Txt x={960} y={760} text="what's left is the growth" size={42} color={MUTED} anchor="middle" at={5.1} />
      </Stage>
    ),
  },
  {
    id: "key-claim",
    kind: "piece",
    title: "Claim with a key word landing",
    useFor: "A one-line takeaway said aloud: words fade in on their word times, the key word turns yellow and gets a drawn box; a short equation can confirm it underneath.",
    api: "<Claim y size words={[{ w, t, key? }]} /> + <Eq … marks={[{ term, at }]} />",
    seconds: 4.6,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Claim y={430} size={76} words={[{ w: "Doubling", t: 0.2 }, { w: "the", t: 0.45 }, { w: "input", t: 0.6 }, { w: "adds", t: 0.9 }, { w: "just", t: 1.1 }, { w: "one", t: 1.35, key: true }, { w: "more", t: 1.6 }, { w: "step.", t: 1.8 }]} />
        <Eq tex="\log_2(2n) = \log_2 n + \term{one}{1}" x={960} y={660} size={84} at={2.3} colors={{ n: BLUE, one: YELLOW }} marks={[{ term: "one", at: 3.8 }]} />
      </Stage>
    ),
  },
  {
    id: "steps-list",
    kind: "piece",
    title: "Algorithm steps with a pointer",
    useFor: "An algorithm or procedure in a few steps: each writes on as it's said, then a yellow pointer walks the steps and the others dim. Steps mix prose (\\sf{…}) and maths.",
    api: '<StepsList title steps={["\\sf{look at the middle:} \\; \\text{mid} = …", …]} at={[…]} active={[…]} />',
    seconds: 5.2,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <StepsList
          title="Binary search"
          x={260}
          y={360}
          steps={["\\sf{look at the middle item:} \\quad \\text{mid} = \\lfloor (\\text{lo} + \\text{hi})/2 \\rfloor", "\\sf{too small? keep the right half}", "\\sf{too big? keep the left half}", "\\sf{repeat until one item is left}"]}
          at={[0.8, 1.6, 2.2, 2.8]}
          active={[3.6, 4.4]}
        />
      </Stage>
    ),
  },
  {
    id: "big-number",
    kind: "piece",
    title: "DecimalNumber stat",
    useFor: "One number the narration lands on: a lead equation writes, the number counts up in the maths font (fixed digits, no jitter), punches and flashes, then a quiet label says what it counts.",
    api: '<BigStat lead="\\log_2(10^6) \\approx" value={19.93} decimals={2} at label />',
    seconds: 4.6,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <BigStat lead="\log_2(10^6) \approx" value={19.93} decimals={2} at={0.2} y={650} label="halvings to find one item in a million" />
      </Stage>
    ),
  },
  {
    id: "compare",
    kind: "piece",
    title: "A vs B as counted work",
    useFor: "Comparing two approaches by how much work they do: a drawn divider, each side's Big-O, its work as a dot grid that fills in, a count, and a green box on the winner.",
    api: '<Compare left={{ title, tex, rows, cols, color, count }} right={…} at winner="right" winAt />',
    seconds: 5,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Compare at={0.2} winner="right" winAt={3.9} left={{ title: "compare every pair", tex: "O(n^2)", rows: 8, cols: 8, color: RED, count: 64, unit: "steps" }} right={{ title: "merge sort", tex: "O(n \\log n)", rows: 3, cols: 8, color: GREEN, count: 24, unit: "steps" }} />
      </Stage>
    ),
  },
  {
    id: "definition-callout",
    kind: "piece",
    title: "Definition (or quote) callout",
    useFor: "A definition, rule or quote the viewer should read: an outlined box draws with its label cut into the edge, lines write in. kind=\"rule\" gives a left rule and attribution for quotes.",
    api: '<Callout label="Definition" lines={[tex, …]} at colors kind? by? />',
    seconds: 4.2,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Callout label="Definition" x={260} y={330} w={1400} at={0.2} colors={{ f: BLUE, g: YELLOW }} lines={["f(n) = O(g(n))", "\\sf{means} \\;\\; f(n) \\le c \\cdot g(n) \\;\\; \\sf{for every large} \\; n"]} />
      </Stage>
    ),
  },
  {
    id: "source-label",
    kind: "piece",
    title: "Source label",
    useFor: "Citing where a fact, figure or proof comes from: lower-left, a short blue rule, a small-caps label and the reference. Hold it at least 2 s.",
    api: "<SourceLabel text label? at out? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Eq tex="T(n) = 2\,T(n/2) + O(n) \;\to\; O(n \log n)" x={960} y={480} size={80} fadeIn at={0} colors={{ n: BLUE }} />
        <SourceLabel text="Cormen et al., Introduction to Algorithms (4th ed.), §4.5" at={0.5} />
      </Stage>
    ),
  },
  {
    id: "scene-pan",
    kind: "transition",
    title: "Camera pans to fresh board",
    useFor: "Moving to the next idea: the camera slides one frame across the board, grid and all, so the old idea leaves and the new one arrives as if they share one long board.",
    api: "<ScenePan at from={<…svg/>} to={<…svg/>} dur? dir? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <ScenePan
        at={0.7}
        from={<><Eq tex="O(n^2)" x={960} y={560} size={150} fadeIn at={-1} colors={{ n: RED }} /><Txt x={960} y={700} text="the slow way" size={44} color={MUTED} anchor="middle" at={-1} /></>}
        to={<><Eq tex="O(n \log n)" x={960} y={560} size={150} fadeIn at={-1} colors={{ n: GREEN }} /><Txt x={960} y={700} text="the fast way" size={44} color={MUTED} anchor="middle" at={-1} /></>}
      />
    ),
  },
  {
    id: "complexity-curves",
    kind: "piece",
    title: "Big-O growth curves",
    useFor: "Explaining complexity classes: axes draw, O(1) to O(n²) plot one by one at constant speed with labels where they end, then a tracker sweeps n with a dot riding each curve.",
    api: "<ComplexityCurves at step? sweepAt? A? title? /> · build your own with <Axes> <Plot fn> <TrackerLine>",
    seconds: 7.5,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <ComplexityCurves at={0.2} />
      </Stage>
    ),
  },
  {
    id: "array-sort",
    kind: "piece",
    title: "Array sort: compare and arc-swap",
    useFor: "Any sorting or array algorithm: cells draw on, compared pairs get a yellow box and a verdict (5 > 2), swaps travel on arcs, sorted cells turn green, counters tick.",
    api: '<ArraySort values x y at ops={[{ kind: "compare"|"swap"|"sorted", i, j?, at }]} />',
    seconds: 7.4,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Txt x={960} y={150} text="bubble sort · first pass" size={44} color={MUTED} anchor="middle" at={0} />
        <ArraySort values={[5, 2, 8, 1, 9, 3]} x={960} y={520} at={0.2} ops={SORT_OPS} />
      </Stage>
    ),
  },
  {
    id: "graph-bfs",
    kind: "piece",
    title: "Graph traversal with its queue",
    useFor: "Graphs and trees: nodes and edges Create, then BFS visits in order with a Flash, tree edges light yellow, visited nodes fill blue, visit numbers appear and the queue updates below.",
    api: "<GraphBFS nodes={[{ id, x, y }]} edges={[[a, b]]} start at visitAt step? queue={{ x, y }} />",
    seconds: 7.6,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <GraphBFS nodes={TREE} edges={TREE_EDGES} start="A" at={0.1} visitAt={1.3} step={0.8} queue={{ x: 690, y: 860 }} />
      </Stage>
    ),
  },
  {
    id: "binary-search-zoom",
    kind: "camera",
    title: "Binary search: the camera follows the interval",
    useFor: "Number lines and halving: the live interval is shaded with a brace and count, each mid gets a pointer and a comparison, and the camera zooms with the shrinking range while labels stay readable.",
    api: "<BinarySearch n target y at step? />",
    seconds: 11.6,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <BinarySearch n={32} target={22} y={560} at={0.2} />
      </Stage>
    ),
  },
  {
    id: "matrix-transform",
    kind: "piece",
    title: "Matrix bends the plane",
    useFor: "Vectors, matrices, embeddings, any linear map: the plane draws from the centre, the matrix writes top-left, the grid moves under it, and each column lights up with the basis vector it became.",
    api: "<MatrixTransform M={[[a, b], [c, d]]} at apply dur? vector? />",
    seconds: 6,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <MatrixTransform M={[[2, -1], [1, 1]]} at={0.1} apply={2.0} vector={[1, 1]} />
      </Stage>
    ),
  },
];

export const mathExplainerDarkBoard: LibraryTheme = {
  slug: "math-explainer-dark-board",
  name: "Math explainer dark board",
  summary: "A near-black board with a faint blue grid: equations Write on, terms transform between lines, plots draw at constant speed, and the camera follows the idea. The Manim school, tuned for algorithms and complexity.",
  feel: ["precise", "calm", "elegant", "nerdy"],
  status: "draft",
  board: "data/references/themes/math-explainer-dark-board.md",
  Background: Board,
  entries,
};

export default mathExplainerDarkBoard;
