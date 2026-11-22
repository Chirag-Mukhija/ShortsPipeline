// Catalog of the liquid glass lens theme: one entry and a self-contained demo per reusable item, all over the drawn bamboo plate.
import type { FC, ReactNode } from "react";
import { useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { CLEAR, Glass, GlassScene, INKY, SMOKE, type Tint } from "./glass";
import { condense } from "./moves";
import { GlassPlate } from "./plate";
import { GlassCompare, GlassLowerThird, GlassPill, GlassQuote, GlassStat, GlassSteps, GlassTitle, KeywordLens, label } from "./pieces";
import { DropletFlow, GlassButtonPress, GlassTabBar, LensSweep, LensWipe, MergeDrops } from "./signature";

const ORIGIN = "library build (board: liquid-glass-lens)";

const Variants: FC = () => {
  const { t } = useTime();
  const vs: { name: string; note: string; tint: Tint; frost: number; x: number }[] = [
    { name: "Regular", note: "clear, bends at the rim", tint: CLEAR, frost: 0, x: 420 },
    { name: "Frosted", note: "blur 5 under the bend", tint: [255, 255, 255, 0.1], frost: 5, x: 960 },
    { name: "Dark", note: "smoked for white type", tint: INKY, frost: 0, x: 1500 },
  ];
  return (
    <>
      {vs.map((v, i) => {
        const at = 0.2 + i * 0.35;
        const c = condense(t, at);
        if (t < at) return null;
        return (
          <Glass key={v.name} shape={{ blobs: [{ x: v.x, y: 600, w: 470, h: 330, r: 64 }] }} {...c} frost={Math.max(c.frost, v.frost)} tint={v.tint}>
            <div style={{ textAlign: "center", opacity: c.content }}>
              <div style={label(56, 700)}>{v.name}</div>
              <div style={{ ...label(32, 600), marginTop: 12 }}>{v.note}</div>
            </div>
          </Glass>
        );
      })}
    </>
  );
};

const S: FC<{ children: ReactNode }> = ({ children }) => <GlassScene flat={false}>{children}</GlassScene>;

const entries: LibraryEntry[] = [
  {
    id: "grove-plate",
    kind: "background",
    title: "Bamboo grove plate",
    useFor: "The picture every lens bends: layered stalks, swaying leaves, light shafts and bokeh, drifting 1.5 % over 8 s so refraction always slides. mood=\"dusk\" for a cool, darker version.",
    api: "<GlassPlate mood?=\"grove\"|\"dusk\" />  ·  <GlassScene behind={svg}>…lenses…</GlassScene>",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassPill x={420} y={960} text="grove plate · drifts 1.5 % / 8 s" at={0.2} size={28} mono />
      </S>
    ),
  },
  {
    id: "glass-surface",
    kind: "primitive",
    title: "Glass surface",
    useFor: "Any refractive shape: SVG feDisplacementMap from an SDF normal map, RGB split at the rim, specular lip, fresnel, contact shadow and caustic. Regular, Frosted and Dark variants by tint and frost.",
    api: "<Glass shape={{ blobs:[{x,y,w,h,r}], k }} mode?=\"rim\"|\"dome\" refraction chroma frost tint zoom glint wobble scale under see>{content}</Glass>",
    seconds: 2.2,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <Variants />
      </S>
    ),
  },
  {
    id: "glass-title",
    kind: "piece",
    title: "Title slab",
    useFor: "Hook or chapter card: a mono kicker pill, then a clear slab condenses from a point with the title inside and one glint round its rim.",
    api: "<GlassTitle kick title sub at out? glint? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassTitle kick="Chapter 01" title="Glass that bends light" sub="clear lenses, real refraction" at={0.2} />
      </S>
    ),
  },
  {
    id: "keyword-lens",
    kind: "piece",
    title: "Keyword lens",
    useFor: "The spoken keyword: the line writes on word by word, then a dome lens condenses onto the key word, magnifies it and turns it lime.",
    api: "<KeywordLens words={[{w,t}]} keyIndex zoom? y? size? />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <KeywordLens
          keyIndex={3}
          words={[
            { w: "Agents", t: 0.2 }, { w: "read", t: 0.4 }, { w: "the", t: 0.55 }, { w: "whole", t: 1.25 }, { w: "repo", t: 0.75 }, { w: "first.", t: 0.9 },
          ]}
        />
      </S>
    ),
  },
  {
    id: "glass-steps",
    kind: "piece",
    title: "Steps with a sliding lens",
    useFor: "A list or steps: rows condense one by one as they are said; a lime lens slides down the number column on a liquid spring and magnifies the live step.",
    api: "<GlassSteps title? steps={[{text,at}]} x? y? width? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassSteps
          title="Before you hit record"
          steps={[
            { text: "Write the one-line promise", at: 0.4 },
            { text: "Plan the first fifteen seconds", at: 1.1 },
            { text: "Check every claim has a source", at: 1.8 },
            { text: "Phone on airplane mode", at: 2.6 },
          ]}
        />
      </S>
    ),
  },
  {
    id: "glass-stat",
    kind: "piece",
    title: "Stat under a dome",
    useFor: "A big number: it counts up flat on the plate, then a dome condenses onto it with a squash and swells it; the caption pill follows.",
    api: "<GlassStat value decimals? prefix? suffix? caption at countFor? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassStat value={3.2} decimals={1} suffix="×" caption="faster first draft · demo figure" at={0.3} />
      </S>
    ),
  },
  {
    id: "glass-compare",
    kind: "piece",
    title: "Split compare",
    useFor: "A vs B: one droplet splits into two panels that stay joined by a liquid bridge through a \"vs\" bead; the winner lights lime, the loser dims.",
    api: "<GlassCompare a={{title,lines}} b={{title,lines}} at splitAt? winner? decideAt? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassCompare
          at={0.2}
          splitAt={0.6}
          a={{ title: "Autocomplete", lines: ["Finishes your line", "Waits for you", "One file at a time"] }}
          b={{ title: "Agent", lines: ["Plans the steps", "Runs the tools", "Checks its own work"] }}
          winner="b"
          decideAt={2.7}
        />
      </S>
    ),
  },
  {
    id: "glass-quote",
    kind: "piece",
    title: "Quote on glass",
    useFor: "A quote or callout: a smoked slab condenses, the lines arrive, a lime mark sits on the rim, the attribution pill condenses below and a glint runs round.",
    api: "<GlassQuote lines={[...]} who role? at glint? out? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassQuote lines={["The best interface is the one", "you stop noticing."]} who="Demo Quote" role="placeholder name" at={0.2} />
      </S>
    ),
  },
  {
    id: "glass-lower-third",
    kind: "piece",
    title: "Lower third + source",
    useFor: "Who is speaking, bottom left, with an initials droplet; an optional source chip condenses bottom right.",
    api: "<GlassLowerThird name role at out? source? sourceAt? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassLowerThird name="Arjun Mehta" role="builds AI tools · demo name" source="State of AI Report 2026 · demo" at={0.2} />
      </S>
    ),
  },
  {
    id: "droplet-flow",
    kind: "piece",
    title: "Droplet flow",
    useFor: "A flow or pipeline: glass nodes condense along a dotted wire, then a droplet glides between them and melts into each node it reaches (smooth-min union), lighting it.",
    api: "<DropletFlow nodes={[...]} at hop? y? title? />",
    seconds: 5,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <DropletFlow title="One prompt, four hops" nodes={["Prompt", "Plan", "Tools", "Result"]} at={0.3} hop={0.85} />
      </S>
    ),
  },
  {
    id: "tab-bar",
    kind: "piece",
    title: "Liquid tab bar",
    useFor: "Signature: a glass tab bar whose selection droplet stretches toward the next tab on leading/trailing springs and lenses the label beneath it. Any \"switching modes\" or \"a new control\" beat.",
    api: "<GlassTabBar tabs={[...]} activeAt={[[t,index],...]} at y? caption? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassTabBar tabs={["Home", "Search", "Library", "Profile"]} activeAt={[[0, 0], [0.8, 2], [1.55, 0], [2.6, 3]]} at={0.1} caption="the droplet magnifies the label under it" />
      </S>
    ),
  },
  {
    id: "button-press",
    kind: "piece",
    title: "Glass button press",
    useFor: "Signature: a scripted cursor glides in, the button brightens on hover, the press flattens its bevel and sinks it, then it springs back with a ripple and confirms.",
    api: "<GlassButtonPress text at pressAt={[s]} done? x? y? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <GlassButtonPress text="Generate" done="Generated" at={0.2} pressAt={[1.9]} />
      </S>
    ),
  },
  {
    id: "lens-sweep",
    kind: "piece",
    title: "Magnifier sweep",
    useFor: "Signature: a dome magnifier drifts over a page of text (or UI) and enlarges what is under it, with chromatic fringe at its rim. Reading-along, \"look closer\" beats.",
    api: "<LensSweep lines={[...]} at path={[{t,x,y}]} zoom? r? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <LensSweep
          at={0.2}
          lines={["Most of the work is reading, not writing.", "Agents open the files, trace the calls", "and only then propose a change you can", "review line by line before it ships."]}
          path={[{ t: 0, x: 520, y: 344 }, { t: 1.3, x: 1060, y: 344 }, { t: 2.3, x: 760, y: 428 }, { t: 3.2, x: 1020, y: 512 }]}
        />
      </S>
    ),
  },
  {
    id: "merge-drops",
    kind: "piece",
    title: "Drops merge into one",
    useFor: "Signature: scattered droplets bob, drift together and fuse through liquid bridges into a single pill that names the idea. \"It all comes together\", \"one place\" beats.",
    api: "<MergeDrops text at mergeAt drops?={[{x,y,r}]} />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <MergeDrops text="One context" at={0.1} mergeAt={1.0} />
      </S>
    ),
  },
  {
    id: "lens-wipe",
    kind: "transition",
    title: "Lens wipe",
    useFor: "Scene transition: a lens condenses in the middle showing the next scene through the glass, grows past the frame edges, then relaxes flat.",
    api: "<LensWipe at dur? from={sceneA} to?=\"dusk\" toLayer={sceneB svg} x? y? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <S>
        <LensWipe at={0.5} dur={1.2} from={<GlassPill x={960} y={300} text="scene A · grove" at={0} out={0.9} size={40} tint={SMOKE} />} caption="scene B · dusk" />
      </S>
    ),
  },
];

export const liquidGlassLens: LibraryTheme = {
  slug: "liquid-glass-lens",
  name: "Liquid glass lens",
  summary: "Clear liquid lenses over a drawn bamboo grove: real SVG refraction with an RGB-split rim, specular lips, droplets that condense, squash and melt into each other, and a dome that magnifies what it lands on.",
  feel: ["clear", "wet", "premium", "weightless", "current"],
  status: "draft",
  board: "data/references/themes/liquid-glass-lens.md",
  Background: () => <GlassPlate />,
  entries,
};

export default liquidGlassLens;
