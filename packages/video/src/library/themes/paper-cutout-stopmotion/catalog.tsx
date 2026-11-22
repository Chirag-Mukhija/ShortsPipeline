// Catalog of the paper cut-out stop-motion theme: one entry and one demo per reusable item, built from the theme's board.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { useTime } from "../../core/time";
import { CORE, CREAM, INK, MUSTARD, TEAL, TEAL_LT, TOMATO } from "./theme";
import { drop, nudgeUp, mix } from "./stop";
import { CutText, Piece, Print, Sheet, Tabletop, Tape, TapeBit } from "./paper";
import { burst, cutCircle, cutPoly, cutRect, cutRound, hills, pathOf } from "./shapes";
import { Bulb, Icon, Laptop, PlayCard, Rocket } from "./icons";
import { LayeredNumber, LowerThird, PaperBars, QuoteSheet, SourceTape, StitchFlow, StripList, TitleCard, Versus, WordDrop } from "./pieces";
import { Diorama, FlapReveal, PaperIris, Puppet, SheetPull, pullCover } from "./scenes";

const ORIGIN = "Built from the paper-cutout-stopmotion board (no video yet)";

const Board: FC = () => <Tabletop />;

const PieceDemo: FC = () => {
  const { t } = useTime();
  return (
    <>
      <Piece x={700} y={470} w={460} h={460} z={0} seed={11} pose={drop(t, 0.2)}>
        <path d={pathOf(cutCircle(230, 230, 210, 11, 40))} fill={TEAL} />
      </Piece>
      <Sheet x={980} y={560} w={540} h={300} sides="t" amp={9} color={CREAM} seed={12} r={-5} z={1} pose={drop(t, 0.6)}
        print={<Print size={52} weight={600} style={{ padding: "60px 56px" }}>torn along the top,<br />scissor-cut sides</Print>} />
      <Piece x={1290} y={420} w={330} h={330} z={2} seed={13} r={10} pose={mix(drop(t, 1.0), nudgeUp(t, 1.7))}>
        <path d={pathOf(burst(165, 165, 150, 72, 5, 13))} fill={TOMATO} />
      </Piece>
      <Tape x={600} y={790} text="z0 · on the board" r={-3} seed={14} at={0.4} />
      <Tape x={1020} y={850} text="z1 · mid" r={2} seed={15} at={0.8} />
      <Tape x={1400} y={720} text="z2 · front" r={-2} seed={16} at={1.2} />
    </>
  );
};

const TapeDemo: FC = () => {
  const { t } = useTime();
  const sky = hills(40, 660, 300, 420, 21, 30, 1.4);
  return (
    <>
      <Sheet x={960} y={390} w={700} h={500} sides="" color={CORE} seed={20} r={2} z={1} pose={drop(t, 0)}>
        <path d={pathOf(cutRect(40, 40, 620, 380, 22, 1))} fill={TEAL_LT} />
        <path d={sky.paper} fill={TEAL} />
        <path d={pathOf(cutCircle(520, 130, 46, 23, 16))} fill={MUSTARD} />
      </Sheet>
      <TapeBit x={960} y={150} r={-4} w={170} seed={24} />
      <LowerThird name="Sam Okafor" role="Indie game dev · Lagos" at={0.4} />
      <SourceTape source="Stack Overflow Survey 2025" detail="survey.stackoverflow.co" at={1.2} />
    </>
  );
};

const PullDemo: FC = () => {
  const { t } = useTime();
  const at = 0.6;
  const b = t >= pullCover(at);
  return (
    <>
      <Tape x={960} y={380} text={b ? "Part 2" : "Part 1"} r={-3} seed={b ? 31 : 30} size={40} h={70} />
      <CutText text={b ? "The build." : "The idea."} x={960} y={560} size={190} color={INK} seed={b ? 33 : 32} tilt={4} />
      <SheetPull at={at} color={TEAL} dir="left" />
    </>
  );
};

