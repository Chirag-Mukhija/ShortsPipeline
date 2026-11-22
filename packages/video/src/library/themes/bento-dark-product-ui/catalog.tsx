// Catalog of the bento dark product UI theme: one entry and one demo per reusable piece, built from its reference board.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { useTime } from "../../core/time";
import { HUE, MUTED, SANS, SOFT, TEXT, hair } from "./theme";
import { Caret, Canvas, IconTile, Mono, PulseDot, appear } from "./primitives";
import { BigStat, LitLine, QuoteBlock, SourceLabel, TwoToneHeadline } from "./type";
import { ChatThreadCard, CommandPalette, FeatureDock, IssueSteps, LogoStrip, ProductMock, StatusPill } from "./ui";
import { FlowDiagram, IsoWireframe, SpotlightCard } from "./art";
import { BentoGrid, FocusDolly, SceneSwap, bentoRect, type BentoCell } from "./layout";
import { CompareCards, FeatureColumns } from "./pieces";

const ORIGIN = "theme board: data/references/themes/bento-dark-product-ui.md (Linear, Raycast, Vercel)";

// A small "New · …" pill under a hero headline, as on product sites.
const NewPill: FC<{ at: number; text: string; y: number }> = ({ at, text, y }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: 96, top: y, display: "flex", alignItems: "center", gap: 16, padding: "10px 22px 10px 16px", borderRadius: 40, boxShadow: `inset 0 0 0 1px ${hair(0.1)}`, background: hair(0.03), fontFamily: SANS, fontSize: 32, color: SOFT, ...appear(t, at).style }}>
      <PulseDot color={HUE.indigo} size={12} />
      <span style={{ color: TEXT, fontWeight: 500 }}>New</span>
      <span>{text}</span>
      <span style={{ color: MUTED }}>→</span>
    </div>
  );
};

