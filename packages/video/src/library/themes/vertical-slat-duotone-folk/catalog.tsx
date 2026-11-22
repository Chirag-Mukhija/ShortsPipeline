// Catalog of the vertical slat duotone folk theme: one entry and one small demo per reusable piece, narrated and music-only.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { W, H } from "../../core/video";
import { INOUT, ramp } from "../../core/time";
import { Woven, useLoom } from "./clock";
import { Ground, Mark, SlatCanvas, SlatImage, Stage } from "./loom";
import { PhotoStandIn, landscape } from "./art";
import { Caps, SlatType } from "./type";
import { KilimWeave, SheepLoader, SlatLandscape, TitleCard, WindowPhoto } from "./scenes";
import { KeyWord, LoomChart, SerifQuote, SlatList, SlatStat, SourceTag, Versus } from "./cards";
import { BlindWipe, LouvreFlip } from "./transitions";
import { GROUND, M, SAND, UMBER } from "./theme";

const ORIGIN = "library build (vertical-slat-duotone-folk board), demo copy";
const BOARD = "data/references/themes/vertical-slat-duotone-folk.md";

const DarkLand: FC = () => (
  <AbsoluteFill style={{ background: GROUND.dark }}>
    <SlatLandscape />
  </AbsoluteFill>
);

// Same artwork, both sections: tan-on-umber on the left, inverted umber-on-sand on the right, bars growing in from the seam.
const SlatImageDemo: FC = () => {
  const { t } = useLoom();
  const land = landscape();
  const n = 160;
  return (
    <AbsoluteFill>
      <SlatImage tone={land} w={W / 2} col={(i) => ({ gain: Math.min(1, Math.max(0, ramp(t, 0.1, 1.1, INOUT) * 1.6 - ((n - i) / n) * 0.6)) })} />
      <AbsoluteFill style={{ left: W / 2, width: W / 2, background: SAND }} />
      <SlatImage tone={(x, y) => land(x + W / 2, y)} x={W / 2} w={W / 2} section="sand" invert col={(i) => ({ gain: Math.min(1, Math.max(0, ramp(t, 0.1, 1.1, INOUT) * 1.6 - (i / n) * 0.6)) })} />
    </AbsoluteFill>
  );
};

const BeatCaption: FC = () => {
  const { t, clock } = useLoom();
  const pos = clock.pos(t);
  return (
    <Stage>
      <Caps lines={[`${clock.bpm} BPM · BAR ${Math.max(1, pos.bar)} · BEAT ${Math.max(1, pos.beatInBar)}`, "AMBIENT · NO VOICE"]} x={M} y={H - M - 44} at={0} />
    </Stage>
  );
};

const PartCard: FC<{ section: "dark" | "sand"; part: string; sub: string }> = ({ section, part, sub }) => {
  const ink = section === "dark" ? undefined : UMBER;
  return (
    <AbsoluteFill style={{ background: GROUND[section] }}>
      {section === "sand" && <SlatCanvas tone={landscape({ trees: false, clouds: false, sun: false })} section="sand" invert y={560} h={520} />}
      <Stage>
        <Mark x={M} y={150} color={ink} />
        <Caps lines={[sub]} x={M} y={215} color={ink} />
        <SlatType text={part} x={M} y={470} size={170} color={ink} em={0.9} />
      </Stage>
    </AbsoluteFill>
  );
};

