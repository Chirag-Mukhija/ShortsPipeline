// Catalog of the hand-drawn theme: one entry and one small demo per reusable item, all made for video 001.
import type { FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { ramp, steps, useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { PENCIL, ACCENT } from "./theme";
import { arcPts, blobPts, cloudPts, curvePts, ellPts, linePts, rectPts } from "./geometry";
import { At, Hand, Paper, Sk, Stage, WordLine, wr } from "./primitives";
import { Bulb, Chart, Checklist, CloudBoxes, Laptop, MiniChain, NetGraph, Packet, PlayBtn, Research, Robot, RotArrows, Runner } from "./doodles";
import { Chain, chainLayout, type LinkLook, type NodeLook } from "./chain";
import { HatchBar, QuestionEquals, Stamp, Stations } from "./pieces";

const ORIGIN = "video 001 (AI Can Code. So What Should I Actually Learn?), Beats 1–2";

// A doodle demo: drawn on big in the centre with a small caption, so the preview reads on its own.
const doodle = (id: string, title: string, useFor: string, draw: (p: number) => ReactNode, scale = 2.4): LibraryEntry => ({
  id,
  kind: "doodle",
  title,
  useFor,
  api: `<${title.replace(/[^A-Za-z]/g, "")} p={0..1} />`,
  seconds: 2,
  origin: ORIGIN,
  Demo: () => {
    const { t } = useTime();
    return (
      <Stage>
        <At x={960} y={500} s={scale}>{draw(ramp(t, 0.2, 1.1))}</At>
        <Hand x={960} y={900} text={title} size={52} color={PENCIL} p={wr(t, 0.6, title)} />
      </Stage>
    );
  },
});

const LABELS = [["Idea"], ["First", "Draft"], ["Feedback"], ["Rewrite"], ["Ship it"]];
const NODES = chainLayout(LABELS, { x0: 340, step: 310, y: 520 });

const ChainDemo: FC = () => {
  const { t } = useTime();
  const at = LABELS.map((_, i) => 0.4 + i * 0.7);
  const looks: NodeLook[] = NODES.map((n, i) => ({
    draw: ramp(t, at[i]! - 0.3, 0.6),
    label: [wr(t, at[i]!, n.label[0]!), wr(t, at[i]! + 0.2, n.label[1] ?? "")],
    ink: i === NODES.length - 1 ? 1 : 1 - ramp(t, at[i + 1]!, 0.5),
    bold: ramp(t, at[i]!, 0.3) * (i === NODES.length - 1 ? 1 : 1 - ramp(t, at[i + 1]!, 0.4)),
  }));
  const links: LinkLook[] = NODES.slice(1).map((_, i) => ({ p: ramp(t, at[i + 1]! - 0.5, 0.4), ink: looks[i + 1]!.ink }));
  return (
    <Stage>
      <Chain nodes={NODES} looks={looks} links={links} />
    </Stage>
  );
};

const ChainFocusDemo: FC = () => {
  const { t } = useTime();
  const looks: NodeLook[] = NODES.map((_, i) => ({
    draw: 1,
    label: [1, 1],
    ink: steps(t, [[0, 0.3], [0.5 + i * 0.5, 1], [1.0 + i * 0.5, i === 2 ? 1 : 0.2]]),
    bold: steps(t, [[0, 0], [0.5 + i * 0.5, 1], [1.0 + i * 0.5, i === 2 ? 1 : 0]], 0.35),
  }));
  const links: LinkLook[] = NODES.slice(1).map(() => ({ p: 1, ink: 0.4 }));
  return (
    <Stage>
      <Chain nodes={NODES} looks={looks} links={links} />
      <Hand x={960} y={800} text="the one that stays" size={56} color={ACCENT} p={wr(t, 3.3, "the one that stays")} />
    </Stage>
  );
};

const entries: LibraryEntry[] = [
  {
    id: "paper",
    kind: "background",
    title: "Dot-grid paper",
    useFor: "The page every hand-drawn scene sits on: warm off-white, iPad dot grid, grain and a soft vignette.",
    api: "<Paper />",
    seconds: 1,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "pencil-stroke",
    kind: "primitive",
    title: "Boiling pencil stroke",
    useFor: "Any line, shape or arrow: draws on with p, re-jitters every 4 frames so holds stay alive, optional arrowheads and dashes.",
    api: "<Sk pts={linePts|blobPts|ellPts|rectPts|curvePts|cloudPts(...)} p w color dash head head2 />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => {
      const { t } = useTime();
      return (
        <Stage>
          <Sk pts={blobPts(420, 420, 380, 200, 5)} p={ramp(t, 0.1, 0.8)} w={6} seed={5} />
          <Sk pts={ellPts(960, 420, 150, 110, 6)} p={ramp(t, 0.5, 0.8)} w={6} seed={6} />
          <Sk pts={cloudPts(1500, 420, 190, 110, 7)} p={ramp(t, 0.9, 0.9)} w={6} seed={7} />
          <Sk pts={rectPts(250, 640, 340, 200, 8)} p={ramp(t, 1.3, 0.8)} w={6} seed={8} />
          <Sk pts={curvePts(760, 820, 960, 600, 1180, 760)} p={ramp(t, 1.7, 0.7)} w={6} seed={9} head />
          <Sk pts={linePts(1330, 740, 1700, 740, 10, 0.03, 10)} p={ramp(t, 2.0, 0.6)} w={6} seed={10} dash="2 16" ghost={false} head />
          <Sk pts={arcPts(1515, 820, 80, 40, 3.4, 6.0)} p={ramp(t, 2.3, 0.5)} w={5} seed={11} color={PENCIL} />
        </Stage>
      );
    },
  },
  {
    id: "handwriting",
    kind: "primitive",
    title: "Write-on handwriting",
    useFor: "Labels, notes, margin asides. Writes left to right at a speed set by its length; pencil grey for asides, coral for the one key word.",
    api: "<Hand x y text size p={wr(t, at, text)} color rotate anchor />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => {
      const { t } = useTime();
      return (
        <Stage>
          <Hand x={960} y={420} text="a heading that writes itself" size={96} p={wr(t, 0.2, "a heading that writes itself")} />
          <Hand x={960} y={600} text="(a quieter margin note)" size={58} color={PENCIL} rotate={-3} p={wr(t, 1.3, "(a quieter margin note)")} />
          <Hand x={960} y={780} text="the key word" size={104} color={ACCENT} p={wr(t, 2.1, "the key word")} />
        </Stage>
      );
    },
  },
  {
    id: "word-pop",
    kind: "primitive",
    title: "Words pop on each spoken word",
    useFor: "The main question or claim, word by word on the narration's word times; the last word can pop bigger, turn coral and get a hand-drawn underline.",
    api: '<WordLine mode="pop" y size words={[{ w, t, accent?, underline?, scale? }]} />',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <>
        <WordLine y={380} size={124} mode="pop" words={[{ w: "So", t: 0.3 }, { w: "what", t: 0.5 }, { w: "should", t: 0.7 }, { w: "I", t: 0.9 }, { w: "be", t: 1.05 }]} />
        <WordLine y={640} size={124} mode="pop" words={[{ w: "learning?", t: 1.3, accent: true, underline: true, scale: 1.9 }]} />
      </>
    ),
  },
  {
    id: "word-write",
    kind: "primitive",
    title: "Words write on as they're said",
    useFor: "A sentence that should feel written rather than announced; underline the last word in graphite to keep coral for later.",
    api: '<WordLine mode="write" y size words={[{ w, t, underline? }]} />',
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => <WordLine y={560} size={110} mode="write" words={[{ w: "what", t: 0.2 }, { w: "are", t: 0.6 }, { w: "you", t: 0.8 }, { w: "even", t: 1.0 }, { w: "learning?", t: 1.3, underline: true }]} />,
  },
  doodle("rotating-arrows", "Rotating Arrows", "Switching, cycles, going round in circles. Rotate the group with time for a spin.", (p) => <RotArrows r={80} p={p} seed={3} />),
  doodle("laptop", "Laptop", "Code, an AI writing code, a project. Lines type themselves in via the typed callback.", (p) => <Laptop p={p} typed={(k) => Math.min(1, Math.max(0, p * 2.2 - 0.8 - k * 0.25))} />, 1.6),
  doodle("robot", "Robot", "An AI agent did it. Small, friendly, never scary.", (p) => <Robot p={p} />, 3),
  doodle("play-button", "Play Button", "A video popped up; one per switch beside a chain; pulse it for 'the next video is always there'.", (p) => <PlayBtn p={p} seed={731} />),
  doodle("bulb", "Bulb", "An idea, a new use case, a realisation.", (p) => <Bulb p={p} />, 2.6),
  doodle("mini-chain", "Mini Chain", "Icon for 'the chain' in maps and agendas.", (p) => <MiniChain p={p} />),
  doodle("research", "Research", "Papers, a study, 'look at what the research says'.", (p) => <Research p={p} />),
  doodle("checklist", "Checklist", "A plan, rules, 'what I'm doing about it'.", (p) => <Checklist p={p} />),
  doodle("net-graph", "Net Graph", "Networking, connections, systems.", (p) => <NetGraph p={p} />),
  doodle("packet", "Packet", "A protocol, a message, data with a header.", (p) => <Packet p={p} />),
  doodle("chart", "Chart", "Growth, scale, '1 to 1,000,000 users'.", (p) => <Chart p={p} />),
  doodle("cloud-boxes", "Cloud Boxes", "Cloud services, AWS, infrastructure.", (p) => <CloudBoxes p={p} />, 2),
  doodle("runner", "Runner", "Running from something, rushing, escaping. Two poses swap every 5 frames; move its x over time.", (p) => <Runner p={p} />, 2.6),
  {
    id: "chain-draw-on",
    kind: "piece",
    title: "Chain draws on, older links fade",
    useFor: "A sequence of steps, topics or switches said one after another: each link draws on as it's named and the previous one fades to grey.",
    api: "<Chain nodes={chainLayout(labels)} looks={NodeLook[]} links={LinkLook[]} />",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: ChainDemo,
  },
  {
    id: "chain-focus",
    kind: "piece",
    title: "Chain focus: one link stays",
    useFor: "Walking through a chain link by link (bold = now, grey = faded), ending on the one that lasts.",
    api: "<Chain …> with steps(t, keys) driving each NodeLook.ink and .bold",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: ChainFocusDemo,
  },
  {
    id: "stamp",
    kind: "piece",
    title: "Stamp slam",
    useFor: "A verdict landing on something: 'MADE BY AGENTS', 'NO STUDY FOUND', 'MYTH'.",
    api: "<Stamp x y text at r? w? />",
    seconds: 1.5,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Stamp x={960} y={540} text="NO STUDY FOUND" at={0.4} w={520} />
      </Stage>
    ),
  },
  {
    id: "hatch-bar",
    kind: "piece",
    title: "Hatched progress bar",
    useFor: "Something half done, a share or a percentage drawn by hand; grey it out with ink when the topic fades.",
    api: "<HatchBar x y w? fill={0..1} at ink? label? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <At x={960} y={460} s={2.2}>
          <HatchBar x={0} y={0} fill={0.5} at={0.3} label="halfway" />
        </At>
      </Stage>
    ),
  },
  {
    id: "question-equals",
    kind: "piece",
    title: "A =? B",
    useFor: "Questioning whether two things are the same: '“finished” =? learning', 'busy =? productive'.",
    api: "<QuestionEquals left right at={{ left, eq, q, right }} />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => <Stage><QuestionEquals left={"“busy”"} right="productive" at={{ left: 0.3, eq: 1.2, q: 1.8, right: 2.3 }} /></Stage>,
  },
  {
    id: "stations",
    kind: "piece",
    title: "Station map",
    useFor: "The video's agenda or a three-step process: circled icons joined by dotted arrows, each landing on its word.",
    api: "<Stations stations={[{ x, t, label, icon: (p) => <Doodle p={p} /> }]} />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Stations
          stations={[
            { x: 430, t: 0.4, label: "the chain", icon: (p) => <MiniChain p={p} /> },
            { x: 960, t: 1.3, label: "the research", icon: (p) => <Research p={p} /> },
            { x: 1490, t: 2.3, label: "what I'm doing", icon: (p) => <Checklist p={p} /> },
          ]}
        />
      </Stage>
    ),
  },
];

export const handDrawn: LibraryTheme = {
  slug: "hand-drawn",
  name: "Hand-drawn",
  summary: "Off-white dot-grid paper, graphite strokes that boil, Caveat handwriting writing on, one coral accent. Feels like the creator's own iPad sketch.",
  feel: ["personal", "honest", "warm", "explainer", "sketch-note"],
  status: "ready",
  Background: Paper,
  entries,
};

export default handDrawn;
