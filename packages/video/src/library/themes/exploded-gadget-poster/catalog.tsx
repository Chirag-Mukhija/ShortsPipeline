// Catalog of the exploded-gadget-poster theme: one entry and one small demo per reusable item, on the canary-yellow poster field.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { INK, VIOLET, WHITE } from "./theme";
import { crank, ease, EXPO_OUT } from "./motion";
import { Battery, Camera, Chip, Earbud, EarbudCase, KEY_COUNT, Keyboard, Laptop, Phone } from "./gadgets";
import { OneBitScreen, ThumbGrid } from "./screen";
import { Callout, ExplodedStack } from "./exploded";
import { HeldDevice } from "./hand";
import { B, Body, Bubble, Claim, Headline, Pill, Wordmark } from "./type";
import { BigStat, HeroBand, Place, PosterField, PosterScroll, SignalPath, SourceSticker, SpecTable, Stage, Versus } from "./pieces";

const ORIGIN = "library build (theme draft), 2026-11-16";

// ---------- demos ----------
const HeroDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <HeroBand spot={[74, 62]} />
      <Body at={0.1} x={96} y={96} width={1000} color={WHITE} size={40}>
        <B>A tiny tour of the parts inside your phone.</B>
      </Body>
      <Stage>
        <Place x={1470} y={650} r={12} s={1.3} at={0.5}>
          <Phone finish="white" screen={(w, h) => <OneBitScreen w={w} h={h} t={t} scene="face" px={7} />} />
        </Place>
      </Stage>
      <Wordmark lines={["inside", "out."]} at={0.3} x={620} y={250} size={250} />
      <Pill text="Let's open it" at={0.75} x={620} y={830} size={52} pulses={[2.2]} />
    </AbsoluteFill>
  );
};

const ClaimDemo: FC = () => (
  <Claim
    x={96}
    y={300}
    size={150}
    words={[
      { w: "It's", t: 0.3 }, { w: "not", t: 0.5 }, { w: "the", t: 0.7 }, { w: "chip.", t: 0.9, br: true },
      { w: "It's", t: 1.6 }, { w: "the", t: 1.8 }, { w: "battery.", t: 2.1, key: true },
    ]}
  />
);

const ExplodedDemo: FC = () => (
  <AbsoluteFill>
    <Stage>
      <ExplodedStack x={930} y={800} at={0.9} scale={0.82} labelX={1400} />
    </Stage>
    <Headline lines={["The Inside."]} at={0.1} x={96} y={130} size={116} />
    <Body at={0.35} x={96} y={290} width={560}>
      Six layers and four tiny screws. Pull them apart and <B>every part has one job.</B>
    </Body>
  </AbsoluteFill>
);

const HeldDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <HeldDevice x={1270} y={430} at={0.1} device={<Phone finish="white" screen={(w, h) => <OneBitScreen w={w} h={h} t={t} scene="hills" px={7} />} />} />
      </Stage>
      <Headline lines={["The Screen."]} at={0.2} out={1.9} x={96} y={200} />
      <Body at={0.45} out={1.9} x={96} y={380} width={640}>
        No backlight. It reflects the room, so it <B>reads in full sun.</B>
      </Body>
      <Headline lines={["The Size."]} at={2.15} x={96} y={200} />
      <Body at={2.35} x={96} y={380} width={640}>
        Small enough that <B>one thumb reaches every corner.</B>
      </Body>
      <Bubble at={2.6} x={1215} y={300} width={420} tail="right">One-handed!</Bubble>
    </AbsoluteFill>
  );
};

const LaptopDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <Place x={1250} y={560} at={0.2} shadow={330} s={1}>
          <Laptop w={800} finish="silver" screen={(w, h) => <OneBitScreen w={w} h={h} t={t} scene="orbit" px={6} on={ease(t, 0.6, 0.3, EXPO_OUT)} />} />
        </Place>
      </Stage>
      <Headline lines={["Black.", "And white."]} at={0.1} x={96} y={170} size={120} />
      <Body at={0.5} x={96} y={430} width={600}>
        Every pixel is on or off, and the picture <B>flips eight times a second.</B>
      </Body>
      <Bubble at={1.6} x={1480} y={170} width={360} tail="left" size={40}>No grey at all!</Bubble>
    </AbsoluteFill>
  );
};

