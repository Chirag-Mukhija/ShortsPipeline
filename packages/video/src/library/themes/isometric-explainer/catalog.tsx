// Catalog of the isometric explainer theme: one entry and one small demo per reusable item.
import type { FC } from "react";
import { AbsoluteFill, random } from "remotion";
import { useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import type { ToneName } from "./theme";
import { ease, isoCam, stagger } from "./iso";
import { Blueprint, IsoBlock, IsoLabel, IsoPipe, IsoWorld, TilePulse } from "./primitives";
import { IsoBuilding, IsoDatabase, IsoLaptop, IsoPlate, IsoRack } from "./objects";
import { IsoBars, IsoKeyWord, IsoQuote, IsoStat, IsoSteps, IsoTitle, IsoVersus, MiniCity, SourcePlate } from "./pieces";
import { District, ExplodedLayers, FlowBadge, IsoFlow, IsoTurnTable } from "./systems";

const ORIGIN = "library build (isometric-explainer board)";

// A 7×7 block city with a road cross, rising in a wave from the back corner; one block is picked out at the end.
const CityDemo: FC = () => {
  const { t } = useTime();
  const cells: { i: number; j: number; h: number; tone: ToneName }[] = [];
  for (let s = 0; s <= 12; s++)
    for (let i = 0; i <= 6; i++) {
      const j = s - i;
      if (j < 0 || j > 6 || i === 4 || j === 3) continue;
      const r = random(`city${i}-${j}`);
      const tone: ToneName = (i === 2 && j === 1) || (i === 5 && j === 5) ? "coral" : i === 6 && j === 1 ? "blue" : i === 1 && j === 5 ? "mint" : r > 0.66 ? "sky" : r > 0.33 ? "mist" : "white";
      cells.push({ i, j, h: 0.35 + random(`h${i}-${j}`) * 1.7, tone });
    }
  const pick = ease(t, 2.3, 0.3);
  return (
    <IsoWorld view={{ u: 64, ox: 960, oy: 600, cx: 3.9, cy: 3.9 }}>
      <IsoPlate gx={0} gy={0} w={7.8} d={7.8} grid={false}>
        <IsoPipe path={[[0.2, 3.9], [7.6, 3.9]]} packets={{ count: 3, speed: 6, start: 1.4, tone: "coral" }} at={1.1} />
        <IsoPipe path={[[5.0, 0.2], [5.0, 7.6]]} packets={{ count: 2, speed: 5, start: 1.6, tone: "mint" }} at={1.2} />
        <TilePulse gx={2.45} gy={1.35} w={0.8} d={0.8} at={2.3} pad={0.18} />
        {cells.map(({ i, j, h, tone }) => {
          const gx = i * 1.1 + 0.25;
          const gy = j * 1.1 + 0.25;
          const me = i === 2 && j === 1;
          return <IsoBlock key={`${i}-${j}`} gx={gx} gy={gy} w={0.8} d={0.8} h={h} tone={tone} at={stagger(0.2, i, j, 0, 0, 2, 24)} lift={me ? pick : 0} glow={me ? pick : 0} />;
        })}
        <IsoLabel x={2.85} y={1.75} z={0.35 + random("h2-1") * 1.7} text="this one" tag="lift + glow" at={2.35} lift={70} accent />
      </IsoPlate>
    </IsoWorld>
  );
};

const PipeDemo: FC = () => {
  const s = 1.4;
  return (
    <IsoWorld view={{ u: 82, ox: 960, oy: 560, cx: 3.2, cy: 3.2 }}>
      <IsoPipe path={[[1.4, 0.7], [5.0, 0.7]]} at={0.3} packets={{ count: 2, speed: 8, start: 0.6, tone: "coral" }} />
      <IsoPipe path={[[5.7, 1.4], [5.7, 5.0]]} at={0.5} packets={{ count: 3, speed: 6, start: 0.8, tone: "mint" }} />
      <IsoPipe path={[[5.0, 5.7], [1.4, 5.7]]} at={0.7} packets={{ count: 2, speed: 9, start: 1.0, tone: "blue" }} />
      <IsoPipe path={[[0.7, 5.0], [0.7, 3.2], [0.7, 1.4]]} at={0.8} packets={{ count: 2, speed: 7, start: 1.1, tone: "coral" }} />
      <IsoBlock gx={0} gy={0} w={s} d={s} h={0.9} tone="white" at={0.1} />
      <IsoBlock gx={5} gy={0} w={s} d={s} h={1.3} tone="blue" at={0.15} />
      <IsoBlock gx={0} gy={5} w={s} d={s} h={0.7} tone="sky" at={0.25} />
      <IsoBlock gx={5} gy={5} w={s} d={s} h={1.0} tone="mint" at={0.2} />
      <IsoLabel x={0.7} y={0.7} z={0.9} text="client" at={0.4} lift={60} />
      <IsoLabel x={5.7} y={0.7} z={1.3} text="api" tag="POST /v1" at={0.5} lift={60} />
      <IsoLabel x={5.7} y={5.7} z={1.0} text="queue" at={0.7} lift={60} />
      <IsoLabel x={0.7} y={5.7} z={0.7} text="worker" at={0.8} lift={60} />
    </IsoWorld>
  );
};

const KitDemo: FC = () => {
  const gap = 300 / (2 * 0.866 * 72);
  const k = (i: number) => (i - 2) * gap;
  const oy = 720;
  const lab = (i: number, z: number, text: string, tag: string) => <IsoLabel x={k(i)} y={-k(i)} z={z} text={text} tag={tag} at={0.6 + i * 0.12} lift={oy - z * 72 - 430} />;
  return (
    <IsoWorld view={{ u: 72, ox: 960, oy, cx: 0, cy: 0 }}>
      <IsoLaptop gx={k(0) - 0.7} gy={-k(0) - 0.5} at={0.1} />
      <IsoRack gx={k(1) - 0.5} gy={-k(1) - 0.5} units={5} at={0.2} />
      <IsoBuilding gx={k(2) - 1} gy={-k(2) - 1} floors={4} at={0.3} />
      <IsoBuilding gx={k(3) - 1} gy={-k(3) - 1} floors={1} style="house" roof="coral" tone="sand" at={0.4} />
      <IsoDatabase cx={k(4)} cy={-k(4)} r={0.7} h={1.3} at={0.5} />
      {lab(0, 1.15, "Client", "IsoLaptop")}
      {lab(1, 1.95, "Server rack", "IsoRack")}
      {lab(2, 3.4, "Tower", "IsoBuilding")}
      {lab(3, 1.5, "House", "style=house")}
      {lab(4, 1.3, "Database", "IsoDatabase")}
    </IsoWorld>
  );
};

const PanDemo: FC = () => {
  const { t } = useTime();
  const cam = isoCam(t, [
    { t: 0, x: 960, y: 520, s: 1.15 },
    { t: 1.0, x: 1847, y: 520, s: 1.15 },
    { t: 2.6, x: 2734, y: 520, s: 1.15 },
  ]);
  return (
    <IsoWorld view={{ u: 64, ox: 960, oy: 600, cx: 0, cy: 0 }} cam={cam}>
      <IsoPipe path={[[2.5, 0], [8, 0], [8, -5.5]]} packets={{ count: 3, speed: 6, start: 0, tone: "coral" }} />
      <IsoPipe path={[[10.5, -8], [16, -8], [16, -13.5]]} packets={{ count: 3, speed: 6, start: 0, tone: "mint" }} />
      <District gx={-2.5} gy={-2.5} w={5} d={5} name="Your laptop" tag="client">
        <IsoLaptop gx={-1.2} gy={-0.4} />
        <IsoBuilding gx={0.6} gy={-1.8} w={1.4} d={1.4} floors={1} style="house" roof="coral" tone="sand" />
      </District>
      <District gx={5.5} gy={-10.5} w={5} d={5} name="Edge" tag="CDN node">
        <IsoRack gx={6.2} gy={-9.6} units={4} ledSeed={2} />
        <IsoRack gx={7.6} gy={-9.6} units={5} ledSeed={5} />
        <IsoRack gx={9.0} gy={-9.6} units={3} ledSeed={8} />
        <IsoBlock gx={6.4} gy={-7.4} w={3.4} d={1.2} h={0.4} tone="mist" />
      </District>
      <District gx={13.5} gy={-18.5} w={5} d={5} name="Origin" tag="us-east-1">
        <IsoBuilding gx={14} gy={-18} w={2} d={2} floors={4} />
        <IsoDatabase cx={17.2} cy={-14.8} r={0.7} h={1.3} />
      </District>
    </IsoWorld>
  );
};

const entries: LibraryEntry[] = [
  {
    id: "blueprint",
    kind: "background",
    title: "Blueprint grid",
    useFor: "The floor every isometric scene stands on: cool off-white, a diamond grid at 8 %, a soft centre light, tiny cubes bobbing in the corners and faint packets crawling the grid.",
    api: "<Blueprint />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "block-city",
    kind: "primitive",
    title: "Blocks rise in grid order",
    useFor: "Assembling any system or place: three-tone blocks rise from the ground staggered by grid distance; the named one lifts 12 px and glows on a pulsing tile. Sink them with out= for a scene exit.",
    api: "<IsoWorld view={{ u, ox, oy, cx, cy }}><IsoBlock gx gy w d h tone at out lift glow /> + stagger(at, gx, gy) + <TilePulse gx gy at until />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: CityDemo,
  },
  {
    id: "pipes-packets",
    kind: "primitive",
    title: "Pipes and racing packets",
    useFor: "Connections between parts: thick rounded pipes draw on in 18 f along L-shaped grid paths, small cubes race along with a fading trail (6–10 px/f). Fire one PacketDot on the spoken step, loop them for idle life.",
    api: "<IsoPipe path={lPath(a, b)} at packets={{ count, speed, start, tone }} active /> · <PacketDot path start speed />",
    seconds: 3,
    origin: ORIGIN,
    Demo: PipeDemo,
  },
  {
    id: "object-kit",
    kind: "primitive",
    title: "Object kit",
    useFor: "The nouns of infrastructure stories: laptop (client), server rack with blinking LEDs, office tower with lit windows and antenna, house, database cylinder. Each rises, lifts and glows like a block.",
    api: "<IsoLaptop gx gy /> <IsoRack gx gy units ledSeed /> <IsoBuilding gx gy floors style /> <IsoDatabase cx cy r h /> <IsoPlate gx gy w d>…</IsoPlate>",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: KitDemo,
  },
  {
    id: "title-diorama",
    kind: "piece",
    title: "Title beside a floating diorama",
    useFor: "The hook or a chapter card: mono kicker, headline rising line by line (one line in coral), and a little world assembling on a floating plate beside it. Pass your own island.",
    api: '<IsoTitle kicker lines={["…", { text, accent }]} sub at island={<…/>} />',
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => <IsoTitle kicker="CHAPTER 01 · THE REQUEST" lines={["What happens", "when you press", { text: "Enter?", accent: true }]} sub="One click, a whole city of machines." at={0.2} />,
  },
  {
    id: "key-word",
    kind: "piece",
    title: "Block-letter key word",
    useFor: "The one word of a claim landing on its spoken time: the lead words pop, the key word rises letter by letter as extruded block type, a pipe underline draws and a packet runs across it.",
    api: "<IsoKeyWord lead={[{ w, t }]} word at size? color? side? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <IsoKeyWord lead={[{ w: "Every", t: 0.2 }, { w: "click", t: 0.4 }, { w: "pays", t: 0.65 }, { w: "a", t: 0.85 }, { w: "tax:", t: 0.95 }]} word="latency" at={1.3} />,
  },
  {
    id: "steps-climb",
    kind: "piece",
    title: "Steps climb as they're named",
    useFor: "A list, a process, an agenda: numbered platforms climb left to right; the named one rises, lifts and glows on a pulsing tile while a packet runs in from the last step, finished steps turn their LED mint.",
    api: "<IsoSteps title? steps={[{ label, tag?, t }]} />",
    seconds: 3.8,
    origin: ORIGIN,
    Demo: () => (
      <IsoSteps
        title="One click, four hops"
        steps={[
          { label: "Find the server", tag: "DNS", t: 0.4 },
          { label: "Shake hands", tag: "TLS", t: 1.2 },
          { label: "Ask for the page", tag: "HTTP", t: 2.0 },
          { label: "Draw it", tag: "browser", t: 2.8 },
        ]}
      />
    ),
  },
  {
    id: "stat-tower",
    kind: "piece",
    title: "Stat counts up, slabs stack",
    useFor: "A big number on its spoken word: extruded digits count up (out-expo, tabular) while a tower of slabs stacks beside it, the last one coral; label and source arrive after.",
    api: "<IsoStat value at dur? format label note? slabs? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <IsoStat value={3600} at={0.4} label="requests every hour" note="demo figure · cite from sources.md" />,
  },
  {
    id: "versus-districts",
    kind: "piece",
    title: "Two districts, A vs B",
    useFor: "Comparing two architectures, tools or approaches: each side is its own plate of world under a heading; at the verdict the winner lifts and glows with a coral underline and the other greys back.",
    api: '<IsoVersus left={{ title, note, children }} right={{…}} at={{ left, right, verdict }} winner="right" />',
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <IsoVersus
        at={{ left: 0.2, right: 0.9, verdict: 2.4 }}
        left={{ title: "Monolith", note: "one deploy · one database", children: <IsoBuilding gx={1} gy={1} w={3} d={3} floors={4} style="flat" at={0.4} seed={9} /> }}
        right={{
          title: "Microservices",
          note: "many small deploys",
          children: (
            <>
              <IsoPipe path={[[1.1, 1.1], [3.9, 1.1], [3.9, 3.9]]} at={1.3} packets={{ count: 2, speed: 5, start: 1.5 }} />
              <IsoPipe path={[[1.1, 1.1], [1.1, 3.9], [3.9, 3.9]]} at={1.4} packets={{ count: 2, speed: 5, start: 1.6, tone: "mint" }} />
              <IsoRack gx={0.6} gy={0.6} units={3} at={1.0} ledSeed={1} />
              <IsoRack gx={3.4} gy={0.6} units={4} at={1.1} ledSeed={2} />
              <IsoRack gx={0.6} gy={3.4} units={2} at={1.15} ledSeed={3} />
              <IsoDatabase cx={3.9} cy={3.9} r={0.55} h={1.0} at={1.2} />
            </>
          ),
        }}
      />
    ),
  },
  {
    id: "quote-from-object",
    kind: "piece",
    title: "Quote fed by its source",
    useFor: "A quote or callout: a dotted leader draws out of the object it came from (a building, a rack), then the card lands with a coral extruded quote mark and the attribution.",
    api: "<IsoQuote lines={[…]} by role? at speaker?={<IsoRack …/>} />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => <IsoQuote lines={["Every request is a tiny journey", "across a city of machines."]} by="A. Engineer" role="SRE · demo quote" at={0.3} width={1120} />,
  },
  {
    id: "request-flow",
    kind: "piece",
    title: "Request flows node to node",
    useFor: "Signature. 'What happens when you press Enter', a pipeline, a supply chain: each node rises as it's named, a coral packet races in so it arrives on the word, the active node lifts and glows, labels hang above.",
    api: '<IsoFlow nodes={[{ kind: "laptop"|"rack"|"building"|"db"|"block", gx, gy, label, tag?, t }]} view idleAfter? cam? />',
    seconds: 4.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <FlowBadge text="You press Enter" at={0.1} />
        <IsoFlow
          view={{ u: 78, ox: 469, oy: 725, cx: 0, cy: 0 }}
          idleAfter={4.0}
          nodes={[
            { kind: "laptop", gx: 0, gy: 0, label: "Browser", tag: "GET /", t: 0.4 },
            { kind: "rack", gx: 0.2, gy: -5, label: "DNS", tag: "1.1.1.1", t: 1.4, units: 5 },
            { kind: "building", gx: 4, gy: -5.5, label: "Web server", tag: "nginx", t: 2.4, floors: 3 },
            { kind: "db", gx: 4.35, gy: -10, label: "Database", tag: "SELECT …", t: 3.4 },
          ]}
        />
      </>
    ),
  },
  {
    id: "block-bars",
    kind: "piece",
    title: "Block bar chart",
    useFor: "A small ranked comparison (3–6 values): bars grow as blocks on their own tiles, values count above in mono, one bar highlighted coral on a pulsing tile.",
    api: '<IsoBars title? data={[{ label, value }]} at highlight? unit=" ms" />',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <IsoBars
        title="Round trip by region (demo)"
        at={0.4}
        unit=" ms"
        highlight={2}
        data={[
          { label: "us-east", value: 42 },
          { label: "eu-west", value: 61 },
          { label: "ap-south", value: 140 },
          { label: "sa-east", value: 96 },
          { label: "af-south", value: 118 },
        ]}
      />
    ),
  },
  {
    id: "source-plate",
    kind: "piece",
    title: "Source plate (lower third)",
    useFor: "Citing a source or naming a speaker: an LED cube rises on its tile at the lower left and a card wipes out of it with a mono SOURCE kicker.",
    api: "<SourcePlate title meta? kicker? at out? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <AbsoluteFill style={{ opacity: 0.55 }}>
          <IsoWorld view={{ u: 70, ox: 1180, oy: 500, cx: 3, cy: 3 }}>
            <MiniCity at={-2} />
          </IsoWorld>
        </AbsoluteFill>
        <SourcePlate title="Example Source · 2025 Report" meta="example.com/report" at={0.3} />
      </>
    ),
  },
  {
    id: "district-pan",
    kind: "camera",
    title: "Glide to the next district",
    useFor: "Moving the story to the next part of the system: districts sit apart on one big grid joined by long pipes; the camera glides across (34 f, in-out-cubic) and can zoom 1.0–1.4×. Also the theme's main scene transition.",
    api: "<IsoWorld cam={isoCam(t, [{ t, x, y, s, d? }])}><District gx gy w d name tag>…</District></IsoWorld>",
    seconds: 3.8,
    origin: ORIGIN,
    Demo: PanDemo,
  },
  {
    id: "exploded-layers",
    kind: "piece",
    title: "Exploded layer stack",
    useFor: "Signature. A stack or architecture (app / API / model / GPU, OSI layers): plates assemble, then float apart in 24 f with dashed corner guides, labels slide out sideways, one layer is pulled into focus.",
    api: '<ExplodedLayers layers={[{ label, tag?, tone, art: "chips"|"grid"|"bars"|"nodes" }]} at explode? spread? focus={{ i, t }} />',
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <ExplodedLayers
        at={0.2}
        focus={{ i: 1, t: 2.7 }}
        layers={[
          { label: "GPU cluster", tag: "compute", tone: "ink", art: "chips" },
          { label: "Model", tag: "weights", tone: "blue", art: "nodes" },
          { label: "API", tag: "requests", tone: "sky", art: "grid" },
          { label: "App", tag: "what you see", tone: "white", art: "bars" },
        ]}
      />
    ),
  },
  {
    id: "island-turn",
    kind: "transition",
    title: "The island turns",
    useFor: "Signature. Showing the other side of a system or switching viewpoint: the floating plate turns a quarter (36 f, expo-out), faces re-shade and re-sort live, labels stay upright.",
    api: '<IsoTurnTable items={[{ kind: "block"|"rack"|"building"|"db", x, y, w?, d?, h?, label? }]} at turns? enter? />',
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => (
      <IsoTurnTable
        at={1.0}
        turns={-1}
        items={[
          { kind: "building", x: 0.4, y: 0.4, floors: 4, label: "API" },
          { kind: "rack", x: 3.5, y: 0.5, units: 4, label: "Cache" },
          { kind: "db", x: 3.9, y: 3.9, w: 1.3, h: 1.2, label: "DB" },
          { kind: "block", x: 0.6, y: 3.4, w: 1.4, d: 1, h: 0.7, tone: "coral" },
          { kind: "block", x: 2.3, y: 3.6, w: 0.6, d: 0.6, h: 0.4, tone: "mint" },
        ]}
      />
    ),
  },
];

export const isometricExplainer: LibraryTheme = {
  slug: "isometric-explainer",
  name: "Isometric explainer",
  summary: "Systems as a miniature world: three-tone blocks, racks and buildings rise on a diamond grid, pipes carry racing packets, labels hang upright on leaders, and the camera glides between districts.",
  feel: ["technical", "tidy", "playful", "structured", "miniature-world"],
  status: "draft",
  board: "data/references/themes/isometric-explainer.md",
  Background: Blueprint,
  entries,
};

export default isometricExplainer;
