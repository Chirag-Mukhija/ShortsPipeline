// Catalog of the flat vector explainer theme: one entry and one demo per reusable item, built from the theme's board.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { useTime } from "../../core/time";
import { AMBER, CORAL, INK, LABEL, NIGHT, TEAL, VIOLET } from "./theme";
import { At, GlowOrb, Horizon, Leader, Pill, Sky, Stage, popIn } from "./primitives";
import { FlatCharacter, ICONS, RackTower, ShapeAssembler, type IconName } from "./figures";
import { HookTitle, KeyClaim, QuoteBubble, SourceLabel, StatOrbit, StepStack } from "./pieces";
import { ChapterCard, CircleWipe, MetaphorMorph, ProcessChain, ScaleCompare, SplitCompare, ZoomThrough } from "./scenes";

const ORIGIN = "Built from the flat-vector-explainer board (no video yet)";

const Background: FC = () => <Sky tone="indigo" />;

const OrbDemo: FC = () => {
  const { t } = useTime();
  return (
    <>
      <Stage>
        <Leader d="M820 420 Q700 330 600 330" at={0.85} color={TEAL} />
        <Leader d="M1110 400 Q1200 330 1300 330" at={1.35} color={AMBER} />
        <Leader d="M1090 640 Q1180 740 1290 760" at={1.85} color={CORAL} />
        <GlowOrb x={960} y={520} r={170} color={VIOLET} p={popIn(t, 0.15, 0.6)} emphAt={2.6} seed={1} />
        <text x={960} y={540} textAnchor="middle" fontFamily={LABEL} fontWeight={600} fontSize={52} fill={INK} opacity={popIn(t, 0.45)}>
          the model
        </text>
      </Stage>
      <Pill x={600} y={330} text="reads your prompt" at={1.0} color={TEAL} anchor="right" />
      <Pill x={1300} y={330} text="predicts one word" at={1.5} color={AMBER} anchor="left" />
      <Pill x={1290} y={760} text="then repeats" at={2.0} color={CORAL} anchor="left" />
    </>
  );
};

const ICON_ROW: [IconName, string, string][] = [
  ["rocket", "rocket", CORAL],
  ["chip", "chip", VIOLET],
  ["server", "server", TEAL],
  ["globe", "globe", TEAL],
  ["lock", "lock", AMBER],
  ["doc", "document", TEAL],
  ["satellite", "satellite", VIOLET],
  ["book", "book", CORAL],
];

const IconsDemo: FC = () => {
  const { t } = useTime();
  return (
  <>
    <Stage>
      {ICON_ROW.map(([name, , c], i) => (
        <At key={name} x={360 + (i % 4) * 400} y={i < 4 ? 320 : 700} s={0.78}>
          <ShapeAssembler parts={ICONS[name](c)} at={0.15 + i * 0.16} />
        </At>
      ))}
    </Stage>
    {ICON_ROW.map(([name, label], i) => (
      <div key={name} style={{ position: "absolute", left: 360 + (i % 4) * 400 - 150, width: 300, top: (i < 4 ? 320 : 700) + 140, textAlign: "center", fontFamily: LABEL, fontWeight: 500, fontSize: 32, color: "#B3BBE6", opacity: popIn(t, 0.5 + i * 0.16) > 0 ? 1 : 0 }}>
        {label}
      </div>
    ))}
  </>
  );
};

const CharacterDemo: FC = () => {
  const { t } = useTime();
  return (
    <>
      <Stage>
        <Horizon y={930} />
        <GlowOrb x={1220} y={430} r={120} color={AMBER} p={popIn(t, 0.7, 0.6)} emphAt={1.7} seed={3} />
        <FlatCharacter x={640} y={930} s={1.25} color={TEAL} at={0.1} state="point" stateAt={1.2} seed={2} />
        <FlatCharacter x={1620} y={930} s={0.8} color={VIOLET} at={0.4} state="cheer" stateAt={2.4} facing={-1} seed={9} />
      </Stage>
      <Pill x={1220} y={640} text="the idea" at={2.0} color={AMBER} />
    </>
  );
};