const SpecDemo: FC = () => {
  const { t } = useTime();
  const bob = (k: number) => Math.sin(t * 2 + k) * 8;
  return (
    <AbsoluteFill>
      <Stage>
        <Place x={1430} y={720} at={0.2} shadow={150} s={1.3}>
          <EarbudCase open={ease(t, 0.6, 0.6, EXPO_OUT)} led={0.5 + 0.5 * Math.sin(t * 3)} />
        </Place>
        <Place x={1290} y={330 + bob(0)} at={0.7} r={-14}>
          <Earbud r={74} />
        </Place>
        <Place x={1590} y={360 + bob(2)} at={0.85} r={14}>
          <Earbud r={74} flip />
        </Place>
      </Stage>
      <Headline lines={["The Specs."]} at={0.1} x={96} y={110} size={116} />
      <SpecTable
        at={0.45}
        x={96}
        y={300}
        width={820}
        rows={[
          { k: "Battery, buds", v: 6, unit: "h" },
          { k: "Battery, with case", v: 24, unit: "h", key: true },
          { k: "Driver size", v: 10, unit: "mm" },
          { k: "Weight, each", v: 5.2, unit: "g", decimals: 1 },
        ]}
      />
      <Body at={1.6} x={96} y={740} width={820} size={36}>
        Demo figures. Real ones come from <B>research/sources.md.</B>
      </Body>
    </AbsoluteFill>
  );
};

const StatDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <Place x={1460} y={560} r={8} at={0.3} shadow={290} s={1.1}>
          <Battery level={ease(t, 0.5, 1.6, EXPO_OUT)} />
        </Place>
      </Stage>
      <BigStat value={4500} unit="mAh" caption="of charge folded into a slab thinner than your thumb." at={0.3} x={96} y={260} />
    </AbsoluteFill>
  );
};

const VersusDemo: FC = () => (
  <Versus
    vsAt={1.1}
    a={{ title: "Full size.", lines: [`${KEY_COUNT.full} keys`, "numpad included"], art: <Keyboard u={30} />, at: 0.2 }}
    b={{ title: "Compact.", lines: [`${KEY_COUNT.compact} keys`, "half the desk"], art: <Keyboard u={30} compact finish="white" keyFinish="graphite" />, at: 0.6 }}
  />
);

const QuoteDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <Place x={1560} y={850} r={-10} at={0.1} s={1.7}>
          <EarbudCase led={0.5 + 0.5 * Math.sin(t * 3)} />
        </Place>
      </Stage>
      <Bubble at={0.5} x={1330} y={640} width={1100} tail="right" size={66}>
        “Make it so good that people forget it’s there.”
        <div style={{ marginTop: 22, fontFamily: "inherit", fontSize: 32, fontWeight: 800, color: VIOLET, letterSpacing: 0 }}>A product designer · demo quote</div>
      </Bubble>
    </AbsoluteFill>
  );
};

const Waves: FC = () => {
  const { t } = useTime();
  return (
    <g>
      <circle r={22} fill={VIOLET} />
      {[0, 1, 2].map((k) => {
        const ph = (t * 1.2 + k / 3) % 1;
        const r = 40 + ph * 80;
        return (
          <g key={k} opacity={1 - ph}>
            <path d={`M ${-r * 0.7} ${-r * 0.7} A ${r} ${r} 0 0 0 ${-r * 0.7} ${r * 0.7}`} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
            <path d={`M ${r * 0.7} ${-r * 0.7} A ${r} ${r} 0 0 1 ${r * 0.7} ${r * 0.7}`} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

const PathDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <SignalPath
        y={520}
        nodes={[
          { label: "Bud.", sub: "hears you", art: <Earbud r={80} />, t: 0.3 },
          { label: "Chip.", sub: "squeezes it", art: <Chip s={150} glow={0.5 + 0.5 * Math.sin(t * 4)} />, t: 0.8 },
          { label: "Radio.", sub: "sends it", art: <Waves />, t: 1.3 },
          { label: "Phone.", sub: "plays it", art: <g transform="rotate(10) scale(0.42)"><Phone screen={(w, h) => <OneBitScreen w={w} h={h} t={t} scene="wave" px={10} />} /></g>, t: 1.8 },
        ]}
      />
      <Headline lines={["How a sound travels."]} at={0.05} x={96} y={96} size={96} />
    </AbsoluteFill>
  );
};

const CalloutDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <Place x={960} y={600} at={0.1} shadow={230} s={1.1}>
          <Camera w={560} dial={crank(t)} trail={70} shutter={t > 2.4 && t < 2.6 ? 1 : 0} />
        </Place>
        <Callout from={[772, 392]} to={[420, 300]} side="left" text="Mode dial." sub="spins all day" at={0.8} />
        <Callout from={[840, 690]} to={[420, 800]} side="left" text="Lens." sub="glass, front to back" at={1.0} />
        <Callout from={[1126, 404]} to={[1480, 300]} text="Shutter." sub="the violet one" at={1.2} />
        <Callout from={[1230, 680]} to={[1480, 800]} text="Grip." sub="where your fingers go" at={1.4} />
      </Stage>
    </AbsoluteFill>
  );
};

const StickerDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <Place x={1440} y={500} r={-8} at={0.1} shadow={290} s={1.05}>
          <Battery level={0.35 + 0.05 * Math.sin(t * 2)} />
        </Place>
      </Stage>
      <Headline lines={["The Battery."]} at={0.1} x={96} y={130} size={116} />
      <Body at={0.3} x={96} y={290} width={700}>
        It wears out a little with every charge, <B>whether you notice or not.</B>
      </Body>
      <SourceSticker at={0.9} title="Example Source · 2026 Report" detail="example.com/report" />
    </AbsoluteFill>
  );
};

