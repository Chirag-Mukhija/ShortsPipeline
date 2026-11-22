// Catalog of the spotlight noir theme: one entry and one demo per reusable piece, all lit from the dark.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { ACCENT, LIT, NIGHT, flicker } from "./theme";
import { Dark, Darkroom, spot } from "./light";
import { Txt } from "./type";
import { Bulb } from "./objects";
import { BeamLock, BlindsQuote, PinholeTitle, SwingTitle } from "./titles";
import { DoorSlit, Lineup, ShadowStat, TorchTrail, UnderTheLamp, VersusSpots } from "./pieces";
import { EvidencePhoto, FlashlightReveal, InvertSpot } from "./evidence";
import { IrisCut, LightsOut } from "./transitions";

const ORIGIN = "spotlight-noir-reveal theme build (draft, not yet used in a video)";

// A lit chapter card, used as the two scenes either side of the iris.
const Chapter: FC<{ n: string; title: string }> = ({ n, title }) => {
  const { t } = useTime();
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT }}>
      <Dark lights={[spot(960 + Math.sin(t * 1.3) * 6, 520, 420, { soft: 0.5, i: flicker(t, 4) })]} beams={[{ from: [960, -400], x: 960, y: 520, r: 380, dust: 30, seed: 2 }]}>
        <Txt x={960} y={410} text={n} size={32} voice="mono" fill={ACCENT} track={0.4} />
        <Txt x={960} y={545} text={title} size={200} voice="caps" track={0.06} />
      </Dark>
    </AbsoluteFill>
  );
};

const LightsOutDemo: FC = () => {
  const { t } = useTime();
  const on = flicker(t, 8);
  return (
    <>
      <LightsOut at={1.2} ember={3.2} bulb={{ x: 960, y: 250, s: 1.4 }}>
        <Dark lights={[spot(960, 600, 520, { soft: 0.6, i: on })]} beams={[{ from: [960, 320], x: 960, y: 640, r: 420, w0: 50, i: on, dust: 36, seed: 9 }]} over={<Bulb x={960} y={250} s={1.4} on={on} />}>
          <Txt x={960} y={650} text="Goodnight." size={130} voice="italic" />
        </Dark>
      </LightsOut>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Txt x={960} y={960} text="BLACKOUT HOLD" size={28} voice="mono" fill="#4A4E58" track={0.4} opacity={t > 1.6 ? 1 : 0} />
      </svg>
    </>
  );
};