const SplitDemo: FC = () => {
  const { t } = useTime();
  return (
    <SplitCompare
      at={0.2}
      sweepAt={1.5}
      left={{
        kicker: "BEFORE",
        title: "Write every line",
        color: CORAL,
        art: (
          <>
            <At x={-250} y={700} s={0.55} r={-12}><ShapeAssembler parts={ICONS.doc(CORAL)} at={0.5} /></At>
            <At x={250} y={720} s={0.5} r={10}><ShapeAssembler parts={ICONS.doc(CORAL)} at={0.6} /></At>
            <FlatCharacter x={0} y={900} s={0.95} color={CORAL} at={0.3} state="slump" stateAt={0.9} seed={4} />
          </>
        ),
      }}
      right={{
        kicker: "AFTER",
        title: "Review the draft",
        color: TEAL,
        art: (
          <>
            <At x={-250} y={680} s={0.55} r={-6}><ShapeAssembler parts={ICONS.doc(TEAL)} at={2.1} /></At>
            <At x={250} y={660} s={0.5}><ShapeAssembler parts={ICONS.chip(VIOLET)} at={2.2} /></At>
            <FlatCharacter x={0} y={900} s={0.95} color={TEAL} at={2.0} state="cheer" stateAt={t > 2.6 ? 2.6 : 99} seed={6} facing={-1} />
          </>
        ),
      }}
    />
  );
};

const ZoomDemo: FC = () => {
  const { t } = useTime();
  return (
    <ZoomThrough
      x={880}
      y={470}
      r={34}
      at={1.2}
      from={
        <>
          <Sky tone="indigo" />
          <Stage>
            <At x={760} y={590} s={1.8}>
              <ShapeAssembler parts={ICONS.globe(TEAL)} at={0} />
            </At>
            <Leader d="M906 450 Q960 340 1050 330" at={0.5} color={AMBER} len={300} />
            <GlowOrb x={880} y={470} r={34} color={AMBER} p={popIn(t, 0.3)} emphAt={0.85} glow={1.8} shadow={false} />
          </Stage>
          <Pill x={1060} y={330} text="one data centre" at={0.6} color={AMBER} anchor="left" size={38} />
        </>
      }
      to={
        <>
          <Sky tone="dusk" />
          <Stage>
            <Horizon y={900} color="#3A2350" glow={AMBER} />
            <At x={960} y={560} s={1.4}>
              <ShapeAssembler parts={ICONS.server(TEAL)} at={2.0} />
            </At>
          </Stage>
          <Pill x={960} y={190} text="inside: rows of servers" at={2.4} color={AMBER} size={40} />
        </>
      }
    />
  );
};

const ScaleDemo: FC = () => {
  const { t } = useTime();
  const label = 1 - Math.min(1, Math.max(0, (t - 1.0) / 0.4));
  return (
    <>
      <ScaleCompare
        smallAt={[520, 790]}
        at={1.0}
        dur={1.6}
        zoom={3.4}
        ground={860}
        small={
          <>
            <FlatCharacter x={520} y={860} s={0.34} color={CORAL} at={0.05} state="wave" stateAt={0.4} seed={3} />
            <text x={520} y={700} textAnchor="middle" fontFamily={LABEL} fontWeight={600} fontSize={22} fill={INK} opacity={label * (t > 0.3 ? 1 : 0)}>
              you
            </text>
          </>
        }
        big={<RackTower x={1080} y={240} w={560} h={620} at={0} />}
      />
      <Pill x={520} y={690} text="you" at={2.5} color={CORAL} size={34} />
      <Pill x={1360} y={170} text="one AI data centre" at={2.7} color={TEAL} size={40} />
    </>
  );
};

const ChapterDemo: FC = () => (
  <>
    <ChapterCard n={2} title="How it learns" at={0.2} color={AMBER} />
    <CircleWipe x={420} y={540} at={2.78} r0={150} rim={AMBER}>
      <Sky tone="dusk" />
      <Stage>
        <Horizon y={930} color="#3A2350" glow={CORAL} />
      </Stage>
    </CircleWipe>
  </>
);

