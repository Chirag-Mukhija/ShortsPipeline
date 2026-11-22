// Catalog of the claymorphism 3D theme: one entry and one small demo per reusable item, built from its reference board.
import type { FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { BUTTER, INK_SOFT, LILAC, MINT, PINK, PINK_D } from "./theme";
import { ClayRoom, ClayScene, Face, Slab, Thing } from "./clay";
import { drop, jelly, pop } from "./motion";
import { ClayIcon, type IconName } from "./icons";
import { ClayCoin, ClayCube, ClayRing, Label } from "./shapes";
import { Chip, Puffy, PuffyWords } from "./type";
import { Centered, ClayCompare, HookTitle, KeyWord, NameTag, PillarChart, QuoteBuddy, SourceLabel, StatRing, StepTrays } from "./pieces";
import { BlobWipe, MarbleFlow, PressButton, Poof, wipeCover } from "./signature";

const ORIGIN = "Built from the claymorphism-3d board (no video yet)";

const Background: FC = () => <ClayRoom />;

const SHAPES: { label: string; w: number; h: number; el: () => ReactNode }[] = [
  { label: "pill", w: 300, h: 140, el: () => <Slab w={300} h={140} r={70} color={PINK} floor /> },
  { label: "ball", w: 250, h: 250, el: () => <Slab w={250} h={250} r={125} color={BUTTER} floor><div style={{ marginTop: 40 }}><Face w={200} mood="happy" seed={3} /></div></Slab> },
  { label: "cube", w: 260, h: 248, el: () => <ClayCube size={260} color={MINT} floor /> },
  { label: "coin", w: 230, h: 258, el: () => <ClayCoin size={230} color={LILAC} label="1" floor /> },
  { label: "ring", w: 240, h: 240, el: () => <ClayRing size={240} color={PINK} floor /> },
];

const ShapesDemo: FC = () => {
  const { t } = useTime();
  return (
    <ClayScene>
      {SHAPES.map((s, i) => {
        const x = 310 + i * 325;
        const at = 0.5 + i * 0.28;
        return (
          <div key={s.label}>
            <Thing x={x} y={720} w={s.w} h={s.h} body={drop(t, at)} wobble={i === 1 ? jelly(t, 2.3) : 0}>
              {s.el()}
            </Thing>
            <div style={{ position: "absolute", left: x - 100, width: 200, top: 780, opacity: t > at ? 1 : 0 }}>
              <Label text={s.label} size={36} color={INK_SOFT} />
            </div>
          </div>
        );
      })}
    </ClayScene>
  );
};

const ICON_SET: [IconName, string, string][] = [
  ["chip", "chip", LILAC],
  ["brain", "brain", PINK],
  ["folder", "folder", BUTTER],
  ["bolt", "bolt", MINT],
  ["cloud", "cloud", LILAC],
  ["lock", "lock", BUTTER],
  ["chat", "chat", MINT],
  ["play", "play", PINK],
];

const IconsDemo: FC = () => {
  const { t } = useTime();
  return (
    <ClayScene>
      {ICON_SET.map(([icon, label, c], i) => {
        const x = 450 + (i % 4) * 340;
        const y = i < 4 ? 330 : 700;
        const at = 0.2 + i * 0.12;
        return (
          <div key={icon}>
            <Centered x={x} y={y} body={pop(t, at)} wobble={jelly(t, at + 0.15, 0.06)}>
              <ClayIcon icon={icon} tile={c} size={180} />
            </Centered>
            <div style={{ position: "absolute", left: x - 120, width: 240, top: y + 120, opacity: t > at + 0.1 ? 1 : 0 }}>
              <Label text={label} size={34} color={INK_SOFT} />
            </div>
          </div>
        );
      })}
    </ClayScene>
  );
};

const WipeDemo: FC = () => {
  const { t } = useTime();
  const covered = wipeCover(t, 0.9) >= 1;
  return (
    <AbsoluteFill>
      {!covered && (
        <ClayScene>
          <Centered x={960} y={400} body={pop(t, 0.1)}>
            <Chip label="CHAPTER 01" color={BUTTER} size={32} />
          </Centered>
          <Centered x={960} y={560}>
            <Puffy text="The idea" size={170} />
          </Centered>
        </ClayScene>
      )}
      <BlobWipe at={0.9} color={MINT} corner="br" />
      {covered && (
        <ClayScene>
          <Centered x={960} y={400} body={pop(t, 1.75)}>
            <Chip label="CHAPTER 02" color={LILAC} size={32} />
          </Centered>
          <PuffyWords words={[{ w: "The", t: 1.95 }, { w: "build.", t: 2.2, wobbleAt: 2.6 }]} size={170} y={560} />
        </ClayScene>
      )}
    </AbsoluteFill>
  );
};

const slabText = (kicker: string, kc: string, text: string) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
    <Chip label={kicker} color={kc} size={30} />
    <Puffy text={text} size={68} />
  </div>
);