const entries: LibraryEntry[] = [
  {
    id: "darkroom",
    kind: "background",
    title: "Darkroom",
    useFor: "The room with the lights off, behind every noir scene: near-black, a faint lamp haze that hums and dips now and then, dust drifting, grain and vignette.",
    api: "<Darkroom /> (theme Background); <Dark lights glow beams wall dim cam floor shadow over>{content}</Dark> for any lit scene",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Txt x={120} y={960} text="DARKROOM · LIGHTS OFF" size={28} voice="mono" fill={LIT} opacity={0.22} anchor="start" track={0.3} />
      </svg>
    ),
  },
  {
    id: "swinging-spotlight",
    kind: "piece",
    title: "Swinging spotlight title",
    useFor: "A cold open or hook card: a lamp swings across in the dark and every letter it passes catches the light and keeps it, until the beam settles on the title.",
    api: "<SwingTitle title kicker? sub? at settle y? size? />",
    seconds: 4.4,
    origin: ORIGIN,
    Demo: () => <SwingTitle title="WHO'S WATCHING" kicker="CASE FILE 07" sub="what your phone does at 2 a.m." at={0.2} settle={3.3} />,
  },
  {
    id: "pinhole-title",
    kind: "piece",
    title: "Pinhole aperture title",
    useFor: "A title or chapter card that should feel like a reveal: a pinhole of light flares in black, then an aperture with a chromatic edge opens on the title.",
    api: "<PinholeTitle title kicker? sub? at open? r? cx? cy? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => <PinholeTitle title="THE HIDDEN LAYER" kicker="PART ONE" sub="a story told in the dark" at={0.25} />,
  },
  {
    id: "beam-lock",
    kind: "piece",
    title: "Beam hunts, locks on the key word",
    useFor: "A claim said word by word: the beam jumps to each word as it is spoken (said words keep a low glow); on the key word it stops, tightens, rings, and the word turns amber.",
    api: "<BeamLock lines={[[{ w, t, key? }]]} y? size? from? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <BeamLock
        lines={[
          [{ w: "YOUR", t: 0.4 }, { w: "PHONE", t: 0.7 }, { w: "KNOWS", t: 1.05 }],
          [{ w: "WHERE", t: 1.5 }, { w: "YOU", t: 1.75 }, { w: "SLEEP.", t: 2.1, key: true }],
        ]}
      />
    ),
  },
  {
    id: "lamp-lineup",
    kind: "piece",
    title: "Lamp lineup (steps)",
    useFor: "Three or four steps or list items: one hanging lamp per step catches and lights it as it is named; the previous one sinks to half-light.",
    api: "<Lineup steps={[{ n?, label, sub?, t }]} y? />",
    seconds: 3.8,
    origin: ORIGIN,
    Demo: () => (
      <Lineup
        steps={[
          { label: "Collect", sub: "every tap, every place", t: 0.4 },
          { label: "Match", sub: "to one profile", t: 1.4 },
          { label: "Sell", sub: "to whoever bids", t: 2.4 },
        ]}
      />
    ),
  },
  {
    id: "shadow-stat",
    kind: "piece",
    title: "Big number, giant shadow",
    useFor: "The one stat that should feel ominous: a lamp snaps on below it, the number counts in and throws a huge shadow up the wall.",
    api: "<ShadowStat value prefix? suffix? decimals? label note? at light? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <ShadowStat value={73} suffix="%" label="OF APPS ASKED FOR LOCATION" note="[ DEMO FIGURE ]" at={0.3} />,
  },
  {
    id: "crossed-spots-versus",
    kind: "piece",
    title: "Crossed spotlights: A vs B",
    useFor: "A comparison with a verdict: two theatre spots cross over the stage, one per side; on the verdict the loser's lamp dies to half-light and the winner tightens and turns amber.",
    api: '<VersusSpots a={{ label, sub?, t }} b={{ … }} verdict?={{ winner: "a"|"b", t }} vs? />',
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => <VersusSpots a={{ label: "CLOUD", sub: "sends it away", t: 0.3 }} b={{ label: "ON-DEVICE", sub: "stays with you", t: 1.0 }} verdict={{ winner: "b", t: 2.2 }} />,
  },
  {
    id: "blinds-quote",
    kind: "piece",
    title: "Quote through venetian blinds",
    useFor: "A quote or callout with weight: blind-slat light falls across the wall and tilts open as the quote is said; a fedora silhouette stands in the light (figure={false} to drop it).",
    api: "<BlindsQuote lines={[...]} by? at? x? y? size? figure? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => <BlindsQuote lines={["Privacy isn't hiding something.", "It's owning the light switch."]} by="— DEMO QUOTE" at={0.3} />,
  },
  {
    id: "torch-trail",
    kind: "piece",
    title: "Torch follows the flow",
    useFor: "A flow or chain of steps (where the data goes): a hand-held torch finds each node as it is named, found nodes stay lit, and an amber thread joins them.",
    api: '<TorchTrail nodes={[{ x, y, label, sub?, icon: "phone"|"tower"|"server"|"eye", t }]} r? from? />',
    seconds: 4.2,
    origin: ORIGIN,
    Demo: () => (
      <TorchTrail
        nodes={[
          { x: 330, y: 380, label: "Your phone", sub: "TAP", icon: "phone", t: 0.5 },
          { x: 790, y: 600, label: "Cell tower", sub: "PING", icon: "tower", t: 1.4 },
          { x: 1240, y: 360, label: "Data broker", sub: "BUNDLE", icon: "server", t: 2.3 },
          { x: 1600, y: 600, label: "Ad network", sub: "WATCH", icon: "eye", t: 3.2 },
        ]}
      />
    ),
  },
  {
    id: "evidence-photo",
    kind: "piece",
    title: "Evidence print + tags",
    useFor: "A photo or screenshot as evidence: a print pinned in the dark, a torch swings onto it, and mono tags with drawn leader lines point at the details. Pass src for a real photo (shown in grey); the drawn print is the stand-in.",
    api: '<EvidencePhoto src? at exhibit? labels={[{ spot: "webcam"|[sx, sy], text, sub?, lx, ly, t }]} /> · <EvidenceLabel px py lx ly text sub? at />',
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <EvidencePhoto
        at={0.2}
        x={230}
        y={210}
        w={780}
        h={520}
        labels={[
          { spot: "webcam", text: "WEBCAM LED · ON", sub: "02:14 AM", lx: 1230, ly: 330, t: 1.2 },
          { spot: "screen", text: "SCREEN · LOCKED", sub: "but the light is on", lx: 1230, ly: 620, t: 1.8 },
        ]}
      />
    ),
  },
  {
    id: "door-slit-lower-third",
    kind: "piece",
    title: "Door-slit lower third",
    useFor: "A name, source or citation: a slit of light opens low in the frame like a door easing ajar, and the label is there inside it. Children are lit only inside the slit.",
    api: "<DoorSlit name role at? x? y? w?>{optional content}</DoorSlit>",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <DoorSlit name="Example Research Lab" role="SOURCE · ANNUAL REPORT 2025 · DEMO" at={0.3}>
        <Txt x={960} y={420} text="THE REPORT" size={220} voice="caps" track={0.08} />
      </DoorSlit>
    ),
  },
  {
    id: "flashlight-search",
    kind: "piece",
    title: "Flashlight searches the desk",
    useFor: "Finding the hidden detail: a torch roams a desk in the dark, the surface and objects exist only where it points, finds get tagged and keep a faint glow, and the beam rests on the last one.",
    api: '<FlashlightReveal things={[{ kind: "phone"|"keys"|"usb"|"note"|"receipt"|"pen"|"coin"|"mug", x, y, r?, s?, note? }]} path={[{ t, x, y, r? }]} finds={[{ t, x, y, text, sub?, lx, ly }]} />',
    seconds: 4.6,
    origin: ORIGIN,
    Demo: () => (
      <FlashlightReveal
        things={[
          { kind: "phone", x: 420, y: 330, r: -12 },
          { kind: "pen", x: 820, y: 190, r: 8 },
          { kind: "keys", x: 1520, y: 270, r: 20 },
          { kind: "coin", x: 640, y: 560 },
          { kind: "usb", x: 1180, y: 560, r: -25 },
          { kind: "mug", x: 250, y: 780 },
          { kind: "receipt", x: 700, y: 860, r: 84 },
          { kind: "note", x: 1520, y: 760, r: 7, note: ["admin", "1234"] },
        ]}
        path={[
          { t: 0.3, x: 160, y: 960 },
          { t: 0.9, x: 420, y: 340 },
          { t: 1.5, x: 860, y: 520 },
          { t: 2.0, x: 1180, y: 560 },
          { t: 2.8, x: 1500, y: 300 },
          { t: 3.4, x: 1520, y: 760 },
        ]}
        finds={[
          { t: 2.0, x: 1180, y: 560, text: "USB · UNLABELLED", lx: 1010, ly: 420 },
          { t: 3.4, x: 1450, y: 850, text: "STICKY NOTE", sub: "the password", lx: 1300, ly: 905 },
        ]}
      />
    ),
  },
  {
    id: "invert-loupe",
    kind: "piece",
    title: "Inverting loupe reveals the hidden layer",
    useFor: "Showing what is hidden inside something ordinary (metadata in a photo, terms in a contract): a loupe inverts what it passes over and shows a layer that only exists inside it.",
    api: "<InvertSpot path={[{ t, x, y, r? }]} r? reveal={<svg content in NIGHT>}>{content in LIT}</InvertSpot>",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <InvertSpot
        path={[
          { t: 0.2, x: 240, y: 470 },
          { t: 1.2, x: 1500, y: 430 },
          { t: 2.0, x: 1240, y: 560 },
        ]}
        r={280}
        reveal={
          <>
            <Txt x={1240} y={650} text="GPS  48.85 N  2.35 E" size={30} voice="mono" fill={NIGHT} />
            <Txt x={1240} y={696} text="TAKEN  02:14:07" size={30} voice="mono" fill={NIGHT} />
            <Txt x={1240} y={742} text="DEVICE  PHONE · DEMO" size={30} voice="mono" fill="#B3261E" />
          </>
        }
      >
        <Txt x={960} y={300} text="IMG_2041.JPG" size={30} voice="mono" fill={ACCENT} track={0.3} />
        <Txt x={960} y={470} text="JUST A PHOTO." size={210} voice="caps" track={0.05} />
      </InvertSpot>
    ),
  },
  {
    id: "under-the-lamp",
    kind: "piece",
    title: "Object under the lamp",
    useFor: "Introducing one object (a device, a product, a photo of a thing): a lamp switches on over it, a volumetric cone full of dust, a pool on the floor, and a long soft shadow with a tiny caption inside. Pass src or children to swap the drawn router.",
    api: "<UnderTheLamp at? label? src? base?>{optional object}</UnderTheLamp> · <Lamp x y on swing? /> · <Beam> via Dark beams",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => <UnderTheLamp at={0.3} label="EXHIBIT A · HOME ROUTER" />,
  },
  {
    id: "iris-cut",
    kind: "transition",
    title: "Iris cut",
    useFor: "The theme's scene change: eight camera-iris blades close to a pinhole of light (16 f), hold, and open on the next scene.",
    api: "<IrisCut at a={<SceneA />} b={<SceneB />} cx? cy? /> · irisAt(t, at) + <Iris r rot shut> for custom use",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => <IrisCut at={0.6} a={<Chapter n="CHAPTER 01" title="THE APP" />} b={<Chapter n="CHAPTER 02" title="THE DATA" />} />,
  },
  {
    id: "lights-out",
    kind: "transition",
    title: "Lights out (blackout hold)",
    useFor: "An ending, a chapter break, or a held breath in a music-only video: the lamp stutters and dies, black holds, and the bulb's filament keeps a fading ember.",
    api: "<LightsOut at bulb?={{ x, y }} ember?>{scene}</LightsOut> · <Bulb x y on ember? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: LightsOutDemo,
  },
];

export const spotlightNoirReveal: LibraryTheme = {
  slug: "spotlight-noir-reveal",
  name: "Spotlight noir reveal",
  summary: "Near-black rooms where a moving lamp, torch or blind-slat light reveals words and objects: real falloff through masks, volumetric beams with dust, hard shadows, an inverting loupe and an iris cut. Mystery, privacy and reveal topics.",
  feel: ["dramatic", "suspenseful", "cinematic", "focused", "noir"],
  status: "draft",
  board: "data/references/themes/spotlight-noir-reveal.md",
  Background: Darkroom,
  entries,
};

export default spotlightNoirReveal;
