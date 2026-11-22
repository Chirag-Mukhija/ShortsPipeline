// Catalog of the neo-brutalism pop theme: one entry and one demo per reusable item, built from the theme's board.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { BLUE, BODY, GREEN, HEAD, INK, PINK, TEAL, TRACK, WHITE, YELLOW } from "./theme";
import { BrutalCard, Chip, GridPaper, Paper, useF } from "./primitives";
import { StickerBurst } from "./stickers";
import { CoinCounter, ColorWipe, HighlightWord, LabelTag, PressButton, SourceTag, WIPE_CUT, WinDots } from "./pieces";
import { BarChart, Checklist, Flow, IllustrationStage, QuoteCard, TitleCard, Versus } from "./scenes";

const ORIGIN = "Built from the neo-brutalism-pop board (no video yet)";

const Sky: FC = () => <GridPaper tone="sky" />;

const Headline: FC<{ text: string; y: number; size?: number; color?: string }> = ({ text, y, size = 96, color = INK }) => (
  <div style={{ position: "absolute", left: 96, right: 96, top: y, textAlign: "center", fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1.05, letterSpacing: TRACK, color }}>{text}</div>
);

const WipeDemo: FC = () => {
  const f = useF();
  const at = 0.6;
  const b = f / 30 >= at + WIPE_CUT;
  return (
    <>
      <AbsoluteFill>{b ? <GridPaper bg={TEAL} alpha={0.1} /> : <GridPaper bg={YELLOW} alpha={0.08} />}</AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center" }}>
        <Chip text={b ? "Part 2" : "Part 1"} size={36} shadow={6} />
      </div>
      <Headline text={b ? "The build." : "The idea."} y={460} size={150} />
      <ColorWipe at={at} color={PINK} direction="right" />
    </>
  );
};

const SourceDemo: FC = () => (
  <>
    <BrutalCard at={0} x={360} y={110} w={1200} h={560} radius={12}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 28px", borderBottom: `4px solid ${INK}`, background: BLUE }}>
        <WinDots />
        <div style={{ flex: 1, height: 34, borderRadius: 8, border: `3px solid ${INK}`, background: WHITE }} />
      </div>
      <div style={{ padding: 44, display: "flex", flexDirection: "column", gap: 26 }}>
        {[0.62, 0.9, 0.78, 0.5].map((w, i) => <div key={i} style={{ width: `${w * 100}%`, height: i ? 30 : 56, background: i ? "#d9d9d2" : INK, borderRadius: 6 }} />)}
      </div>
    </BrutalCard>
    <SourceTag at={0.5} source="Stack Overflow Developer Survey" detail="survey.stackoverflow.co · 2025" />
  </>
);

