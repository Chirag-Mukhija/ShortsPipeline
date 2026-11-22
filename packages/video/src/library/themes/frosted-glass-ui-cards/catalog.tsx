// Catalog of the frosted glass UI cards theme: one entry and one demo per reusable piece, built from its reference board.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { ramp, useTime } from "../../core/time";
import { CORAL, CYAN, INK, MINT, ORCHID, SANS, SOFT } from "./theme";
import { Backdrop, Sphere } from "./field";
import { Chip, GlassCard, Pane, Rig } from "./glass";
import { Icon, IconTile } from "./icons";
import { FrostedCaption, HeroTitle, KeyClaim, QuoteCard, SourceLabel, Words, say } from "./type";
import { CompareCards, FeatureGrid, GlassFlow, StatCard, StepList } from "./data";
import { DimVeil, GlassButton, GlassModal, MoodSwitch, ScriptedPointer, ToastStack } from "./ui";
import { FrostWipe, LayerStack, type StackLayer } from "./moves";

const ORIGIN = "theme board: data/references/themes/frosted-glass-ui-cards.md (freefrontend glass cards, Superdesign glassmorphism)";

const Label: FC<{ text: string; sub: string }> = ({ text, sub }) => (
  <div style={{ position: "absolute", left: 96, bottom: 96 }}>
    <Chip pad="14px 30px 14px 18px">
      <span style={{ width: 16, height: 16, borderRadius: 8, background: CYAN, boxShadow: `0 0 14px ${CYAN}` }} />
      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: INK }}>{text}</span>
      <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: SOFT }}>{sub}</span>
    </Chip>
  </div>
);

const GlassCardDemo: FC = () => (
  <Rig path={[{ t: 0, x: -0.4, y: 0.2 }, { t: 2.2, x: 0.5, y: -0.3 }]}>
    <Sphere x={790} y={300} r={190} tone="coral" at={0} seed={1} />
    <Sphere x={1290} y={800} r={140} tone="cyan" at={0.1} seed={2} />
    <GlassCard x={300} y={210} w={760} h={520} at={0.2} pad="56px 60px" depth={6}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: INK, letterSpacing: "-0.03em" }}>Clear glass</div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, color: SOFT, marginTop: 10 }}>blur 24 · saturate 160%</div>
    </GlassCard>
    <GlassCard x={900} y={420} w={700} h={430} at={0.5} tint="milk" glint={[1.7]} depth={18} float={2} pad="52px 56px">
      <IconTile name="layers" size={88} color={CYAN} />
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: INK, letterSpacing: "-0.03em", marginTop: 28 }}>Milk glass</div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, color: SOFT, marginTop: 6 }}>the hero, one layer nearer</div>
    </GlassCard>
    <GlassCard x={1240} y={210} w={430} h={116} r={58} at={0.9} enter="pop" tint="cyan" depth={26} float={4} pad="0 34px 0 18px" contentStyle={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
      <IconTile name="sparkle" size={76} color={CYAN} />
      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: INK }}>Accent tint</span>
    </GlassCard>
  </Rig>
);