const entries: LibraryEntry[] = [
  {
    id: "woven-ground",
    kind: "background",
    title: "Woven ground",
    useFor: "Every slat scene sits on it: umber with faint warp threads and a rug fringe whose ends shimmer at 6 fps. section=\"sand\" for the light sections.",
    api: '<Ground section?="dark"|"sand" />',
    seconds: 1,
    origin: ORIGIN,
    Demo: () => (
      <Stage>
        <Mark x={M} y={150} />
        <Caps lines={["WOVEN GROUND · UMBER #2B2622", "TAN #B79F72 · SAND #C9B28A"]} x={M} y={215} />
      </Stage>
    ),
  },
  {
    id: "slat-image",
    kind: "primitive",
    title: "Slat image (any picture as bars)",
    useFor: "Turning a photo or drawn art into vertical duotone bars, bar width = tone, stepped dithered edges; the same artwork inverts for sand sections. Per-column overrides drive every wipe and growth.",
    api: "<SlatImage src?={staticFile(..)} tone?={landscape()|sheep()|poppy()…} x y w h period? section? invert? threshold? col={(i) => ({ gain, top, bottom, color })} />",
    seconds: 2,
    origin: ORIGIN,
    Demo: SlatImageDemo,
  },
  {
    id: "wordmark-title",
    kind: "piece",
    title: "Slat wordmark title card",
    useFor: "Video or chapter opening: a huge slatted wordmark with comb-fringed edges rises slice by slice across the bottom, the ridge emblem grows above, corner captions. Inside <Woven> the slices hop on each beat.",
    api: "<TitleCard title kicker={[..]} corner={[..]} at out? hop? />  ·  <SlatType text x y size at fit? lift? hop? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <TitleCard title="Slow Tech" kicker={["A FILM ABOUT", "TOOLS THAT LAST"]} corner={["EPISODE 04", "THE LOOM"]} at={0.2} />,
  },
  {
    id: "sheep-loader",
    kind: "piece",
    title: "Walking sheep loader",
    useFor: "Cold open, a loading or waiting beat, 'this takes time': a slat sheep walks in place at 8 fps over stepping tufts, two-corner captions and a percent counter on a thread of bars.",
    api: "<SheepLoader at load={s} topLeft={[..]} bottomLeft={[..]} bottomRight={[..]} />  ·  sheep({ x, y, s, pose, graze }) tone",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <SheepLoader at={0} load={3.2} topLeft={["A VALLEY OF SLOW TECH", "CHAPTER ONE"]} bottomLeft={["MADE BY HAND", "ON AN OLD LAPTOP"]} bottomRight={["LOADING THE STORY", "PLEASE WAIT"]} />
    ),
  },
  {
    id: "key-word",
    kind: "piece",
    title: "Key word lands in slats",
    useFor: "The claim of a beat on its spoken word: the lead line resolves word by word from thin stripes, the key word rises in heavy slats and its teeth grow taller.",
    api: "<KeyWord lead={[{ w, t }]} word at tail? tailAt? />  ·  <SlatWords words={[{ w, t, key? }]} />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <KeyWord lead={[{ w: "the", t: 0.2 }, { w: "only", t: 0.4 }, { w: "thing", t: 0.6 }, { w: "that", t: 0.8 }, { w: "lasts", t: 0.95 }, { w: "is", t: 1.15 }]} word="Craft" at={1.35} tail="not the tool you used" tailAt={2.1} />
    ),
  },
  {
    id: "slat-list",
    kind: "piece",
    title: "Woven list",
    useFor: "Steps or a short list said one by one: numerals rise in slats, the finished row thins to grey stripes, and a kilim strip gains one band per item.",
    api: "<SlatList title? items={[{ text, note?, at }]} />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <SlatList
        title="Three things I keep"
        items={[
          { text: "Write it by hand first", note: "paper before pixels", at: 0.4 },
          { text: "Keep the old laptop", note: "it still boots", at: 1.4 },
          { text: "Ship one small thing a week", note: "small, finished, often", at: 2.4 },
        ]}
      />
    ),
  },
  {
    id: "slat-stat",
    kind: "piece",
    title: "Big number with tally weave",
    useFor: "One figure that matters: the number counts up in heavy slats, a row of 50 bars stands the share up tall, a serif caption explains it.",
    api: "<SlatStat value at prefix? suffix? label? caption? of? decimals? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <SlatStat value={73} suffix="%" at={0.3} label="Laptops still in daily use" caption="were more than five years old (demo figure)" />,
  },
  {
    id: "versus",
    kind: "piece",
    title: "Dark vs sand comparison",
    useFor: "A vs B as the theme's two sections: A in tan slats on umber, B's half turns over louvre by louvre into umber-on-sand when it's said. Icons are slat art (cloud, cabin, or any tone).",
    api: '<Versus left={{ title, lines, icon: "cloud"|"cabin"|tone }} right={{…}} at={{ left, right }} />',
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <Versus
        left={{ title: "Rented", lines: ["Streams until it doesn't", "Someone else's server"], icon: "cloud" }}
        right={{ title: "Owned", lines: ["Yours on a bad day", "Runs with the wifi off"], icon: "cabin" }}
        at={{ left: 0.3, right: 1.6 }}
      />
    ),
  },
  {
    id: "prologue-quote",
    kind: "piece",
    title: "Prologue quote between poppies",
    useFor: "A quote, a principle, a chapter epigraph: centred serif caps wait as thin grey stripes and each line resolves to solid type on its cue, between swaying slat poppies.",
    api: "<SerifQuote kicker? lines={[..]} at={number|number[]} cite? citeAt? flowers? />",
    seconds: 4.4,
    origin: ORIGIN,
    Demo: () => (
      <SerifQuote
        kicker="PROLOGUE"
        lines={["“Among all these tools,", "the quiet ones", "outlast the loud ones", "and teach us to make", "things slowly.”"]}
        at={[0.3, 0.9, 1.5, 2.6, 3.2]}
        cite="Guest name · demo"
      />
    ),
  },
  {
    id: "loom-chart",
    kind: "piece",
    title: "Loom bar chart",
    useFor: "A small dataset or a trend: each bar is a cluster of slats rising one after another with a fringed top; the key bar is denser with taller teeth.",
    api: "<LoomChart title? data={[{ label, value, key? }]} at stagger? max? unit? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <LoomChart
        title="Things I shipped per month · demo data"
        at={0.4}
        data={[{ label: "Jan", value: 3 }, { label: "Feb", value: 5 }, { label: "Mar", value: 4 }, { label: "Apr", value: 9, key: true }, { label: "May", value: 6 }]}
      />
    ),
  },
  {
    id: "source-tag",
    kind: "piece",
    title: "Source label / lower third",
    useFor: "Citing a source or naming a speaker in the bottom-left corner: slat mark, tiny wide caps, the name in wide caps, a serif detail and a thread of bars weaving under it.",
    api: "<SourceTag at source detail? label? out? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <DarkLand />
        <SourceTag at={0.3} source="Pew Research Center" detail="Mobile fact sheet (demo label)" />
      </>
    ),
  },
  {
    id: "blind-wipe",
    kind: "transition",
    title: "Venetian-blind wipe to photo",
    useFor: "The reveal: slat art retracts column by column (24 f expo, delay per bar) to expose the full-colour photo behind; close={t} draws the blinds again.",
    api: '<BlindWipe at front={<slat scene/>} back={<photo/>} period? delayPerBar? dur? from?="bottom"|"top" close? />',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <BlindWipe at={0.5} front={<DarkLand />} back={<PhotoStandIn />} />,
  },
  {
    id: "louvre-flip",
    kind: "transition",
    title: "Louvre flip (tone invert)",
    useFor: "Section change: every slat narrows to its edge and turns over into the other section, dark to sand, left to right with a weave jitter, while the scene scrolls up.",
    api: "<LouvreFlip at a={<dark scene/>} b={<sand scene/>} period? spread? dur? scroll? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => <LouvreFlip at={0.7} a={<PartCard section="dark" part="Part one" sub="THE FAST WAY" />} b={<PartCard section="sand" part="Part two" sub="THE SLOW WAY" />} />,
  },
  {
    id: "window-photo",
    kind: "piece",
    title: "Window photo over slat art",
    useFor: "Showing a real photo (a place, the creator's desk) inside a slat world: it opens as vertical strips from its centre line, framed by a comb of bars, and floats.",
    api: "<WindowPhoto x y w h at src? caption={[..]} strip? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <DarkLand />
        <WindowPhoto x={190} y={150} w={660} h={400} at={0.3} caption={["FIG. 02 · THE VALLEY", "STAND-IN PHOTO"]} />
      </>
    ),
  },
  {
    id: "parallax-landscape",
    kind: "piece",
    title: "Parallax landscape on the beat (music-only)",
    useFor: "Ambient music-only stretches, establishing shots, a hometown beat: hills, firs, sun and a grazing sheep in 3-layer scroll parallax; inside <Woven> a wave of taller bars crosses on every beat and the sun rings pulse.",
    api: "<Woven spec={{ bpm, sections }}><SlatLandscape scroll={[t0, t1, from, to]} section? sheep? wave? at? /></Woven>",
    seconds: 6,
    origin: ORIGIN,
    Demo: () => (
      <Woven spec={{ bpm: 84, sections: [{ name: "intro", start: 0, end: 2.8 }, { name: "build", start: 2.8, end: 6 }] }}>
        <SlatLandscape scroll={[0, 6, 0, 140]} at={0} />
        <BeatCaption />
      </Woven>
    ),
  },
  {
    id: "kilim-weave",
    kind: "piece",
    title: "Kilim weaves on the beat",
    useFor: "Music-only interludes and chapter breaks, or any 'built one piece at a time' idea: a folk kilim weaves one band per beat (or per narration cue), the weft crossing left to right; it breathes on the kick.",
    api: "<Woven spec><KilimWeave every? startBeat? bands? section? /></Woven>  ·  narrated: <KilimWeave at={[t1, t2, …]} />  ·  kilim({ w, band, woven }) tone",
    seconds: 4.8,
    origin: ORIGIN,
    Demo: () => (
      <Woven spec={{ bpm: 96, sections: [{ name: "build", start: 0, end: 5 }] }}>
        <KilimWeave every={1} />
      </Woven>
    ),
  },
];

export const verticalSlatDuotoneFolk: LibraryTheme = {
  slug: "vertical-slat-duotone-folk",
  name: "Vertical slat duotone folk",
  summary: "Everything woven from thin vertical slats in two earthy colours (wheat tan on umber, umber on sand): slatted wordmarks with comb edges, a walking sheep, hills and poppies as scanline engravings, and venetian-blind wipes that open onto full-colour photos.",
  feel: ["woven", "earthy", "quiet", "crafted", "folk-modern"],
  status: "draft",
  board: BOARD,
  Background: () => <Ground />,
  entries,
};

export default verticalSlatDuotoneFolk;