// Built per render: JSX at module scope breaks the bundle's classic JSX runtime.
const bento = (): BentoCell[] => [
  { c: 0, r: 0, cs: 7, rs: 4, caption: "Fig 1 · Agents", title: "Agents", body: "that work beside you.", hue: HUE.indigo, content: <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center" }}><IsoWireframe variant="cubes" at={0.5} size={300} /></div> },
  {
    c: 7, r: 0, cs: 5, rs: 2, caption: "Status",
    content: <div style={{ position: "absolute", left: 30, bottom: 34 }}><StatusPill keys={[[0, "todo"], [1.0, "progress"], [2.4, "done"]]} size={32} /></div>,
  },
  { c: 7, r: 2, cs: 5, rs: 2, caption: "Cycle", title: "Velocity", body: "tracked per week.", content: <MiniBars /> },
  { c: 0, r: 4, cs: 4, rs: 2, bare: true, content: <HoverCell /> },
  {
    c: 4, r: 4, cs: 8, rs: 2, caption: "Composer",
    content: (
      <div style={{ position: "absolute", left: 30, right: 30, bottom: 34, display: "flex", alignItems: "center", gap: 16, fontFamily: SANS, fontSize: 38, color: TEXT }}>
        <IconTile name="sparkle" hue={HUE.indigo} size={56} />
        <span style={{ padding: "2px 10px", borderRadius: 8, background: "rgba(94,106,210,0.22)", color: "#B9C0FF" }}>@Agent</span>
        draft the release notes
        <Caret h={38} />
      </div>
    ),
  },
];

function MiniBars() {
  const { t } = useTime();
  const hs = [0.35, 0.5, 0.42, 0.62, 0.55, 0.78, 0.7, 0.92];
  return (
    <div style={{ position: "absolute", right: 34, top: 30, display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
      {hs.map((h, i) => (
        <span key={i} style={{ width: 22, borderRadius: 4, height: 120 * h * appear(t, 0.6 + i * 0.05, { d: 24 }).p, background: i === hs.length - 1 ? HUE.indigo : hair(0.14) }} />
      ))}
    </div>
  );
}

function HoverCell() {
  const r = bentoRect({ c: 0, r: 4, cs: 4, rs: 2 });
  return (
    <SpotlightCard w={r.w} h={r.h} path={[{ t: 0, x: 80, y: 230 }, { t: 1.0, x: 300, y: 150 }, { t: 2.0, x: 470, y: 90 }, { t: 3.4, x: 260, y: 190 }]}>
      <div style={{ position: "absolute", left: 30, top: 26 }}><Mono>Hover</Mono></div>
      <div style={{ position: "absolute", left: 30, bottom: 26, fontFamily: SANS, fontWeight: 500, fontSize: 38, color: TEXT, letterSpacing: "-0.015em" }}>
        Spotlight <span style={{ color: MUTED }}>follows the cursor.</span>
      </div>
    </SpotlightCard>
  );
}

const BentoFocusDemo: FC = () => (
  <FocusDolly target={bentoRect({ c: 0, r: 0, cs: 7, rs: 4 })} at={2.0} frames={75}>
    <BentoGrid cells={bento()} at={0.2} focus={{ index: 0, at: 2.0 }} />
  </FocusDolly>
);

const entries: LibraryEntry[] = [
  {
    id: "canvas",
    kind: "background",
    title: "Near-black canvas",
    useFor: "The stage every scene sits on: #08090A with a grid that dissolves at the edges, a top spotlight, a slow gradient sweep and fine grain. Pass a hue to tint the sweep per scene.",
    api: "<Canvas hue? grid? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "two-tone-headline",
    kind: "piece",
    title: "Two-tone headline",
    useFor: "Title or hook card: white lead clause, grey tail, words fading up 2 frames apart; litAt lights the tail left to right on a spoken cue.",
    api: "<TwoToneHeadline lead tail at litAt? out? eyebrow? size? x? y? width? align? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <>
        <TwoToneHeadline eyebrow="Chapter 01 · How agents work" lead="Your codebase, explained." tail="Every file and function mapped before you open the editor." at={0.3} size={96} y={250} width={1560} />
        <NewPill at={1.4} text="Agents can now open pull requests" y={720} />
      </>
    ),
  },
  {
    id: "lit-claim",
    kind: "piece",
    title: "Key word lights on the spoken word",
    useFor: "A short claim said word by word (narration word times): words land grey 3 frames early; the key word lands white with a hue hairline and glow.",
    api: "<LitLine words={[{ w, t, key? }]} y? size? hue? out? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <LitLine
        y={500}
        size={112}
        words={[{ w: "Most", t: 0.3 }, { w: "of", t: 0.45 }, { w: "the", t: 0.55 }, { w: "work", t: 0.7 }, { w: "is", t: 0.95 }, { w: "reading,", t: 1.15, key: true }, { w: "not", t: 1.7 }, { w: "writing.", t: 1.9 }]}
      />
    ),
  },
  {
    id: "issue-steps",
    kind: "piece",
    title: "Steps as issues",
    useFor: "A list or process: rows rise in as Todo; each turns In Progress and highlights when it's said, then Done (and greys) when the next starts. The header counts and a hue bar fills.",
    api: "<IssueSteps steps={[{ title, t, id?, tag? }]} at finishAt? title? x? y? w? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <IssueSteps
        title="Agent run"
        at={0.2}
        y={260}
        steps={[
          { id: "AGT-101", title: "Read the codebase", t: 0.9, tag: { label: "Context", hue: HUE.blue } },
          { id: "AGT-102", title: "Write a plan", t: 1.6, tag: { label: "Plan", hue: HUE.violet } },
          { id: "AGT-103", title: "Edit the files", t: 2.3, tag: { label: "Code", hue: HUE.amber } },
          { id: "AGT-104", title: "Run the tests", t: 3.0, tag: { label: "Verify", hue: HUE.green } },
        ]}
      />
    ),
  },
  {
    id: "big-stat",
    kind: "piece",
    title: "Big counted stat",
    useFor: "One number that matters: counts up expo-out in tabular figures, punches 6 frames when it lands, caption arrives after; optional series draws behind as a hairline area.",
    api: "<BigStat value at d? from? decimals? prefix? suffix? eyebrow? lead? tail? series? hue? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => <BigStat value={12480} at={0.4} d={1.4} eyebrow="Tokens read before the first edit" lead="Read first." tail="Then write." series={[2, 3, 2.6, 4, 3.8, 5.2, 4.9, 6.4, 7.1, 6.8, 8.9, 10.4, 12.5]} />,
  },
  {
    id: "compare",
    kind: "piece",
    title: "A vs B cards",
    useFor: "Comparing two tools, approaches or before/after: both cards rise, rows tick in, then at pickAt the loser drops to 30 % and the winner's border lights.",
    api: "<CompareCards left={{ label, title, rows }} right={…} at pick? pickAt? hue? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <CompareCards
        at={0.2}
        pickAt={2.3}
        left={{ label: "Before", title: "Autocomplete", rows: [{ text: "Finishes your line", good: true }, { text: "Sees one file", good: false }, { text: "You run the tests", good: false }] }}
        right={{ label: "After", title: "Coding agent", rows: [{ text: "Plans the change", good: true }, { text: "Reads the whole repo", good: true }, { text: "Runs the tests itself", good: true }] }}
      />
    ),
  },
  {
    id: "quote",
    kind: "piece",
    title: "Quote with logo strip",
    useFor: "A quote or callout from a person or doc: the text lights up as it's read, the speaker lands, and a grey wordmark row can highlight their company.",
    api: "<QuoteBlock lead tail who role at litAt? /> + <LogoStrip names at highlight? highlightAt? caption? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <QuoteBlock lead="We stopped writing tickets." tail="The agent drafts them from the thread, and we just review." who="Maya Chen" role="Head of Product, Northwind" at={0.2} litAt={1.9}>
        <LogoStrip names={["Northwind", "halcyon", "VERTEX", "Oxide", "Lumen", "parallax"]} at={0.8} highlight={0} highlightAt={2.6} y={850} />
      </QuoteBlock>
    ),
  },
  {
    id: "flow-diagram",
    kind: "piece",
    title: "Flow of hairline cards",
    useFor: "How something works: nodes light as they're named, elbowed hairlines draw between them and a hue pulse keeps travelling; earlier nodes settle back.",
    api: "<FlowDiagram nodes={[{ id, label, sub?, icon, x, y, t, hue? }]} edges={[{ from, to, t }]} />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <TwoToneHeadline eyebrow="Fig 2 · One request" lead="One prompt," tail="five hops." at={0.1} size={72} y={120} />
        <FlowDiagram
          nodes={[
            { id: "p", label: "Prompt", sub: "user", icon: "chat", x: 270, y: 580, t: 0.3 },
            { id: "a", label: "Agent", sub: "planner", icon: "sparkle", x: 720, y: 580, t: 1.0 },
            { id: "s", label: "Search", sub: "tool", icon: "search", x: 1170, y: 420, t: 1.7 },
            { id: "e", label: "Edit", sub: "tool", icon: "code", x: 1170, y: 740, t: 1.9 },
            { id: "r", label: "Pull request", sub: "output", icon: "git", x: 1650, y: 580, t: 2.7, hue: HUE.green },
          ]}
          edges={[
            { from: "p", to: "a", t: 0.6 },
            { from: "a", to: "s", t: 1.3 },
            { from: "a", to: "e", t: 1.5 },
            { from: "s", to: "r", t: 2.3 },
            { from: "e", to: "r", t: 2.4 },
          ]}
        />
      </>
    ),
  },
  {
    id: "source-label",
    kind: "piece",
    title: "Source lower third",
    useFor: "Naming a source, tool or speaker: a hairline toast bottom-left with a mono kicker, its border flaring then settling, a breathing status dot.",
    api: "<SourceLabel kicker? title meta? icon? at out? hue? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <TwoToneHeadline lead="Context windows" tail="are measured in tokens." at={0} size={88} y={300} />
        <SourceLabel title="Model context windows" meta="docs · 2026" icon="globe" at={0.5} />
      </>
    ),
  },
  {
    id: "scene-swap",
    kind: "transition",
    title: "Push dissolve",
    useFor: "Between scenes: the old one pushes to 1.06 and blurs to 6 px as it dissolves; the new one settles from 1.06 out of the blur.",
    api: "<SceneSwap at from={<A />} to={<B />} frames? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <SceneSwap
        at={0.9}
        from={<TwoToneHeadline eyebrow="Part one" lead="The problem." tail="Nobody reads the whole codebase." at={-1} size={96} y={380} />}
        to={<TwoToneHeadline eyebrow="Part two" lead="The fix." tail="An agent that reads it first." at={-1} size={96} y={380} />}
      />
    ),
  },
  {
    id: "product-mock",
    kind: "piece",
    title: "App window rising",
    useFor: "Showing 'the product': a DOM-built app window rises 60 px with a 1.02 settle, sidebar and issue rows stagger in, the selection walks the rows; its bottom dissolves into the canvas.",
    api: "<ProductMock rows={[{ id, title, state, tag?, who? }]} active={[[t, row]]} at view? workspace? x? y? w? h? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <TwoToneHeadline lead="Plan it. Ship it." tail="Let agents handle the busywork." at={0.1} size={80} y={110} width={1500} />
        <ProductMock
          at={0.5}
          y={330}
          active={[[0, 0], [1.9, 1], [2.9, 2]]}
          rows={[
            { id: "ENG-214", title: "Faster app launch", state: "progress", tag: { label: "Performance", hue: HUE.amber }, who: "K", whoHue: HUE.green },
            { id: "ENG-219", title: "Fix flaky login test", state: [[0, "todo"], [2.3, "progress"]], tag: { label: "Bug", hue: HUE.red }, who: "D", whoHue: HUE.blue },
            { id: "ENG-221", title: "Triage new issues", state: "review", tag: { label: "Agent", hue: HUE.indigo }, who: "A", whoHue: HUE.violet },
            { id: "ENG-224", title: "Migrate billing to v2", state: "todo", tag: { label: "Backend", hue: HUE.blue }, who: "M", whoHue: HUE.amber },
            { id: "ENG-230", title: "Dark mode polish", state: "todo", tag: { label: "Design", hue: HUE.violet }, who: "L", whoHue: HUE.red },
          ]}
        />
      </>
    ),
  },
  {
    id: "chat-thread",
    kind: "piece",
    title: "Chat thread card",
    useFor: "A conversation, an agent replying, 'you just ask it': typing dots, each message fades up on its time, the composer types an @mention draft and Send lights.",
    api: "<ChatThreadCard messages={[{ who, text, t, hue?, time?, agent? }]} at draft={{ text, at, mention? }} typeSpeed? x? y? w? h? />",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <ChatThreadCard
          at={0.1}
          messages={[
            { who: "Lena", text: "Is anyone else seeing the iOS app open slowly?", t: 0.6, time: "10:42", hue: HUE.amber },
            { who: "Didier", text: "Yes, the first render waits on a full sync.", t: 1.4, time: "10:43", hue: HUE.blue },
            { who: "Agent", text: "I can split this into two issues and draft a fix.", t: 2.2, time: "now", agent: true },
          ]}
          draft={{ mention: "@Agent", text: "go ahead, assign to me", at: 3.0 }}
        />
        <TwoToneHeadline eyebrow="Thread → issue" lead="Conversations in." tail="Issues out, already triaged." at={0.4} size={72} x={1040} y={360} width={780} />
      </>
    ),
  },
  {
    id: "command-palette",
    kind: "piece",
    title: "Command palette",
    useFor: "Search, 'just ask', launching a tool: the query types, results fade in, the highlight walks a row every 6 frames to the pick and flashes as if Enter was pressed, over a glow.",
    api: "<CommandPalette query results={[{ title, kind, icon, hue? }]} pick at typeAt? typeSpeed? hue? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <CommandPalette
        at={0.2}
        y={230}
        query="summarize this PR"
        pick={2}
        results={[
          { title: "Search pull requests", kind: "Extension", icon: "git" },
          { title: "Open in browser", kind: "Command", icon: "globe" },
          { title: "Summarize with AI", kind: "AI Command", icon: "sparkle", hue: HUE.red },
          { title: "Clipboard history", kind: "Command", icon: "clipboard" },
        ]}
      />
    ),
  },
  {
    id: "feature-dock",
    kind: "piece",
    title: "Feature dock with glow",
    useFor: "Walking through features or tools one by one: the active icon lifts, the stage and its big blurred glow change hue, and the two-tone caption crossfades in 8 frames.",
    api: "<FeatureDock items={[{ icon, label, lead, tail?, hue, stage? }]} activeAt={[t…]} at /> · <GlowBlob x y r hue|keys />",
    seconds: 3.8,
    origin: ORIGIN,
    Demo: () => (
      <FeatureDock
        at={0.1}
        activeAt={[0.3, 1.4, 2.6]}
        items={[
          { icon: "clipboard", label: "Clipboard", lead: "Never lose a copy.", tail: "Everything you copied, searchable.", hue: HUE.red },
          { icon: "sparkle", label: "Quick AI", lead: "Just ask.", tail: "Answers without switching apps.", hue: HUE.violet },
          { icon: "smile", label: "Symbols", lead: "Find any symbol.", tail: "Search by what it means.", hue: HUE.amber },
          { icon: "terminal", label: "Scripts", lead: "Automate it.", tail: "One shortcut, any script.", hue: HUE.green },
          { icon: "calc", label: "Calculator", lead: "Math, inline.", tail: "Units and currencies too.", hue: HUE.blue },
        ]}
      />
    ),
  },
  {
    id: "bento-focus",
    kind: "camera",
    title: "Bento grid, dolly into one",
    useFor: "Overview then focus: cards rise 4 frames apart in reading order, then the camera dollies into one panel (bezier .2,.7,.2,1) while the rest drop to 30 %. Includes a spotlight card on a scripted cursor.",
    api: "<FocusDolly target={bentoRect(cell)} at frames?><BentoGrid cells at focus={{ index, at }} /></FocusDolly> · <SpotlightCard w h path />",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: BentoFocusDemo,
  },
  {
    id: "iso-columns",
    kind: "piece",
    title: "Figure columns with isometric art",
    useFor: "Three ideas, pillars or features side by side: FIG captions, isometric wireframes drawing back to front then tracing in hue, white titles over grey lines.",
    api: "<FeatureColumns cols={[{ fig, variant: stack|cubes|fins|tiles, title, body, t }]} focus? /> · <IsoWireframe variant at />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <TwoToneHeadline lead="A new kind of workflow." tail="Built around agents." at={0} size={64} y={110} />
        <FeatureColumns
          y={260}
          cols={[
            { fig: "Fig 0.1", variant: "stack", title: "Built on context", body: "Agents read the repo before they touch it.", t: 0.3 },
            { fig: "Fig 0.2", variant: "cubes", title: "Many hands", body: "Small agents work side by side.", t: 0.9 },
            { fig: "Fig 0.3", variant: "fins", title: "Designed for speed", body: "Less waiting, more shipping.", t: 1.5 },
          ]}
        />
      </>
    ),
  },
];

export const bentoDarkProductUi: LibraryTheme = {
  slug: "bento-dark-product-ui",
  name: "Bento dark product UI",
  summary: "Near-black canvas, hairline-bordered cards in a bento grid, muted grey type with one bright word, and product UI that animates itself. Linear / Raycast / Vercel energy.",
  feel: ["precise", "calm", "technical", "expensive", "product"],
  status: "draft",
  board: "data/references/themes/bento-dark-product-ui.md",
  Background: () => <Canvas />,
  entries,
};

export default bentoDarkProductUi;
