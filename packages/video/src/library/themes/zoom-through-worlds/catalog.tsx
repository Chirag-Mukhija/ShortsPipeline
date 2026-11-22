// Catalog of the zoom-through-worlds theme: one entry and demo per reusable item, from the nested-world dive engine to the narration pieces.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { CHUNK, EXPO_OUT, HOT, HOT_DEEP, INK, PAPER, SUN, VOID } from "./theme";
import { Aside, Body, Headline, Inked, PaperGround, Stage, blob, inkRect, ease } from "./ink";
import { BlinkEyes, StarField, TickerStrip, scatterStars } from "./life";
import { Dive, PortalZoom, depthAt, zoomAt, type Move } from "./dive";
import { GiantFace, WORLDS, ellipseD } from "./worlds";
import { FloatingBook3D, Peeker, SkateIn } from "./props";
import { KeyLine, LayerStack, PortalNumber, PortholeSteps, PortholeVersus, QuoteBubble, SourceTicket, WorldTag, ZoomCounter } from "./pieces";

const TICKER = "PLEASE DO NOT LOOK INSIDE";
const ORIGIN = "zoom-through-worlds theme build (board: The Whoopsies scroll dive)";

const CORNER_STARS = [
  { x: 1830, y: 176, r: 22, seed: 3, order: 0 },
  { x: 1760, y: 236, r: 13, seed: 5, order: 1 },
  { x: 96, y: 520, r: 16, seed: 7, order: 2 },
];

// Cream paper, the yellow marquee along the top edge and a few twinkling stars.
const Background: FC = () => (
  <AbsoluteFill>
    <PaperGround />
    <Stage ink={false}>
      <StarField stars={CORNER_STARS} />
    </Stage>
    <TickerStrip text={TICKER} />
  </AbsoluteFill>
);

const THREE: Move[] = [
  { at: 1.2, to: 1, dur: 2.4 },
  { at: 3.9, to: 2, dur: 2.2 },
];

const WorldDiveDemo: FC = () => (
  <AbsoluteFill>
    <Dive worlds={WORLDS} moves={THREE} />
    <TickerStrip text={TICKER} />
    <WorldTag text="1 · THE USER" at={0.15} out={1.1} />
    <WorldTag text="2 · THE APP" at={3.55} out={3.95} tone="coral" />
    <WorldTag text="3 · THE NETWORK" at={5.9} tone="sun" />
  </AbsoluteFill>
);

const ENDLESS: Move[] = [0, 1, 2, 3, 4].map((i) => ({ at: 0.5 + i * 2.1, to: i + 1, dur: 1.8 }));

const EndlessDemo: FC = () => {
  const { t } = useTime();
  const d = depthAt(t, ENDLESS, WORLDS);
  return (
    <AbsoluteFill>
      <Dive worlds={WORLDS} moves={ENDLESS} loop />
      <TickerStrip text="KEEP GOING DEEPER" speed={3} />
      <ZoomCounter zoom={zoomAt(d, WORLDS)} />
      <WorldTag text="…wait, it's you again?" at={10.5} tone="sun" />
    </AbsoluteFill>
  );
};

// The door scene for PortalZoom: a pink door whose keyhole is the pivot.
const DoorScene: FC = () => (
  <AbsoluteFill>
    <PaperGround />
    <Stage>
      <path d={inkRect(772, 292, 400, 820, 60, 2, 2)} fill={INK} />
      <Inked d={inkRect(760, 280, 400, 820, 60, 2, 2)} fill={HOT} w={9} />
      <Inked d={inkRect(810, 340, 300, 180, 24, 3, 2)} fill={HOT_DEEP} w={6} />
      <Inked d={inkRect(810, 700, 300, 300, 24, 4, 2)} fill={HOT_DEEP} w={6} />
      <circle cx={1080} cy={610} r={22} fill={SUN} stroke={INK} strokeWidth={6} />
      <path d="M960 588 m-22 0 a22 22 0 1 1 44 0 a22 22 0 0 1 -10 18 L978 650 L942 650 L952 606 a22 22 0 0 1 -14 -18Z" fill={VOID} stroke={INK} strokeWidth={4} />
    </Stage>
    <Headline lines={["WHAT'S BEHIND THE DOOR?"]} at={-1} size={100} style={{ position: "absolute", top: 110, left: 0, right: 0 }} />
  </AbsoluteFill>
);