const ScrollDemo: FC = () => (
  <PosterScroll
    cuts={[1.05]}
    sections={[
      <AbsoluteFill key="a">
        <HeroBand spot={[50, 40]} />
        <Wordmark lines={["the", "chip."]} at={0.1} x={960} y={200} size={250} />
        <Pill text="Scroll down" at={0.3} x={960} y={820} />
      </AbsoluteFill>,
      <AbsoluteFill key="b">
        <PosterField />
        <Stage>
          <Place x={1340} y={560} s={1.6} shadow={190}>
            <Chip s={240} label="C-01" glow={0.6} />
          </Place>
        </Stage>
        <Headline lines={["The Chip."]} at={1.5} x={96} y={200} />
        <Body at={1.7} x={96} y={380} width={620}>
          A whole computer the size of <B>a fingernail.</B>
        </Body>
      </AbsoluteFill>,
    ]}
  />
);

const GridDemo: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Stage>
        <ThumbGrid x={830} y={300} t={t} at={0.4} />
      </Stage>
      <Headline lines={["The Library."]} at={0.1} x={96} y={200} size={110} />
      <Body at={0.3} x={96} y={360} width={620}>
        Nine little worlds, <B>each one in pure black and white.</B>
      </Body>
      <Bubble at={1.6} x={880} y={286} width={480} tail="left" size={38}>
        Wait! <u>No spoilers</u>, please!
      </Bubble>
    </AbsoluteFill>
  );
};