const entries: LibraryEntry[] = [
  {
    id: "clay-room",
    kind: "background",
    title: "Clay studio sweep",
    useFor: "The surface every clay scene sits on: warm cream photo-studio sweep, a key-light pool top-left, fine grain, and three clay pebbles bobbing in the corners.",
    api: "<ClayRoom color? pebbles? />  (color: CREAM default, SKY for a cooler room)",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => null,
  },
  {
    id: "clay-shapes",
    kind: "primitive",
    title: "Clay shapes that drop and squash",
    useFor: "The material itself: pill, ball (with a face), soft cube, thick coin and donut ring, all lit from the top-left and landing with squash-and-stretch on their cue.",
    api: "<Thing x y w h body={drop(t, at)} wobble={jelly(t, at)}><Slab|ClayCube|ClayCoin|ClayRing … floor /></Thing>; exits: shrinkSpin(t, at)",
    seconds: 3,
    origin: ORIGIN,
    Demo: ShapesDemo,
  },
  {
    id: "clay-icons",
    kind: "primitive",
    title: "Clay icon tiles",
    useFor: "Icon-led lists and labels: chunky putty glyphs puffed up on a coloured clay tile, like toy app icons. 12 glyphs (chip, brain, folder, bolt, cloud, lock, chat, play, check, spark, book, doc).",
    api: '<ClayIcon icon="brain" tile={PINK} size? />  or the glyph alone: <Glyph icon size color />',
    seconds: 2,
    origin: ORIGIN,
    Demo: IconsDemo,
  },
  {
    id: "hook-title",
    kind: "piece",
    title: "Puffy hook title",
    useFor: "The hook or a chapter title: a kicker chip pops, then puffy clay words land one by one on the narration's word times, and four little clay shapes drop in around them and float.",
    api: "<HookTitle kicker={{ text, at }} lines={[[{ w, t, color?, wobbleAt? }]]} size? satellites? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <HookTitle
        kicker={{ text: "HOW IT WORKS", at: 0.15 }}
        lines={[
          [{ w: "How", t: 0.5 }, { w: "a", t: 0.68 }, { w: "chatbot", t: 0.86 }],
          [{ w: "actually", t: 1.2 }, { w: "thinks", t: 1.5, color: PINK_D, wobbleAt: 2.4 }],
        ]}
      />
    ),
  },
  {
    id: "key-word",
    kind: "piece",
    title: "Key word on a clay slab",
    useFor: "The one word the sentence turns on: a quiet lead line, then the word drops on its beat inside a clay slab and wobbles on the emphasis.",
    api: "<KeyWord lead={words} before={words} word at wobbleAt? color? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => <KeyWord lead={[{ w: "It", t: 0.2 }, { w: "doesn't", t: 0.38 }, { w: "know.", t: 0.6 }]} before={[{ w: "It", t: 1.25 }]} word="predicts." at={1.6} wobbleAt={2.4} />,
  },
  {
    id: "step-trays",
    kind: "piece",
    title: "Steps on clay trays",
    useFor: "A list or a how-to: each step's tray swells in, its numbered clay coin drops in on the word, and the title slides after it.",
    api: "<StepTrays steps={[{ title, note?, t }]} x? y? w? gap? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <StepTrays
        steps={[
          { title: "Write the idea down", note: "one line, in your own words", t: 0.45 },
          { title: "Find what already works", note: "and the gap nobody filled", t: 1.1 },
          { title: "Script it, then record", note: "every claim with a source", t: 1.75 },
        ]}
      />
    ),
  },
  {
    id: "stat-ring",
    kind: "piece",
    title: "Clay ring stat",
    useFor: "A big number or a share: a clay donut rolls round to the value while the puffy number counts up inside, then both wobble.",
    api: "<StatRing value suffix? max? at dur? label note? color? />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => <StatRing value={72} at={0.2} label="of replies came back in one try" note="demo figure · cite from sources.md" />,
  },
  {
    id: "compare",
    kind: "piece",
    title: "A vs B, loser deflates",
    useFor: "Comparing two options: two clay cards drop in, a VS coin flips down between them, and at the verdict the loser sags and greys while the winner jellies and gets a check.",
    api: '<ClayCompare left={{ title, points, icon, color }} right={…} at={{ left, right, vs, verdict }} winner="right" />',
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <ClayCompare
        left={{ title: "Chatbot", points: ["Replies to a prompt", "Forgets the context"], icon: "chat", color: PINK }}
        right={{ title: "Agent", points: ["Plans the steps", "Checks its own work"], icon: "spark", color: MINT }}
        at={{ left: 0.3, right: 0.65, vs: 1.05, verdict: 1.9 }}
      />
    ),
  },
  {
    id: "quote-buddy",
    kind: "piece",
    title: "Quote said by a clay buddy",
    useFor: "A quote or callout: a clay buddy drops in, a puffy speech bubble pops beside it and the buddy's mouth moves while the line is on screen.",
    api: "<QuoteBuddy quote by role? at talkFor? color? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <QuoteBuddy quote="The best way to understand a machine is to take it apart." by="Guest Name" role="demo quote" at={0.2} />,
  },
  {
    id: "pillar-chart",
    kind: "piece",
    title: "Clay pillar chart",
    useFor: "Comparing a few values: rounded clay pillars grow out of a plinth with a springy overshoot (thin when stretched, fat when settling), value chips pop on top.",
    api: "<PillarChart data={[{ label, value, color? }]} at stagger? title? highlight? unit? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <PillarChart
        title="Clips made this week (demo)"
        data={[{ label: "Mon", value: 3 }, { label: "Tue", value: 5 }, { label: "Wed", value: 4 }, { label: "Thu", value: 9 }, { label: "Fri", value: 6 }]}
        at={0.5}
        highlight={3}
      />
    ),
  },
  {
    id: "marble-flow",
    kind: "piece",
    title: "Marble-run flow",
    useFor: "A process or pipeline: clay stations joined by a fat clay tube; a marble rolls into each station on its cue, the station gulps it with a wobble and its label pops.",
    api: "<MarbleFlow stations={[{ icon, label, t, tile? }]} at y? marble? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <MarbleFlow
        at={0.1}
        stations={[
          { icon: "chat", label: "Your prompt", t: 1.2 },
          { icon: "brain", label: "The model", t: 1.9 },
          { icon: "cloud", label: "A web search", t: 2.6 },
          { icon: "doc", label: "The answer", t: 3.3 },
        ]}
      />
    ),
  },
  {
    id: "lower-third",
    kind: "piece",
    title: "Source label and name tag",
    useFor: "Citing a source (bottom left) or naming a speaker (bottom right): putty and coloured clay pills that slide or pop in and bulge as they stop.",
    api: "<SourceLabel title sub? kicker? at icon? />  <NameTag name role? at color? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <SourceLabel title="Example Source · 2025 Report" sub="example.com/report" at={0.3} />
        <NameTag name="Your Name" role="creator · demo" at={0.8} />
      </>
    ),
  },
  {
    id: "blob-wipe",
    kind: "transition",
    title: "Clay blob wipe",
    useFor: "Moving to the next chapter or scene: a lumpy clay blob swells from a corner and fills the frame in the next scene's colour.",
    api: '<BlobWipe at color corner="br" dur? />, swap scenes when wipeCover(t, at) reaches 1',
    seconds: 3,
    origin: ORIGIN,
    Demo: WipeDemo,
  },
  {
    id: "press-button",
    kind: "piece",
    title: "Squishy button press",
    useFor: "Signature: 'you hit Generate', 'one click and…'. A clay fingertip presses a big button into its base; on release, clay balls burst out and land with little squashes.",
    api: "<PressButton label at color? base? burst? hold? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => <PressButton label="Generate" at={1.35} />,
  },
  {
    id: "poof",
    kind: "piece",
    title: "Myth poofs, fact drops in",
    useFor: "Signature: debunking. The wrong idea's slab wobbles, squashes flat and poofs into three blobs and a puff of putty, then the right idea drops into its place.",
    api: "<Poof at={{ in, poof, then }} color w h then={{ color, w, h, children }}>{content}</Poof>",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <Poof at={{ in: 0.2, poof: 1.5, then: 2.25 }} color={PINK} w={820} h={290} y={720} then={{ color: MINT, w: 900, h: 290, children: slabText("FACT", BUTTER, "It predicts the next word") }}>
        {slabText("MYTH", LILAC, "It understands you")}
      </Poof>
    ),
  },
];

export const claymorphism3d: LibraryTheme = {
  slug: "claymorphism-3d",
  name: "Claymorphism 3D",
  summary: "Puffy pastel clay on a warm cream studio sweep: one light from the top-left, soft contact shadows, Fredoka letters you could squeeze, and everything landing with squash-and-stretch.",
  feel: ["soft", "squishy", "friendly", "toy-like", "warm"],
  status: "draft",
  board: "data/references/themes/claymorphism-3d.md",
  Background,
  entries,
};

export default claymorphism3d;