const ChapterScene: FC = () => (
  <AbsoluteFill style={{ backgroundColor: VOID }}>
    <Stage ink={false}>
      <StarField stars={scatterStars(40, 5, [60, 60, 1800, 960], [960, 540, 620, 260])} outline={false} />
    </Stage>
    <AbsoluteFill style={{ justifyContent: "center" }}>
      <Headline lines={["CHAPTER 2", "THE NETWORK"]} at={-1} size={170} accent={["2"]} />
    </AbsoluteFill>
  </AbsoluteFill>
);

const TitleDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <GiantFace lookAt={[{ at: 0, x: 0, y: -0.6 }, { at: 1.6, x: 0.9, y: 0.3 }]} />
        <Inked d={ellipseD(960, 930, 70, 82)} w={9} />
        <SkateIn at={1.0} to={1480} y={960} s={0.95} />
      </Stage>
      <Headline lines={["INSIDE THE", "MACHINE"]} at={0.15} size={150} accent={["machine"]} style={{ position: "absolute", top: 84, left: 0, right: 0 }} />
      <Aside text="(hold on to something) ↓" size={42} p={ease(t, 1.1, 0.4)} style={{ position: "absolute", top: 412, left: 0, right: 0, textAlign: "center" }} />
    </AbsoluteFill>
  );
};