const layers = (): StackLayer[] => [
  {
    z: 0,
    label: "Window",
    sub: "the frame",
    anchor: [1000, 610],
    node: (
      <Pane x={0} y={0} w={1000} h={620} r={36} tint="smoke">
        <div style={{ position: "absolute", left: 28, top: 26, display: "flex", gap: 12 }}>
          {["#FF6B6B", "#FFC857", "#5FE8B7"].map((c) => <span key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c }} />)}
        </div>
      </Pane>
    ),
  },
  {
    z: 150,
    label: "Navigation",
    anchor: [254, 140],
    node: (
      <Pane x={24} y={76} w={230} h={520} r={26}>
        {(["search", "chat", "chart", "layers", "user"] as const).map((n, i) => (
          <div key={n} style={{ position: "absolute", left: 24, top: 30 + i * 92, display: "flex", alignItems: "center", gap: 16 }}>
            <Icon name={n} size={38} color={i === 2 ? CYAN : "rgba(255,255,255,0.75)"} />
            <span style={{ width: 100 - i * 8, height: 14, borderRadius: 7, background: i === 2 ? CYAN : "rgba(255,255,255,0.3)" }} />
          </div>
        ))}
      </Pane>
    ),
  },
  {
    z: 300,
    label: "Content",
    anchor: [976, 420],
    node: (
      <>
        <Pane x={278} y={76} w={440} h={300} r={26}>
          <div style={{ position: "absolute", left: 30, top: 24, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: INK }}>Weekly views</div>
          <div style={{ position: "absolute", left: 30, right: 30, bottom: 28, height: 160, display: "flex", alignItems: "flex-end", gap: 16 }}>
            {[0.4, 0.55, 0.45, 0.7, 0.62, 0.9].map((h, i) => <span key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 10, background: i === 5 ? `linear-gradient(${CYAN}, rgba(142,240,255,0.3))` : "rgba(255,255,255,0.28)" }} />)}
          </div>
        </Pane>
        <Pane x={278} y={396} w={440} h={200} r={26}>
          {[0.8, 0.6, 0.7].map((w, i) => <span key={i} style={{ position: "absolute", left: 30, top: 40 + i * 50, width: `${w * 380}px`, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.32)" }} />)}
        </Pane>
        <Pane x={740} y={76} w={236} h={520} r={26}>
          {[CORAL, ORCHID, MINT, CYAN].map((c, i) => <span key={c} style={{ position: "absolute", left: 30, top: 34 + i * 118, width: 72, height: 72, borderRadius: 36, background: `linear-gradient(140deg, ${c}, rgba(255,255,255,0.3))` }} />)}
        </Pane>
      </>
    ),
  },
  {
    z: 450,
    label: "Overlay",
    sub: "toasts",
    anchor: [960, 90],
    node: (
      <>
        <Pane x={540} y={30} w={420} h={120} r={30} tint="milk">
          <div style={{ position: "absolute", left: 20, top: 20, display: "flex", alignItems: "center", gap: 18 }}>
            <IconTile name="bell" size={80} color={CORAL} />
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: INK }}>New comment</span>
          </div>
        </Pane>
        <Pane x={720} y={500} w={240} h={84} r={42} tint="cyan">
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 32, color: INK }}>Publish</div>
        </Pane>
      </>
    ),
  },
];

const LayerStackDemo: FC = () => (
  <Rig path={[{ t: 0, x: 0, y: 0 }, { t: 2.6, x: 0.6, y: -0.4 }, { t: 4.2, x: -0.3, y: 0.2 }]}>
    <Sphere x={760} y={660} r={200} tone="coral" at={0} seed={6} drift={0.5} />
    <Sphere x={380} y={400} r={100} tone="cyan" at={0} seed={7} />
    <LayerStack layers={layers()} x={250} y={330} w={1000} h={620} scale={0.84} at={0.1} tiltAt={0.5} explodeAt={1.5} labelX={1440} />
  </Rig>
);

const ModalDemo: FC = () => {
  const { t } = useTime();
  const btn = { x: 1160, y: 158, w: 340, h: 100 };
  const from = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
  return (
    <>
      <Sphere x={1480} y={760} r={170} tone="coral" at={0} seed={9} />
      <GlassCard x={300} y={140} w={1320} h={136} r={40} at={0.1} pad="0 40px" contentStyle={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
        <IconTile name="play" size={76} color={CORAL} />
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: INK }}>Untitled video</span>
        <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: SOFT }}>· 12:48</span>
      </GlassCard>
      <GlassButton {...btn} label="Summarise" icon="sparkle" at={0.3} hoverAt={0.95} pressAt={1.25} />
      <DimVeil at={1.4} />
      <GlassModal x={460} y={300} w={1000} h={600} from={from} at={1.42}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: INK, letterSpacing: "-0.03em" }}>Summarise this video</div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, color: SOFT, marginTop: 8 }}>Pick what you want back.</div>
        <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
          {([["Key points", "file", true], ["Chapters", "clock", false], ["Shorts", "play", false]] as const).map(([l, ic, on], i) => (
            <div key={l} style={{ opacity: ramp(t, 1.75 + i * 0.08, 0.3) }}>
              <Chip tint={on ? "accent" : "clear"} pad="16px 28px 16px 20px">
                <Icon name={ic} size={36} color={INK} />
                <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: INK }}>{l}</span>
              </Chip>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", gap: 20 }}>
          <Chip pad="20px 40px"><span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: SOFT }}>Cancel</span></Chip>
          <Chip tint="accent" pad="20px 44px"><span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: INK }}>Generate</span></Chip>
        </div>
      </GlassModal>
      <ScriptedPointer path={[{ t: 0, x: 1560, y: 820 }, { t: 1.0, x: 1350, y: 222 }, { t: 2.4, x: 1560, y: 980 }]} presses={[1.25]} at={0.3} />
    </>
  );
};