const IrisDemo: FC = () => {
  const items = [
    { x: 480, el: <Bulb seed={41} />, label: "idea" },
    { x: 960, el: <Laptop seed={42} />, label: "build" },
    { x: 1440, el: <Rocket seed={43} />, label: "ship" },
  ];
  return (
    <>
      {items.map((it, i) => (
        <div key={i}>
          <Icon x={it.x} y={500} size={240} seed={44 + i} r={i % 2 ? 4 : -4}>{it.el}</Icon>
          <Tape x={it.x} y={690} text={it.label} seed={47 + i} r={i % 2 ? 2 : -2} size={34} />
        </div>
      ))}
      <PaperIris at={0.5} dur={0.8} from={1300} to={260} cx={1440} cy={560} color={INK} />
    </>
  );
};

const PuppetDemo: FC = () => {
  const { t } = useTime();
  return (
    <>
      <Puppet x={760} y={560} at={0} keys={[{ t: 0, pose: "idle" }, { t: 0.6, pose: "wave" }, { t: 1.8, pose: "point" }, { t: 2.5, pose: "wave" }]} />
      <Piece x={1340} y={330} w={560} h={300} z={1.6} seed={51} r={-3} pose={drop(t, 1.0)}
        print={<Print size={56} weight={600} align="center" style={{ padding: "70px 50px 0" }}>Hi! I&apos;m you,<br />in paper.</Print>}>
        <path d={pathOf(cutRound(20, 20, 520, 210, 40, 52))} fill={CORE} />
        <path d={pathOf(cutPoly([[120, 220], [200, 220], [70, 290]], 53, 2))} fill={CORE} />
      </Piece>
    </>
  );
};

const FlapDemo: FC = () => (
  <FlapReveal
    at={0.6}
    top={<Print size={52} weight={600} align="center" style={{ paddingTop: 110 }}>Plan vs reality</Print>}
    front={
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Print size={40} weight={500} color={CORE} align="center">what I expected</Print>
        <Print size={72} weight={600} color={CORE} align="center">Learn it all first</Print>
      </div>
    }
    back={
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: 0.85 }}>
        <Print size={40} weight={500} color={CORE} align="center">what I expected</Print>
        <Print size={60} weight={600} color={CORE} align="center" style={{ textDecoration: "line-through", textDecorationColor: TOMATO, textDecorationThickness: 8 }}>Learn it all first</Print>
      </div>
    }
    under={
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Print size={40} weight={500} color={TOMATO} align="center">what actually worked</Print>
        <Print size={72} weight={600} align="center">Build first, learn on the way</Print>
      </div>
    }
  />
);