const BookDemo: FC = () => {
  const { t } = useTime();
  const p = ease(t, 0.9, 0.5, EXPO_OUT);
  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <Stage ink={false}>
        <StarField stars={scatterStars(44, 23, [40, 90, 1840, 920], [640, 540, 330, 380], 10, 26)} at={0.15} outline={false} />
      </Stage>
      <FloatingBook3D x={620} y={560} at={0.2} title="INTO THE STACK" byline="a dive in five worlds" />
      <div style={{ position: "absolute", left: 1000, top: 290, width: 800, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
        <Headline lines={["EPISODE ONE"]} at={0.9} size={130} align="left" />
        <Body size={42} color={PAPER} style={{ marginTop: 20, width: 700 }}>From the app you tap to the atoms that switch, one continuous zoom.</Body>
        <div style={{ display: "inline-block", marginTop: 40, fontFamily: CHUNK, fontSize: 36, color: INK, background: SUN, border: `6px solid ${INK}`, borderRadius: 14, padding: "10px 28px", boxShadow: `7px 7px 0 ${HOT}` }}>WATCH THE DIVE</div>
      </div>
      <TickerStrip text="NEW EPISODE" />
    </AbsoluteFill>
  );
};

const entries: LibraryEntry[] = [
  {
    id: "paper-ticker",
    kind: "background",
    title: "Storybook paper with marquee",
    useFor: "The ground of every flat scene: cream paper with a faint speckle, a yellow ticker running a joke line or a stat along the top edge, and stars that twinkle.",
    api: "<PaperGround /> + <TickerStrip text speed? bg? /> + <StarField stars />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "world-dive",
    kind: "camera",
    title: "Dive through a portal into the next world",
    useFor: "Chapter changes and every 'what's inside X' beat: the camera falls into the giant's mouth, then the throat, and arrives in star space. The scene inside is already waiting, so there is no cut.",
    api: "<Dive worlds={[GIANT, MOUTH, SPACE, DESK, CHIP]} moves={[{ at, to, dur? }]} /> · depthAt(t, moves, worlds) · withExtra(world, Art)",
    seconds: 6.6,
    origin: ORIGIN,
    Demo: WorldDiveDemo,
  },
  {
    id: "endless-dive",
    kind: "camera",
    title: "Endless dive, five worlds and round again",
    useFor: "A chaptered video as one unbroken zoom ('into the stack'), or a music-only journey: each world's portal is the next hand-off, and the chip's die opens back onto the giant, so it loops forever. Only three levels are drawn at a time, so fifty levels cost the same as one.",
    api: "<Dive worlds={WORLDS} moves loop /> + <ZoomCounter zoom={zoomAt(depth, WORLDS)} />",
    seconds: 11.4,
    origin: ORIGIN,
    Demo: EndlessDemo,
  },
  {
    id: "portal-zoom",
    kind: "transition",
    title: "PortalZoom between any two scenes",
    useFor: "Diving between scenes that aren't drawn nested (cards, charts, HTML): scene A scales into a pivot (a keyhole, a letter, a dot) until its hole fills the frame, and scene B grows from 0.35× inside that hole.",
    api: "<PortalZoom from={<A />} to={<B />} at pivot={{ x, y }} hole? duration? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => <PortalZoom from={<DoorScene />} to={<ChapterScene />} at={0.2} pivot={{ x: 960, y: 588 }} hole={20} duration={2.2} />,
  },
  {
    id: "title-card",
    kind: "piece",
    title: "Hook title over the giant",
    useFor: "Opening title or hook: inked yellow headline words drop in, a handwritten aside points down at the giant, and Floppy skates in front of it. The giant's mouth is the first portal.",
    api: "<GiantFace lookAt /> + <Headline lines at size accent /> + <Aside /> + <SkateIn at to y />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: TitleDemo,
  },
  {
    id: "key-word",
    kind: "piece",
    title: "Key word lands, the face reacts",
    useFor: "A claim word by word on the narration's word times; the stressed word lands bigger in hot pink with an inked swoosh while the Peeker's pupils snap to it and blink on the beat.",
    api: "<KeyLine words={[{ w, t, key?, br? }]} size /> + <Peeker x lookAt={[{ at, x, y }]} />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <AbsoluteFill>
        <Stage>
          <Peeker x={960} w={560} rise={290} at={0.1} lookAt={[{ at: 0, x: -0.5, y: -0.6 }, { at: 1.55, x: 0.45, y: -0.9 }]} />
        </Stage>
        <KeyLine
          size={130}
          style={{ position: "absolute", top: 170, left: 0, right: 0 }}
          words={[{ w: "It", t: 0.3 }, { w: "doesn't", t: 0.45 }, { w: "think.", t: 0.7 }, { w: "It", t: 1.25, br: true }, { w: "PREDICTS.", t: 1.5, key: true }]}
        />
      </AbsoluteFill>
    ),
  },
  {
    id: "blink-eyes",
    kind: "primitive",
    title: "BlinkEyes: pupils snap, lids blink",
    useFor: "Reaction beats and the beat marker on a stressed word: pupils jump to each look point in a hard cut and the lids squash 1→0.1→1 over 6 f; idle blinks every few seconds.",
    api: "<BlinkEyes x y size gap lookAt={[{ at, x, y }]} blinkEvery />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => {
      const { t } = useTime();
      return (
        <AbsoluteFill>
          <Stage>
            <path d={blob(972, 512, 470, 290, 6, 0.05, 16)} fill={INK} />
            <Inked d={blob(960, 500, 470, 290, 6, 0.05, 16)} fill={VOID} w={8} />
            <BlinkEyes x={960} y={500} size={250} gap={1.25} lookAt={[{ at: 0, x: 0, y: 0 }, { at: 0.5, x: -1, y: 0.2 }, { at: 1.1, x: 1, y: -0.3 }, { at: 1.7, x: 0.1, y: -1 }, { at: 2.3, x: 0.3, y: 0.5 }]} blinkEvery={9} />
          </Stage>
          <Aside text="snap. blink. snap. blink." size={52} p={ease(t, 0.4, 0.4)} style={{ position: "absolute", top: 820, left: 0, right: 0, textAlign: "center" }} />
        </AbsoluteFill>
      );
    },
  },
  {
    id: "porthole-steps",
    kind: "piece",
    title: "Steps through numbered portholes",
    useFor: "A list or process of 2–4 steps: each porthole pops in with a quarter turn on its cue, a dashed ink path runs to it, and its label settles underneath.",
    api: "<PortholeSteps steps={[{ label, sub?, at, tone? }]} y? r? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <AbsoluteFill>
        <Headline lines={["HOW A PAGE LOADS"]} at={0.05} size={100} style={{ position: "absolute", top: 104, left: 0, right: 0 }} />
        <PortholeSteps
          y={490}
          steps={[
            { label: "You type a URL", sub: "at the keyboard", at: 0.3 },
            { label: "DNS finds it", sub: "the internet's phone book", at: 0.9 },
            { label: "Packets fly", sub: "in tiny pieces", at: 1.5 },
            { label: "Page appears", sub: "put back together", at: 2.1 },
          ]}
        />
      </AbsoluteFill>
    ),
  },
  {
    id: "portal-number",
    kind: "piece",
    title: "Big number whose zeros are portals",
    useFor: "A big stat: counts up on expo-out, punches on landing, and every 0 is drawn as a hole into star space (begging to be dived into next). The label arrives after the number.",
    api: "<PortalNumber value at dur? size? prefix? suffix? label aside? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => <PortalNumber value={100000} at={0.25} label="requests every second" aside="(that's a lot of holes)" />,
  },
  {
    id: "porthole-versus",
    kind: "piece",
    title: "A vs B through two portholes",
    useFor: "Comparisons: two portholes with eyes that look at each other, a star VS spinning in between, and an optional verdict star that dims the loser.",
    api: "<PortholeVersus a={{ title, lines, tone }} b={…} at verdict={{ at, side }} />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <PortholeVersus at={0.2} a={{ title: "RAM", lines: ["blazing fast", "forgets when off"], tone: "coral" }} b={{ title: "SSD", lines: ["slower", "remembers for years"], tone: "void" }} verdict={{ at: 2.3, side: "b" }} />
    ),
  },
  {
    id: "quote-bubble",
    kind: "piece",
    title: "Quote in the Peeker's speech bubble",
    useFor: "A quote or callout: the Peeker rises and opens its mouth, the bubble pops from its tail, the lines settle one by one and the attribution is handwritten in pink.",
    api: "<QuoteBubble lines={[…]} by at speaker? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => <QuoteBubble at={0.1} lines={["Every layer you peel back", "is just another layer", "wearing a smaller hat."]} by="— note to self" />,
  },
  {
    id: "layer-stack",
    kind: "piece",
    title: "Nested layers diagram",
    useFor: "Stacks, abstractions, 'what's inside what': concentric inked frames pop in outermost first with labels on leader lines; focus lights one label in pink with a star while the eyes in the core look at it.",
    api: "<LayerStack layers={[…outermost first]} at gap? focus={{ i, at }} />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => <LayerStack layers={["Your app", "The browser", "The OS", "The CPU", "Transistors"]} at={0.2} focus={{ i: 2, at: 2.7 }} />,
  },
  {
    id: "source-ticket",
    kind: "piece",
    title: "Source ticket lower third",
    useFor: "Citing a source or naming a guest: a notched yellow ticket skates in from the left over any world and drops away on `out`.",
    api: "<SourceTicket title detail? tag? at out? w? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <AbsoluteFill>
        <Dive worlds={WORLDS} moves={[]} depth={2} />
        <TickerStrip text={TICKER} />
        <SourceTicket at={0.3} title="How the web works" detail="developer.mozilla.org" />
      </AbsoluteFill>
    ),
  },
  {
    id: "floating-book",
    kind: "piece",
    title: "Floating 3D book among popping stars",
    useFor: "Episode, product or resource reveal: a CSS 3D book turns ±15° on a slow sine in star space while yellow stars pop in on a seeded stagger.",
    api: "<FloatingBook3D x y at title byline? cover? spinDeg? /> + <StarField stars at />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: BookDemo,
  },
  {
    id: "skate-in",
    kind: "primitive",
    title: "Floppy skates in",
    useFor: "Comic relief and a prop crossing in front of a portal: expo-out roll-in with a tilt that settles, speed lines while moving, wheels that turn with distance; exits past the right edge on `out`.",
    api: "<SkateIn at to y from? out? tilt? s?>{(wheel) => <Prop />}</SkateIn> (defaults to <Floppy />)",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => {
      const { t } = useTime();
      return (
        <AbsoluteFill>
          <Stage>
            <path d="M0 830 L1920 830" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <SkateIn at={0.2} to={960} y={770} s={1.4} lookAt={[{ at: 0, x: 0.9, y: 0 }, { at: 1.4, x: 0, y: 0.4 }]} />
          </Stage>
          <Aside text="meet Floppy." size={56} p={ease(t, 1.4, 0.4)} style={{ position: "absolute", top: 220, left: 0, right: 0, textAlign: "center" }} />
        </AbsoluteFill>
      );
    },
  },
];

export const zoomThroughWorlds: LibraryTheme = {
  slug: "zoom-through-worlds",
  name: "Zoom-through worlds",
  summary: "A storybook dive: the camera falls through a hole in one inked world (a mouth, a screen, a dot) into the next, so a chaptered explainer can be one continuous zoom. Cream paper, black ink, hot pink, coral interiors and Bangers yellow type.",
  feel: ["playful", "surprising", "continuous", "storybook", "tactile"],
  status: "draft",
  board: "data/references/themes/zoom-through-worlds.md",
  Background,
  entries,
};

export default zoomThroughWorlds;