const entries: LibraryEntry[] = [
  {
    id: "night-sky",
    kind: "background",
    title: "Night sky with parallax stars",
    useFor: "The page every scene sits on: chapter-tinted gradient (indigo, dusk, deep, lagoon), nebula glows, three star layers drifting at 20/40/70%, rising dust. Add the planet horizon when a scene needs ground.",
    api: "<Sky tone? to? shiftAt? drift? density? /> · <Horizon y? color? p? glow? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => {
      const { t } = useTime();
      return (
        <Stage>
          <Horizon p={Math.min(1, t / 1.2)} y={920} />
          <GlowOrb x={1500} y={300} r={70} color={AMBER} p={popIn(t, 0.6)} crater seed={2} />
          <At x={420 + t * 30} y={280 + Math.sin(t * 1.2) * 8} s={0.45} r={-14 + t * 4}>
            <ShapeAssembler parts={ICONS.satellite(VIOLET)} at={0.3} />
          </At>
        </Stage>
      );
    },
  },
  {
    id: "glow-orb-pills",
    kind: "primitive",
    title: "Glow orb with label pills",
    useFor: "The hero object for a concept, model, planet or data blob; label it with pills on leader lines and pulse it (1.08, glow doubles) on the spoken word.",
    api: "<GlowOrb x y r color p? emphAt? ring? crater? /> · <Leader d at color /> · <Pill x y text at color anchor? kicker? out? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: OrbDemo,
  },
  {
    id: "shape-icons",
    kind: "primitive",
    title: "Icons assembled from shapes",
    useFor: "Any noun the narrator names: each icon pops together from circles and rounded rects on a 3-frame stagger. Flames and signals flicker.",
    api: "<ShapeAssembler parts={ICONS.rocket|chip|server|globe|lock|doc|bolt|satellite|book(color)} at stagger? out? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: IconsDemo,
  },
  {
    id: "flat-character",
    kind: "primitive",
    title: "Flat character",
    useFor: "A stand-in for 'you', a user, a developer: pill body plus round head, blinks, breathes, antenna lags every move. States: idle, point, wave, cheer, slump, talk.",
    api: "<FlatCharacter x y s color at state stateAt facing seed />",
    seconds: 4,
    origin: ORIGIN,
    Demo: CharacterDemo,
  },
  {
    id: "hook-title",
    kind: "piece",
    title: "Hook title over a rising planet",
    useFor: "The opening card or hook: the horizon rises, a ringed planet glows, a tiny character waves, and the headline pops word by word on the narration.",
    api: "<HookTitle kicker? lines={[[{ w, t, hero? }]]} at accent? planet? out? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <HookTitle
        kicker="HOW IT WORKS"
        at={0}
        accent={TEAL}
        lines={[
          [{ w: "How", t: 0.6 }, { w: "a", t: 0.78 }, { w: "chatbot", t: 0.92 }],
          [{ w: "actually", t: 1.25 }, { w: "thinks", t: 1.55, hero: true }],
        ]}
      />
    ),
  },
  {
    id: "key-claim",
    kind: "piece",
    title: "Key word lands, the rest dims",
    useFor: "The one claim of a beat (or a lyric line in a music-only video): words pop on their word times, the hero word glows, bursts and gets a growing bar, then everything else dims to 40%.",
    api: "<KeyClaim lines={[[{ w, t, hero? }]]} accent? size? y? dimAfter? out? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <KeyClaim
        accent={CORAL}
        lines={[
          [{ w: "It", t: 0.3 }, { w: "doesn't", t: 0.45 }, { w: "know.", t: 0.7 }],
          [{ w: "It", t: 1.15 }, { w: "predicts.", t: 1.35, hero: true }],
        ]}
      />
    ),
  },
  {
    id: "step-stack",
    kind: "piece",
    title: "Steps as glowing coins",
    useFor: "A list or 3–4 steps said in order: each lands as an orb coin with an assembled icon, a dotted connector draws down, and only the current step is at full strength.",
    api: "<StepStack steps={[{ label, sub?, t, icon, color? }]} x? y? gap? out? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <StepStack
        x={600}
        y={250}
        gap={290}
        steps={[
          { label: "Collect the text", sub: "web pages, books, code", t: 0.4, icon: "book" },
          { label: "Train the model", sub: "guess the next word, again and again", t: 1.5, icon: "chip" },
          { label: "Tune with people", sub: "humans rate the answers", t: 2.6, icon: "lock" },
        ]}
      />
    ),
  },
  {
    id: "stat-orbit",
    kind: "piece",
    title: "Big number in orbit",
    useFor: "A number the narrator says: counts up (out-expo) to land on the word while two moons travel the orbit, punches 1.08, then the caption pill arrives 8 frames later.",
    api: "<StatOrbit value from? decimals? prefix? unit? caption? at dur? color? y? out? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <StatOrbit value={28000} unit="km/h" caption="the space station, in orbit" at={1.5} dur={1.1} color={AMBER} />,
  },
  {
    id: "split-compare",
    kind: "piece",
    title: "Before / after split with a sweeping divider",
    useFor: "A vs B or before/after: 'before' fills the frame, then a glowing divider sweeps to the centre revealing 'after' in its own tint; characters show the mood.",
    api: "<SplitCompare at sweepAt sweep? left={{ kicker, title, color, art }} right={{ … }} />",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: SplitDemo,
  },
  {
    id: "quote-bubble",
    kind: "piece",
    title: "Quote from a talking character",
    useFor: "A quote or callout: a character talks, the speech bubble grows from its tail, a flat quote mark pops on the corner, the attribution follows.",
    api: "<QuoteBubble quote who role? at color? talkFor? out? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => <QuoteBubble quote="The best way to understand a machine is to take it apart." who="Guest name" role="Engineer" at={0.2} color={VIOLET} />,
  },
  {
    id: "process-chain",
    kind: "piece",
    title: "Process chain that lights up",
    useFor: "How X works, step by step: muted nodes light up on each spoken step while a glowing packet rides the arc from the previous one.",
    api: "<ProcessChain steps={[{ label, t, icon, color? }]} y? x0? x1? r? />",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: () => (
      <ProcessChain
        steps={[
          { label: "Your prompt", t: 0.5, icon: "doc" },
          { label: "The model", t: 1.5, icon: "chip" },
          { label: "A web search", t: 2.5, icon: "globe" },
          { label: "The answer", t: 3.5, icon: "book" },
        ]}
      />
    ),
  },
  {
    id: "source-label",
    kind: "piece",
    title: "Source lower third",
    useFor: "Naming where a fact comes from: a pill plate springs in from the left with an icon coin, the source and a detail line; hold 60+ frames.",
    api: "<SourceLabel title detail? at out? color? icon? kicker? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Stage>
          <At x={960} y={430} s={1.3}>
            <ShapeAssembler parts={ICONS.satellite(VIOLET)} at={0.05} />
          </At>
        </Stage>
        <SourceLabel title="NASA: Space Station facts" detail="nasa.gov" at={0.6} color={CORAL} icon="book" />
      </>
    ),
  },
  {
    id: "chapter-wipe",
    kind: "transition",
    title: "Chapter card, circle wipe out",
    useFor: "Chapter breaks: the numbered orb and title slide in from the left, then the orb grows into a circle that fills the frame with the next chapter's sky.",
    api: "<ChapterCard n title at color? out? /> then <CircleWipe x y at r0?><Sky tone=\"dusk\" />…</CircleWipe>",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: ChapterDemo,
  },
  {
    id: "zoom-through",
    kind: "transition",
    title: "Zoom-through into a small element",
    useFor: "Once per video: the camera dives into a small glowing element until it fills the frame, and the scene living inside it becomes the new background.",
    api: "<ZoomThrough x y r at dur? from={<scene/>} to={<scene/>} />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: ZoomDemo,
  },
  {
    id: "scale-compare",
    kind: "piece",
    title: "Scale compare: tiny you, huge thing",
    useFor: "'This is how big it is': start tight on a tiny character, pull the camera out to reveal the giant object beside it, then label both.",
    api: "<ScaleCompare small big smallAt={[x, y]} at dur? zoom? ground? /> · <RackTower x y w h at />",
    seconds: 4,
    origin: ORIGIN,
    Demo: ScaleDemo,
  },
  {
    id: "metaphor-morph",
    kind: "piece",
    title: "Metaphor morph",
    useFor: "'Think of it as…': one flat shape morphs into another (cloud, monitor, bulb, shield, globe, or your own outline), squashing mid-morph as the names swap.",
    api: "<MetaphorMorph from to appearAt at dur? fromColor? toColor? fromLabel? toLabel? inside? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Pill x={960} y={150} text="think of it as…" at={1.3} color={AMBER} size={36} />
        <MetaphorMorph
          from="cloud"
          to="monitor"
          appearAt={0.2}
          at={1.8}
          y={480}
          s={1.1}
          fromColor={TEAL}
          toColor={VIOLET}
          fromLabel="the cloud"
          toLabel="someone else's computer"
          inside={
            <>
              <rect x={-150} y={-122} width={300} height={186} rx={16} fill={NIGHT} opacity={0.55} />
              <At x={0} y={-30} s={0.42}>
                <ShapeAssembler parts={ICONS.server(TEAL)} at={2.5} />
              </At>
            </>
          }
        />
      </>
    ),
  },
];

export const flatVectorExplainer: LibraryTheme = {
  slug: "flat-vector-explainer",
  name: "Flat vector explainer",
  summary: "Deep indigo night sky with parallax stars, saturated flat shapes with soft gradients, glow and long diagonal shadows, characters and icons built from circles and rounded rects, everything popping in with a bounce on the narrator's cue.",
  feel: ["friendly", "polished", "cosmic", "rounded", "confident", "explainer"],
  status: "draft",
  board: "data/references/themes/flat-vector-explainer.md",
  Background,
  entries,
};

export default flatVectorExplainer;