const entries: LibraryEntry[] = [
  {
    id: "tabletop",
    kind: "background",
    title: "Kraft tabletop",
    useFor: "The board every scene is shot on: kraft cardboard under a desk lamp, faint flutes and fibres, offcuts in the corners, and an exposure flicker on threes so a hold never freezes.",
    api: "<Tabletop color? crumbs? />  (theme Background)",
    seconds: 1.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Tape x={960} y={500} text="kraft board · #C9A27A" r={-2} seed={2} size={36} h={70} />
        <Tape x={960} y={600} text="lamp flicker on threes" r={1.5} seed={3} size={30} />
      </>
    ),
  },
  {
    id: "paper-piece",
    kind: "primitive",
    title: "PaperPiece on depth planes",
    useFor: "Any shape cut from paper: rough scissor edge, fibre grain, a lit cut edge and a hard lamp shadow whose offset grows with z. Pieces drop on in three exposures and lift and jiggle for emphasis.",
    api: "<Piece x y w h z={0..3} pose={mix(drop(t, at), nudgeUp(t, at2))} seed>svg</Piece> · <Sheet w h sides='tb' color print /> · useStep(n), stepRamp, slide, slideOut, flick, liftFor",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: PieceDemo,
  },
  {
    id: "title-card",
    kind: "piece",
    title: "Torn banner title",
    useFor: "The hook or a chapter title: scraps land, a torn cream banner slides up in five exposures, tape pins it, and the headline is dropped on letter by letter (one line in tomato).",
    api: "<TitleCard lines={[...]} accent? kicker? sub? at />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => <TitleCard lines={["I quit tutorials", "for 30 days"]} kicker="Ep. 04 · origin story" sub="here's what actually changed" at={0.1} />,
  },
  {
    id: "word-drop",
    kind: "piece",
    title: "Word slips + collage key word",
    useFor: "A claim landing on the narration: each word is a slip placed as it's said; the key word arrives in tomato letters on cut tiles with a mustard burst, then jiggles.",
    api: "<WordDrop rows={[[{ w, t }], [{ w, t, key: true }]]} y? size? keySize? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <WordDrop rows={[[{ w: "Nobody", t: 0.3 }, { w: "tells", t: 0.5 }, { w: "you", t: 0.7 }, { w: "the", t: 0.85 }], [{ w: "boring", t: 1.1, key: true }], [{ w: "part.", t: 1.9 }]]} />
    ),
  },
  {
    id: "strip-list",
    kind: "piece",
    title: "Strip list with paper ticks",
    useFor: "A list or steps said one by one: each item is a strip slid on from the left with a cut number disc; a tomato paper tick is dropped on when it's done.",
    api: "<StripList title? items={[{ text, t, done? }]} />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <StripList
        title="Before I hit record"
        titleAt={0}
        items={[
          { text: "Write the one-line promise", t: 0.5, done: 2.4 },
          { text: "Plan the first 15 seconds", t: 0.8, done: 2.7 },
          { text: "Check every claim has a source", t: 1.1 },
          { text: "Phone on airplane mode", t: 1.4 },
        ]}
      />
    ),
  },
  {
    id: "layered-number",
    kind: "piece",
    title: "Layered paper number",
    useFor: "A big number or stat: three stacked paper copies like a paper sculpture, counting up by replacement (freshly cut digits every hold), the label on a torn ink strip.",
    api: "<LayeredNumber value at dur? prefix? suffix? kicker? label? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => <LayeredNumber value={47} at={0.4} kicker="my first video" label="takes before one felt right" />,
  },
  {
    id: "versus",
    kind: "piece",
    title: "Torn-sheet versus",
    useFor: "A vs B: two sheets slide in from either side with cut icons and coloured header strips, a sunburst VS slaps down and jiggles, and a prize rosette is pinned on the winner.",
    api: "<Versus left={{ title, lines, icon, color }} right={...} at vsAt? winner? winAt? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <Versus
        at={0.1}
        left={{ title: "Tutorials", lines: ["Feels productive", "Gone in a week"], icon: <PlayCard seed={61} />, color: TEAL }}
        right={{ title: "Building", lines: ["Feels slow", "Sticks for months"], icon: <Laptop seed={62} />, color: TOMATO }}
        winner="right"
        winAt={2.2}
      />
    ),
  },
  {
    id: "quote-sheet",
    kind: "piece",
    title: "Taped quote sheet",
    useFor: "A quote or callout: a printed cream page slides up and is taped down, a big cut tomato quote mark drops on, and a mustard strip is slipped under the key phrase on its word.",
    api: '<QuoteSheet quote={["text ", { hi: "key phrase", at }, " more"]} by? at />',
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => <QuoteSheet at={0.1} quote={["Make the thing ", { hi: "you wish existed,", at: 1.6 }, " then make it again, better."]} by="note to self · 2024" />,
  },
  {
    id: "stitch-flow",
    kind: "piece",
    title: "Stitched flow",
    useFor: "A process or diagram: paper discs with collage icons land in order and are sewn together with running stitches of tomato thread, a needle leading, captions on tape.",
    api: "<StitchFlow title? nodes={[{ x, y, label, icon, t }]} /> · <StitchLine from to at dur? sag? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <StitchFlow
        title="From idea to upload"
        nodes={[
          { x: 400, y: 560, label: "idea", icon: <Bulb seed={71} />, t: 0.3 },
          { x: 960, y: 560, label: "build", icon: <Laptop seed={72} />, t: 1.4 },
          { x: 1520, y: 560, label: "ship", icon: <Rocket seed={73} />, t: 2.5 },
        ]}
      />
    ),
  },
  {
    id: "paper-bars",
    kind: "piece",
    title: "Paper bars",
    useFor: "A simple chart (five bars at most; this theme isn't for dense data): strips pushed up from behind a torn ground strip in held steps, values pinned on tape, one bar in tomato.",
    api: "<PaperBars bars={[{ label, value }]} max hi? at per? title? note? />",
    seconds: 2.9,
    origin: ORIGIN,
    Demo: () => (
      <PaperBars
        title="Videos I finished each month"
        bars={[{ label: "Jan", value: 2 }, { label: "Feb", value: 3 }, { label: "Mar", value: 2 }, { label: "Apr", value: 5 }, { label: "May", value: 7 }]}
        max={8}
        hi={4}
        at={0.6}
        per={0.25}
        note="demo data"
      />
    ),
  },
  {
    id: "tape-labels",
    kind: "piece",
    title: "Lower third + source tape",
    useFor: "Who's on screen and where a fact came from: a torn tomato name strip slid in from the left with the role on masking tape, and a typed source strip stuck in the corner.",
    api: "<LowerThird name role? at /> · <SourceTape source detail? at /> · <Tape x y text r at />",
    seconds: 2,
    origin: ORIGIN,
    Demo: TapeDemo,
  },
  {
    id: "flap-reveal",
    kind: "piece",
    title: "Folding flap reveal",
    useFor: "Expectation vs reality, a question then its answer: the lower flap of a card folds up on its hinge in held steps, shading as it turns, revealing what's printed underneath.",
    api: "<FlapReveal at dur? top front back under flapColor? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: FlapDemo,
  },
  {
    id: "sheet-pull",
    kind: "transition",
    title: "Sheet pulled across",
    useFor: "The in-theme scene change: a big torn sheet is dragged across in six exposures, rests one (swap scenes at pullCover(at)), and is dragged off the other side.",
    api: "<SheetPull at color? dir? label? /> · pullCover(at)",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: PullDemo,
  },
  {
    id: "paper-iris",
    kind: "transition",
    title: "Torn paper iris",
    useFor: "Closing in on one detail or opening a new scene: a hole torn in a sheet shrinks or grows on twos, white core round the tear, its shadow falling inward.",
    api: "<PaperIris at dur? from to cx cy color? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: IrisDemo,
  },
  {
    id: "puppet",
    kind: "piece",
    title: "Cut-out puppet",
    useFor: "A stand-in for the creator in story beats (childhood, origin, 'me back then'): jointed paper pieces on brass split pins, posed by keyframes (idle, wave, point, cheer) that step between poses.",
    api: '<Puppet x y keys={[{ t, pose: "wave" | PuppetPose }]} s? at? sweater? trousers? />',
    seconds: 3.2,
    origin: ORIGIN,
    Demo: PuppetDemo,
  },
  {
    id: "diorama",
    kind: "piece",
    title: "Layered paper diorama",
    useFor: "Origin stories and music-only openers: sky, sun, clouds and four torn hill layers slide up back-first, then the camera trucks on twos while near layers travel further than far ones.",
    api: "<Diorama at title? titleAt? truck? truckAt? truckDur? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => <Diorama at={0} title="Where it started" />,
  },
];

export const paperCutoutStopmotion: LibraryTheme = {
  slug: "paper-cutout-stopmotion",
  name: "Paper cut-out stop-motion",
  summary: "Coloured paper cut and torn by hand, laid on a kraft board under a lamp and shot frame by frame: pieces drop and slide on twos and threes, hard shadows by depth, torn white cores, masking tape and thread.",
  feel: ["handmade", "playful", "tactile", "warm", "quirky"],
  status: "draft",
  board: "data/references/themes/paper-cutout-stopmotion.md",
  Background: Board,
  entries,
};

export default paperCutoutStopmotion;