const entries: LibraryEntry[] = [
  {
    id: "grid-paper",
    kind: "background",
    title: "Grid paper field",
    useFor: "The flat field every scene sits on: paper #F4F4F0 or pale blue #DBEAFE, a faint square grid that drifts slowly so holds never freeze. Swap `bg` for an accent to mark a new section.",
    api: '<GridPaper tone="paper|sky" bg? cell? alpha? />  (theme Background = <Paper />)',
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <>
        <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: -960, top: 0, width: 1920, height: 1080 }}><Sky /></div>
        </div>
        <div style={{ position: "absolute", left: 960 - 2, top: 0, width: 4, height: 1080, background: INK }} />
        <div style={{ position: "absolute", left: 480, top: 540, transform: "translate(-50%, -50%)" }}><Chip text="paper #F4F4F0" size={36} shadow={6} /></div>
        <div style={{ position: "absolute", left: 1440, top: 540, transform: "translate(-50%, -50%)" }}><Chip text="sky #DBEAFE" size={36} shadow={6} /></div>
      </>
    ),
  },
  {
    id: "title-card",
    kind: "piece",
    title: "Hero hook card",
    useFor: "The opening hook or a chapter title: stickers pop around the edge, kicker chip drops, headline snaps in word by word with one keyword in outlined accent type between two bursts, then a button gets pressed.",
    api: "<TitleCard text hitWord at times? kicker? sub? button? pressAt? color? />",
    seconds: 4.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Sky />
        <TitleCard text={"Ship your first\nSaaS this weekend."} hitWord="SaaS" at={0.2} kicker="Ep. 07 · Build log" sub="One laptop, zero budget, and a lot of coffee." button="Let's build" pressAt={3.6} />
      </>
    ),
  },
  {
    id: "highlight-word",
    kind: "piece",
    title: "Keyword flips to an accent block",
    useFor: "The claim of a beat, word by word on narration times; the key word's box flips to accent fill in 4 hard frames and jiggles. mode='outline' gives the outlined-accent-type look instead.",
    api: '<HighlightWord text hitWord at times? hitAt? color? mode="block|outline" size? y? flank? />',
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => <HighlightWord text={"AI didn't take my job.\nIt took the boring part."} hitWord="boring" at={0.2} color={YELLOW} size={118} y={330} />,
  },
  {
    id: "brutal-card",
    kind: "primitive",
    title: "Card drop with squash",
    useFor: "Any boxed content: drops 60 px on a stiff spring, squashes on landing, its hard shadow grows in 3 frames behind; outAt squashes it out.",
    api: "<BrutalCard at x y w h? bg? shadowSize? rotate? outAt?>…</BrutalCard>  ·  <Box bg shadow radius />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <>
        {[
          { t: "Idea", s: "a note on your phone", c: YELLOW },
          { t: "Build", s: "the ugly version first", c: PINK },
          { t: "Ship", s: "before you feel ready", c: GREEN },
        ].map((c, i) => (
          <BrutalCard key={i} at={0.2 + i * 0.25} x={170 + i * 560} y={330} w={460} h={400} bg={c.c} rotate={[-2, 1.5, -1][i]} style={{ padding: 44, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div><Chip text={`Step 0${i + 1}`} size={28} /></div>
            <div>
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 104, letterSpacing: TRACK, lineHeight: 1, color: INK }}>{c.t}</div>
              <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 38, color: INK, marginTop: 14 }}>{c.s}</div>
            </div>
          </BrutalCard>
        ))}
      </>
    ),
  },
  {
    id: "sticker-burst",
    kind: "primitive",
    title: "Sticker burst at the frame edge",
    useFor: "Making any frame feel loud and friendly: stars, sparks, sunbursts, blobs, asterisks and coins cropped by the frame edge, popping in 3 frames apart, then spinning and bobbing slowly. One accent per scene.",
    api: '<StickerBurst shapes={["star","spark","burst","blob","asterisk","coin"]} palette seed count at items? />  ·  <Sticker shape size color at />',
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Sky />
        <StickerBurst shapes={["star", "blob", "spark", "burst", "asterisk", "star", "spark", "blob", "burst", "asterisk"]} palette={[GREEN]} seed={7} count={10} at={0.2} />
        <Headline text="Loud, but friendly." y={460} size={130} />
      </>
    ),
  },
  {
    id: "press-button",
    kind: "piece",
    title: "Button that physically presses",
    useFor: "A call to action, 'click here', 'hit run', 'then you press deploy': a drawn cursor glides in, the button sinks 8 px into its shadow on the cue, with a comic click burst.",
    api: "<PressButton label pressAt x y at? color? size? hold? cursor? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}><Chip text="then you press…" size={34} bg={YELLOW} shadow={5} /></div>
        <PressButton label="Deploy" pressAt={1.5} at={0.2} x={960} y={560} size={80} />
      </>
    ),
  },
  {
    id: "checklist",
    kind: "piece",
    title: "Checklist card",
    useFor: "A list or steps said one after another: rows slide in on their times, each box flips green with a thick check when it's done.",
    api: "<Checklist title items={[{ text, at, checkAt? }]} at x? y? w? color? label? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <Checklist
        title="Ship checklist"
        at={0.2}
        items={[
          { text: "Write the idea down", at: 0.6, checkAt: 1.4 },
          { text: "Build the ugly version", at: 0.9, checkAt: 1.9 },
          { text: "Show five real people", at: 1.2, checkAt: 2.4 },
          { text: "Ship it anyway", at: 1.5, checkAt: 2.9 },
        ]}
      />
    ),
  },
  {
    id: "coin-counter",
    kind: "piece",
    title: "Coin counter",
    useFor: "A big number or stat: it ticks up in stepped 2-frame jumps inside a bordered tag, then the frame punches 1.04 and coins pop out.",
    api: '<CoinCounter from to at dur? prefix? suffix? label? bg? x? y? coins? />',
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => <CoinCounter from={0} to={12480} at={0.2} dur={1.6} label="Your first month" />,
  },
  {
    id: "versus",
    kind: "piece",
    title: "A vs B cards",
    useFor: "Any comparison: two cards drop, a VS sunburst slams between them, then the loser squashes flat and the winner punches with a tag.",
    api: '<Versus left={{ label, title, points?, color }} right={…} at={{ left, right, vs, win? }} winner? winLabel? />',
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <Versus
        left={{ label: "Option A", title: "No-code", points: ["Live in an hour", "Hits a wall fast"], color: YELLOW }}
        right={{ label: "Option B", title: "Real code", points: ["Slower start", "No ceiling"], color: PINK }}
        at={{ left: 0.2, right: 0.5, vs: 1.0, win: 2.2 }}
        winner="right"
      />
    ),
  },
  {
    id: "quote-card",
    kind: "piece",
    title: "Quote card",
    useFor: "A quote or callout: a big card with an accent quote-mark block cropped over its corner; one phrase gets a marker block on the word it's said.",
    api: "<QuoteCard quote who role? at hit? hitAt? color? />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => <QuoteCard quote="The fastest way to learn to code is to build something you actually want to use." hit="actually want to use" hitAt={1.4} who="Guest Name" role="Indie developer" at={0.2} />,
  },
  {
    id: "label-tag",
    kind: "piece",
    title: "Sticker label tag",
    useFor: "A shouted aside or reaction on top of anything: 'SALES!', 'NEW', 'FREE?!'. Rotated, with a speech tail or a lightning-bolt tail, pops and jiggles.",
    api: '<LabelTag text at x y rotate? bg? size? tail="left|right|bolt|none" />',
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <>
        <LabelTag text="Sales!" at={0.2} x={480} y={420} tail="bolt" rotate={-6} />
        <LabelTag text="New" at={0.45} x={960} y={600} tail="left" bg={PINK} rotate={5} size={64} />
        <LabelTag text="Free?!" at={0.7} x={1440} y={420} tail="right" bg={GREEN} rotate={-4} />
      </>
    ),
  },
  {
    id: "bar-chart",
    kind: "piece",
    title: "Bordered bar chart",
    useFor: "A chart of a few values: bars spring up from a thick baseline one by one, value chips pop on top, only the highlighted bar is in colour.",
    api: "<BarChart bars={[{ label, value, tag? }]} at stagger? highlight? color? max? title? x y w h />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <BarChart
        title="Commits this week"
        at={0.2}
        highlight={3}
        bars={[
          { label: "Mon", value: 3 },
          { label: "Tue", value: 5 },
          { label: "Wed", value: 4 },
          { label: "Thu", value: 9 },
          { label: "Fri", value: 6 },
        ]}
        y={260}
        h={520}
      />
    ),
  },
  {
    id: "flow",
    kind: "piece",
    title: "Step flow with fat arrows",
    useFor: "A process or pipeline: numbered boxes drop on their times, joined by fat black arrows that shoot across in stepped frames; sticker icons pop on each corner.",
    api: "<Flow nodes={[{ label, sub?, at, color?, icon? }]} y? boxW? boxH? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Flow
        y={400}
        nodes={[
          { label: "Idea", sub: "write it down", at: 0.2, icon: "spark" },
          { label: "Prototype", sub: "ugly is fine", at: 0.9, icon: "blob" },
          { label: "Ship", sub: "push to prod", at: 1.6, icon: "star" },
        ]}
      />
    ),
  },
  {
    id: "source-tag",
    kind: "piece",
    title: "Source lower third",
    useFor: "Naming the source of a claim or screenshot: a white bar snaps in bottom-left with a rotated accent SOURCE chip; outAt nudges it then slides it off.",
    api: "<SourceTag at source detail? label? outAt? color? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: SourceDemo,
  },
  {
    id: "color-wipe",
    kind: "transition",
    title: "Colour-block wipe",
    useFor: "Changing scene or chapter: a solid pink panel with black edges and a spinning burst slides across (12 f expo), the next scene is already on a different accent when it leaves. Swap scenes at at + WIPE_CUT.",
    api: '<ColorWipe at color? direction="right|left|up|down" sticker? />  ·  swap when t >= at + WIPE_CUT',
    seconds: 2,
    origin: ORIGIN,
    Demo: WipeDemo,
  },
  {
    id: "illustration-stage",
    kind: "piece",
    title: "Illustration stage",
    useFor: "A human moment ('me at 2 a.m.', 'the viewer thinks…'): a flat character typing at a laptop inside a bordered circle, bobbing and blinking, with speech bubbles and a bolt tag popping on cue.",
    api: "<IllustrationStage at bubbles={[{ text, at, side }]} tag={{ text, at }} color? shirt? head? cx cy r />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <IllustrationStage
        at={0.2}
        bubbles={[
          { text: "Me at 2 a.m.…", at: 0.8, side: "left" },
          { text: "…one more feature", at: 1.5, side: "right" },
        ]}
        tag={{ text: "It works!", at: 2.3 }}
      />
    ),
  },
];

export const neoBrutalismPop: LibraryTheme = {
  slug: "neo-brutalism-pop",
  name: "Neo-brutalism pop",
  summary: "Flat saturated colour blocks with thick black outlines and hard offset shadows, chunky Space Grotesk / Archivo Black type, and star, blob and coin stickers that snap into place like physical buttons.",
  feel: ["loud", "tactile", "youthful", "confident", "tech-tool explainer", "listicle"],
  status: "draft",
  board: "data/references/themes/neo-brutalism-pop.md",
  Background: Paper,
  entries,
};

export default neoBrutalismPop;