// ---------- entries ----------
const entries: LibraryEntry[] = [
  {
    id: "poster-field",
    kind: "background",
    title: "Canary poster field",
    useFor: "The page every scene sits on: flat canary yellow with one soft studio light drifting slowly. Swap to the grey HeroBand for an opening.",
    api: "<PosterField /> · <HeroBand spot={[x%, y%]} />",
    seconds: 1,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "hero-wordmark",
    kind: "piece",
    title: "Hero wordmark",
    useFor: "Title or hook card: grey hero band, two-line yellow wordmark that drops and squashes, the device bleeding off the right, a violet pill popping 6 frames later.",
    api: "<HeroBand /> <Wordmark lines={[a, b]} at /> <Pill text at pulses={[t]} /> <Place at><Phone screen /></Place>",
    seconds: 3,
    origin: ORIGIN,
    Demo: HeroDemo,
  },
  {
    id: "key-claim",
    kind: "piece",
    title: "Word-timed claim",
    useFor: "A key sentence landing word by word on the narration; the key word turns violet. Full stops are part of the look.",
    api: "<Claim words={[{ w, t, key?, br? }]} x y size />",
    seconds: 3,
    origin: ORIGIN,
    Demo: ClaimDemo,
  },
  {
    id: "exploded-stack",
    kind: "piece",
    title: "Exploded stack",
    useFor: "The signature 'how it's built' beat: a phone's six layers lift apart along a diagonal (expo-out, 4 f stagger) with floating screws and leader-line labels; reassembleAt drops them back in-back.",
    api: "<ExplodedStack x y at layers={[{ kind, label, sub }]} spacing vector stagger reassembleAt labelX scale />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: ExplodedDemo,
  },
  {
    id: "held-device",
    kind: "piece",
    title: "Hand-held device",
    useFor: "Object continuity: a drawn hand holds the device pinned on the right while headlines change on the left; it rises in rotating -6° → 0.",
    api: "<HeldDevice x y at device={<Phone screen />} angle /> + <Headline out /> swaps",
    seconds: 4,
    origin: ORIGIN,
    Demo: HeldDemo,
  },
  {
    id: "one-bit-screen",
    kind: "primitive",
    title: "1-bit screen",
    useFor: "Anything shown on a device screen: procedural scenes ordered-dithered to two LCD tones at 8 fps. Fits Phone, Laptop or any rect.",
    api: "<Laptop screen={(w, h) => <OneBitScreen w h t scene='orbit|hills|wave|tunnel|face|bars' fps={8} on />} />",
    seconds: 3,
    origin: ORIGIN,
    Demo: LaptopDemo,
  },
  {
    id: "spec-table",
    kind: "piece",
    title: "Spec sheet",
    useFor: "A list or spec rundown: hairline rules draw across, values count up, one row per beat, the key row in violet; the product floats beside it.",
    api: "<SpecTable rows={[{ k, v, unit, decimals, key }]} at x y width />",
    seconds: 3,
    origin: ORIGIN,
    Demo: SpecDemo,
  },
  {
    id: "big-stat",
    kind: "piece",
    title: "Poster number",
    useFor: "One big number: counts up in heavy type with its unit slapped on as a violet sticker, the object beside it reacting (a battery filling).",
    api: "<BigStat value unit caption at x y size dur />",
    seconds: 3,
    origin: ORIGIN,
    Demo: StatDemo,
  },
  {
    id: "versus",
    kind: "piece",
    title: "A vs B shelf",
    useFor: "Comparing two objects or options: each lands with a squash under its heavy title, a dotted divider draws and a violet 'vs.' pops between.",
    api: "<Versus a={{ title, lines, art, at }} b={...} vsAt />",
    seconds: 3,
    origin: ORIGIN,
    Demo: VersusDemo,
  },
  {
    id: "speech-quote",
    kind: "piece",
    title: "Speech-bubble quote",
    useFor: "A quote or cheeky aside: a white bubble pops from its tail with back-out and wiggles ±1.5°, coming out of the object.",
    api: "<Bubble x y at width tail='left|right' size>text</Bubble>",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: QuoteDemo,
  },
  {
    id: "signal-path",
    kind: "piece",
    title: "Signal path",
    useFor: "A flow or pipeline through real parts: objects pop as a thick ink line reaches them, then a violet packet loops along the path.",
    api: "<SignalPath nodes={[{ label, sub, art, t }]} y x0 x1 loop />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: PathDemo,
  },
  {
    id: "part-callouts",
    kind: "piece",
    title: "Part callouts",
    useFor: "Naming the parts of one object: leader lines draw out from dots on the part to heavy labels; the mode dial spins with a trailing arc as idle life.",
    api: "<Callout from={[x, y]} to={[x, y]} text sub at side /> · <Camera dial={crank(t)} trail />",
    seconds: 3,
    origin: ORIGIN,
    Demo: CalloutDemo,
  },
  {
    id: "source-sticker",
    kind: "piece",
    title: "Source sticker",
    useFor: "Source label or lower third: a white product-label sticker with barcode slaps on at the bottom-left and settles from -9° to -2°.",
    api: "<SourceSticker title detail at out x y />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: StickerDemo,
  },
  {
    id: "section-scroll",
    kind: "transition",
    title: "Section scroll",
    useFor: "Scene change: the page scrolls one section up in 20 frames, like a product page; grey hero to yellow sections, one per feature.",
    api: "<PosterScroll sections={[<A />, <B />]} cuts={[t]} dur />",
    seconds: 3,
    origin: ORIGIN,
    Demo: ScrollDemo,
  },
  {
    id: "thumb-grid",
    kind: "piece",
    title: "1-bit thumbnail grid",
    useFor: "A collection (apps, games, projects, episodes) or a music-only montage: nine 1-bit tiles flip in on a stagger, each running its own loop.",
    api: "<ThumbGrid x y t at cell gap stagger />",
    seconds: 3,
    origin: ORIGIN,
    Demo: GridDemo,
  },
];

export const explodedGadgetPoster: LibraryTheme = {
  slug: "exploded-gadget-poster",
  name: "Exploded gadget poster",
  summary: "Canary-yellow product-page posters: heavy grotesk headlines with full stops, generic gadgets drawn in glossy 2.5D, exploded layer stacks with leader-line callouts, a hand holding the device, 1-bit dithered screens and cheeky speech bubbles.",
  feel: ["cheerful", "tactile", "confident", "toy-like", "bold", "hardware"],
  status: "draft",
  board: "data/references/themes/exploded-gadget-poster.md",
  Background: PosterField,
  entries,
};

export default explodedGadgetPoster;