const WipeScene: FC<{ word: string; tone: "coral" | "cyan"; eyebrow: string }> = ({ word, tone, eyebrow }) => (
  <>
    <Sphere x={tone === "coral" ? 1380 : 560} y={tone === "coral" ? 360 : 720} r={170} tone={tone} seed={tone === "coral" ? 3 : 4} />
    <GlassCard x={460} y={330} w={1000} h={420} r={44} enter="none" pad="64px 80px" contentStyle={{ justifyContent: "center" }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: CYAN, letterSpacing: "0.14em", textTransform: "uppercase" }}>{eyebrow}</div>
      <Words words={say(`Part *${word}*`, -1)} size={150} weight={800} />
    </GlassCard>
  </>
);

const entries: LibraryEntry[] = [
  {
    id: "colour-field",
    kind: "background",
    title: "Colour field",
    useFor: "The stage under every glass scene: deep indigo with coral, violet, azure and cyan blobs drifting on an 8 s Lissajous loop, grain and a vignette. Recolour it with fields + mix; dim it for modals.",
    api: "<Backdrop /> or <ColourField fields={[FIELDS.dusk, FIELDS.ember]} mix={0..n} seed dim energy />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => <Label text="Colour field" sub="blobs drift on an 8 s loop" />,
  },
  {
    id: "glass-card",
    kind: "primitive",
    title: "Glass card",
    useFor: "Any panel: frosted pane with a top-lit fill, a specular rim that follows the tilt, idle float and glint. Put a Sphere half under its edge so the frost reads. Wrap scenes in <Rig> to script the parallax.",
    api: "<GlassCard x y w h tint={clear|milk|cyan|coral|violet|smoke} at out enter={rise|pop|frost} glint={[t]} glow lift dim depth pad /> · <Sphere x y r tone /> · <Rig path={[{ t, x, y }]}>",
    seconds: 3,
    origin: ORIGIN,
    Demo: GlassCardDemo,
  },
  {
    id: "hero-title",
    kind: "piece",
    title: "Hero title slab",
    useFor: "The video or chapter title: a big glass slab with an eyebrow pill, a headline whose one italic serif word carries the feeling, and small glass chips floating nearer the viewer.",
    api: '<HeroTitle eyebrow words={say("Design at the speed/ of *thought.*", at)} sub chips={[{ x, y, at, icon, text }]} at out />',
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <HeroTitle
        eyebrow="Chapter 01 · The new interface"
        words={say("Design at the speed/ of *thought.*", 0.4, 0.14)}
        sub="Glass panes, soft light, one idea per card."
        at={0}
        chips={[
          { x: 1400, y: 140, at: 1.6, icon: "sparkle", text: "AI assist" },
          { x: 150, y: 770, at: 1.8, icon: "bolt", text: "Live preview", color: CORAL },
        ]}
      />
    ),
  },
  {
    id: "key-claim",
    kind: "piece",
    title: "Key word in a glass capsule",
    useFor: "The one claim of a beat: words rise on their spoken times and a glass capsule springs open behind the key word, frosting two small spheres tucked behind it.",
    api: '<KeyClaim words={say("Most of the work is _reading,_/ not writing.", at)} keyIndex={5} sub subAt out />',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <KeyClaim words={say("Most of the work is _reading,_/ not writing.", 0.3, 0.18)} keyIndex={5} y={300} sub="Agents read the repo before they touch it." subAt={2.1} />,
  },
  {
    id: "step-list",
    kind: "piece",
    title: "Steps with a sliding selection",
    useFor: "A checklist or process read out step by step: a glass selection slides to each step as it is said (stretching with its speed) and the previous one ticks off.",
    api: "<StepList title steps={[{ text, t }]} doneAt at out />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <StepList
        title="Before you hit record"
        steps={[
          { text: "Write the one-line promise", t: 0.8 },
          { text: "Plan the first 15 seconds", t: 1.4 },
          { text: "Check every claim has a source", t: 2.0 },
          { text: "Phone on airplane mode", t: 2.6 },
        ]}
        doneAt={3.2}
      />
    ),
  },
  {
    id: "stat-card",
    kind: "piece",
    title: "Stat card with count-up",
    useFor: "One big number: it pops in on a stacked pair of cards, counts up (expo-out), lands with a 6-frame pop and glint, the delta chip springs in and the sparkline draws.",
    api: '<StatCard label value prefix suffix decimals delta="+38%" foot spark={number[]} icon at out x y />',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <StatCard label="Tokens read first" value={12480} delta="+38%" foot="vs last month" at={0} x={600} y={210} />,
  },
  {
    id: "compare",
    kind: "piece",
    title: "A vs B: one lifts, one recedes",
    useFor: "Two options side by side; on the verdict the winner lifts toward the viewer with a lit rim and the other sinks back, desaturated. The 'vs' is a glass bead.",
    api: "<CompareCards a={{ title, tag, icon, points, color }} b={…} pick={t} winner={0|1} at out />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <CompareCards
        a={{ title: "Chatbot", tag: "Answers", icon: "chat", points: ["Replies to a prompt", "Forgets the context", "You do the work"] }}
        b={{ title: "Agent", tag: "Acts", icon: "sparkle", points: ["Plans the steps", "Uses real tools", "Checks its own work"] }}
        pick={2.0}
        winner={1}
      />
    ),
  },
  {
    id: "quote",
    kind: "piece",
    title: "Quote card",
    useFor: "A quote or a definition: a big serif quote mark springs in, the words rise, the person's row follows and a glint crosses the glass.",
    api: '<QuoteCard quote={say("…", at)} name role initials at out />',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <QuoteCard quote={say("The best interface is the one you *stop* noticing.", 0.4, 0.12)} name="Lena Ortiz" role="Product designer · demo quote" initials="LO" />,
  },
  {
    id: "flow",
    kind: "piece",
    title: "Frosted flow",
    useFor: "A pipeline or request path: glass nodes pop in order, a light packet runs along each link and the node it reaches flares its rim and glints.",
    api: "<GlassFlow title nodes={[{ label, sub, icon, color }]} at gap out />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <GlassFlow
        title="One prompt, four hops"
        nodes={[
          { label: "Prompt", sub: "you type it", icon: "chat" },
          { label: "Plan", sub: "agent thinks", icon: "wand", color: ORCHID },
          { label: "Tools", sub: "search + edit", icon: "cpu", color: CORAL },
          { label: "Result", sub: "a pull request", icon: "check", color: MINT },
        ]}
        at={0}
      />
    ),
  },
  {
    id: "lower-third",
    kind: "piece",
    title: "Frosted lower thirds",
    useFor: "Who is speaking (a bar with a cyan-to-coral spine) and where a fact comes from (a source pill with an icon tile), each frosting in from the left.",
    api: '<FrostedCaption title line at out x y w /> · <SourceLabel kind="Source" title detail icon at out x y w />',
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <FrostedCaption title="Arjun Mehta" line="builds AI tools · demo name" at={0.2} />
        <SourceLabel title="State of AI Report 2026" detail="example.com/report · demo" at={0.6} x={1064} w={760} />
      </>
    ),
  },
  {
    id: "frost-wipe",
    kind: "transition",
    title: "Frost wipe",
    useFor: "Changing scene or chapter: a tilted sheet of frosted glass sweeps right to left with a cooler strip behind it, and the scene swaps while the sheet covers the frame.",
    api: "<FrostWipe at dur={1.1} a={<SceneA />} b={<SceneB />} />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <FrostWipe at={1.0} a={<WipeScene word="one" tone="coral" eyebrow="Chapter 01" />} b={<WipeScene word="two." tone="cyan" eyebrow="Chapter 02" />} />,
  },
  {
    id: "layer-stack",
    kind: "piece",
    title: "Exploded glass layers",
    useFor: "Signature. 'How it's built' or 'under the hood': an interface tilts into 3D, separates into stacked glass layers that frost each other, and flat callouts pin to each layer.",
    api: "<LayerStack layers={[{ z, label, sub, anchor, node: <Pane …/> }]} x y w h at tiltAt explodeAt labelX />",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: LayerStackDemo,
  },
  {
    id: "modal-pop",
    kind: "piece",
    title: "Button press, modal pops",
    useFor: "Signature. Showing a feature being used: a scripted pointer hovers and presses a glass button (lift, sink, glint), the field frosts over and a modal springs out of the button.",
    api: "<GlassButton x y w label icon hoverAt pressAt /> <DimVeil at /> <GlassModal x y w h from={{ x, y }} at /> <ScriptedPointer path presses />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: ModalDemo,
  },
  {
    id: "mood-switch",
    kind: "piece",
    title: "Mood switch recolours the room",
    useFor: "Signature. A mode, setting or mood change (also music-only section changes): the pill hops with an elastic stretch and the whole colour field behind the glass recolours, while the serif word rolls.",
    api: "<MoodSwitch moods={[{ name, word, field, accent }]} keys={[[t, index]]} at out /> · <PillSelector options keys w />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => <MoodSwitch keys={[[0, 0], [1.1, 1], [2.3, 2]]} at={0} />,
  },
  {
    id: "toast-stack",
    kind: "piece",
    title: "Toast stack",
    useFor: "Signature. A run of events, alerts or results: each toast drops in on a spring with a progress bar, pushes the others down, and the oldest fold back into a stack.",
    api: "<ToastStack toasts={[{ title, body, icon, t, color, time }]} x y w life out />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Sphere x={1450} y={330} r={130} tone="coral" seed={5} />
        <Sphere x={500} y={600} r={95} tone="cyan" seed={6} />
        <ToastStack
          toasts={[
            { title: "Build passed", body: "All 214 tests green in 38 s", icon: "check", t: 0.3, color: MINT },
            { title: "Agent finished", body: "Opened pull request #482", icon: "sparkle", t: 1.0 },
            { title: "Review requested", body: "Lena asked for your eyes", icon: "user", t: 1.7, color: ORCHID, time: "2m" },
            { title: "Deploy live", body: "v2.4 is on production", icon: "bolt", t: 2.4, color: CORAL },
          ]}
        />
      </>
    ),
  },
  {
    id: "feature-grid",
    kind: "piece",
    title: "Feature grid dealt from a stack",
    useFor: "Signature. Features, tools or options: a fanned deck of glass cards deals out centre-first into a 3×2 grid, each icon idling in its tile.",
    api: '<FeatureGrid heading="Everything, in *one* place." features={[{ title, sub, icon, color }]} at each out />',
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <FeatureGrid
        heading="Everything, in *one* place."
        features={[
          { title: "Search", sub: "Find any file fast", icon: "search" },
          { title: "Agents", sub: "Work beside you", icon: "sparkle" },
          { title: "Secure", sub: "Keys never leave", icon: "lock" },
          { title: "Sync", sub: "Every device, live", icon: "cloud" },
          { title: "Insights", sub: "See what changed", icon: "chart" },
          { title: "Plugins", sub: "Bring your tools", icon: "layers" },
        ]}
      />
    ),
  },
];

export const frostedGlassUiCards: LibraryTheme = {
  slug: "frosted-glass-ui-cards",
  name: "Frosted glass UI cards",
  summary: "Layered frosted panes over a drifting indigo-to-coral colour field: crisp lit spheres go soft behind the glass, specular rims follow a scripted tilt, cards spring, stack and deal. Plus Jakarta Sans with one Instrument Serif italic word.",
  feel: ["premium", "airy", "modern", "glassy", "product"],
  status: "draft",
  board: "data/references/themes/frosted-glass-ui-cards.md",
  Background: Backdrop,
  entries,
};

export default frostedGlassUiCards;
