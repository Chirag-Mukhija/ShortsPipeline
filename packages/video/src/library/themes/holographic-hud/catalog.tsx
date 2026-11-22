// Catalog of the holographic HUD theme: one entry and one small demo per reusable item, built from the theme board before any video used it.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { HOLO, LABEL_STYLE, MONO, MUTED } from "./theme";
import { HoloField } from "./field";
import { HoloCard, HudStage, Readouts, ScrambleText, headStyle } from "./primitives";
import { CardDeck, ChapterCard, KeywordLock, SourceTag, StatRing, TitleProjection, Transmission, VersusScan } from "./pieces";
import { FlowFloor, HoloStack, IncidentAlert, WireGlobe } from "./signature";
import { ScanWipe } from "./transitions";

const ORIGIN = "theme board (data/references/themes/holographic-hud.md), before any video";

const CardsDemo: FC = () => {
  const cards = [
    { x: 470, ry: 20, tone: "violet" as const, code: "01", title: "Context", body: "Reads the repo", at: 0.2 },
    { x: 960, ry: 0, tone: "holo" as const, code: "02", title: "Planner", body: "Writes the plan", at: 0.55 },
    { x: 1450, ry: -20, tone: "ok" as const, code: "03", title: "Tools", body: "Runs the tests", at: 0.9 },
  ];
  return (
    <HudStage>
      {cards.map((c, i) => (
        <HoloCard key={i} x={c.x} y={540} w={420} h={300} at={c.at} ry={c.ry} rx={4} z={i === 1 ? 60 : 0} tone={c.tone} title={c.title} code={c.code} glow={i === 1} seed={i + 1}>
          <div style={headStyle(48, 0.6)}>
            <ScrambleText text={c.body} at={c.at + 0.6} cps={35} seed={i + 9} />
          </div>
          <div style={{ position: "absolute", left: 34, bottom: 30, fontFamily: MONO, fontSize: 28, color: MUTED }}>{`agent.${c.title.toLowerCase()}()`}</div>
        </HoloCard>
      ))}
    </HudStage>
  );
};

const ScrambleDemo: FC = () => (
  <HudStage>
    <div style={{ position: "absolute", left: 200, top: 300, width: 1520 }}>
      <ScrambleText text="Resolving the signal" at={0.2} cps={30} seed={2} style={{ ...LABEL_STYLE, fontSize: 36, color: HOLO, display: "block", marginBottom: 24 }} />
      <div style={headStyle(120)}>
        <ScrambleText text="Every glyph lands." at={0.5} cps={28} seed={3} accent="lands." cursor />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 40, color: MUTED, marginTop: 40 }}>
        <ScrambleText text="> 3 frames of noise before each character" at={1.4} cps={45} seed={4} />
      </div>
    </div>
  </HudStage>
);

const ReadoutDemo: FC = () => (
  <HudStage>
    <HoloCard x={960} y={540} w={900} h={560} at={0.1} rx={4} ry={-8} title="Agent telemetry" code="T-07" seed={4} pad={44}>
      <Readouts
        width={812}
        size={44}
        rows={[
          { label: "Tokens read", value: 12480, at: 0.6 },
          { label: "Files opened", value: 37, at: 0.85 },
          { label: "Median step", value: 1.8, decimals: 1, unit: "s", at: 1.1 },
          { label: "Tests passing", value: 214, at: 1.35, tone: "ok", bar: 0.92 },
        ]}
      />
    </HoloCard>
  </HudStage>
);

const WipeDemo: FC = () => (
  <ScanWipe
    at={1.35}
    dur={0.6}
    label="Chapter"
    from={<HudStage><ChapterCard index={1} of={5} name="The loop" at={0.1} /></HudStage>}
    to={<HudStage><ChapterCard index={2} of={5} name="The tools" at={1.3} tone="violet" /></HudStage>}
  />
);

const FlowDemo: FC = () => {
  const { t } = useTime();
  return (
    <HudStage amp={0.6}>
      <div style={{ position: "absolute", left: 120, top: 110, opacity: t > 0.1 ? 1 : 0 }}>
        <ScrambleText text="Fig 2 · one request" at={0.1} cps={40} seed={1} style={{ ...LABEL_STYLE, fontSize: 30, color: HOLO, display: "block", marginBottom: 10 }} />
        <div style={headStyle(60)}>
          <ScrambleText text="One prompt, five hops." at={0.25} cps={40} seed={2} />
        </div>
      </div>
      <FlowFloor
        at={0.1}
        nodes={[
          { id: "p", label: "Prompt", sub: "user", x: -760, z: 40, t: 0.45 },
          { id: "a", label: "Planner", sub: "agent", x: -250, z: -200, t: 0.95, tone: "violet" },
          { id: "s", label: "Search", sub: "tool", x: 120, z: 300, t: 1.45 },
          { id: "e", label: "Edit", sub: "tool", x: 220, z: -330, t: 1.75 },
          { id: "r", label: "Pull request", sub: "output", x: 700, z: 60, t: 2.35, tone: "ok" },
        ]}
        links={[
          { from: "p", to: "a", t: 0.7 },
          { from: "a", to: "s", t: 1.2 },
          { from: "a", to: "e", t: 1.5 },
          { from: "s", to: "r", t: 2.05 },
          { from: "e", to: "r", t: 2.15 },
        ]}
      />
    </HudStage>
  );
};

const IncidentDemo: FC = () => (
  <IncidentAlert
    at={1.3}
    title="Build failed"
    detail="3 tests failing · exit code 1"
    code={39}
    before={
      <HudStage>
        <HoloCard x={960} y={540} w={860} h={360} at={0.1} rx={4} title="deploy.sh" code="RUN" seed={5} pad={44}>
          <Readouts width={772} size={42} rows={[{ label: "Tests", value: 214, at: 0.5, bar: 0.7 }, { label: "Stage", value: "integration", at: 0.75 }]} />
        </HoloCard>
      </HudStage>
    }
  />
);

const entries: LibraryEntry[] = [
  {
    id: "holo-field",
    kind: "background",
    title: "Projection room",
    useFor: "The room every HUD scene floats in: near-black field, perspective floor grid sliding toward camera with a rolling scan line, faint central rings, drifting motes, edge ticks, a running timecode and blinking link dots.",
    api: "<HoloField /> (also <FloorGrid cam? speed? step? />, ROOM camera)",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "holo-card",
    kind: "primitive",
    title: "Holo card pop",
    useFor: "The theme's building block for any panel: pops forward out of depth, unfolds from a hairline, draws its notched border, fades its fill; brackets snap in for emphasis; collapses to a line then a dot (or flickers) on exit.",
    api: "<HoloCard x y w h at out? exit? rx? ry? z? tone? title? code? glow? dim? lock? depth? fly?>…</HoloCard> inside <HudStage>",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: CardsDemo,
  },
  {
    id: "scramble-text",
    kind: "primitive",
    title: "Scramble type-on",
    useFor: "Any text that should feel decoded: each glyph lands at ~30 chars/s after 3 frames of seeded noise, an accent substring glows, an optional block cursor.",
    api: "<ScrambleText text at cps? seed? accent? cursor? style />",
    seconds: 3,
    origin: ORIGIN,
    Demo: ScrambleDemo,
  },
  {
    id: "data-readouts",
    kind: "primitive",
    title: "Data readout rows",
    useFor: "Several numbers at once (telemetry, a breakdown, specs): label, dotted leader, value rolling up through scrambled digits, optional segmented bar.",
    api: "<Readouts width size? rows={[{ label, value, unit?, decimals?, at, tone?, bar? }]} />",
    seconds: 3,
    origin: ORIGIN,
    Demo: ReadoutDemo,
  },
  {
    id: "title-projection",
    kind: "piece",
    title: "Projected title card",
    useFor: "The hook or episode title: a floor projector powers up, throws a light cone and the title card materialises inside the beam, typing its lines with meta chips below.",
    api: "<TitleProjection kicker code? lines={[…]} accent? meta={[{ k, v }]} at out? />",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: () => (
      <HudStage>
        <TitleProjection kicker="How agents work" lines={["AI writes the code.", "So what do I learn?"]} accent="learn?" meta={[{ k: "Ep", v: "01" }, { k: "Runtime", v: "08:00" }, { k: "Sources", v: "12" }]} at={0.2} />
      </HudStage>
    ),
  },
  {
    id: "keyword-lock",
    kind: "piece",
    title: "Keyword lock-on",
    useFor: "A claim landing word by word on the narration, with the key word big in cyan and a bounding box pinching in around it like an iris, then a red/cyan flash and a tag.",
    api: "<KeywordLock lines={[[{ w, t, key?, dim? }]]} size? keySize? tag? y? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <HudStage>
        <KeywordLock
          lines={[
            [{ w: "Most", t: 0.3 }, { w: "of", t: 0.45 }, { w: "the", t: 0.55 }, { w: "work", t: 0.7 }, { w: "is", t: 0.9 }],
            [{ w: "reading,", t: 1.15, key: true }],
            [{ w: "not", t: 2.0, dim: true }, { w: "writing.", t: 2.2, dim: true }],
          ]}
        />
      </HudStage>
    ),
  },
  {
    id: "card-deck",
    kind: "piece",
    title: "Card deck steps",
    useFor: "A list or process said one step at a time: each card flies out of the vanishing point into its slot on its word; the live card glows, finished ones step back, a rail tracks progress.",
    api: "<CardDeck heading? kicker? headingAt? steps={[{ title, sub?, t }]} focus? w? cardH? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <HudStage>
        <CardDeck
          kicker="4 steps"
          heading="The agent loop"
          headingAt={0.1}
          steps={[
            { title: "Read the codebase", sub: "context before anything else", t: 0.5 },
            { title: "Write a plan", sub: "small, checkable steps", t: 1.2 },
            { title: "Edit the files", sub: "one change at a time", t: 1.9 },
            { title: "Run the tests", sub: "and read what failed", t: 2.6 },
          ]}
        />
      </HudStage>
    ),
  },
  {
    id: "stat-ring",
    kind: "piece",
    title: "Ring gauge stat",
    useFor: "One big number on its spoken word: rings spin up, the value rolls through scrambled digits and punches with a red/cyan flash; a context line and an optional readout panel follow on a leader line.",
    api: "<StatRing value decimals? prefix? suffix? label context? fill={0..1} at rows? panelTitle? tone? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <HudStage>
        <StatRing
          value={12480}
          label="Tokens read"
          context="Read first. Then write."
          fill={0.78}
          at={0.2}
          rows={[
            { label: "Files", value: 37, at: 2.0 },
            { label: "Edits", value: 6, at: 2.2 },
            { label: "Tests", value: 214, at: 2.4, tone: "ok", bar: 0.9 },
          ]}
        />
      </HudStage>
    ),
  },
  {
    id: "versus-scan",
    kind: "piece",
    title: "Versus scan",
    useFor: "A vs B: two panels angled toward each other, a scan beam sweeps both, scored rows fill in, then the verdict turns the winner green with brackets locked and greys the loser red.",
    api: "<VersusScan a={{ name, tag, rows: [{ label, value, score }] }} b={…} at verdictAt winner='a'|'b' />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <HudStage amp={1}>
        <VersusScan
          at={0.2}
          verdictAt={3.0}
          winner="b"
          a={{ name: "Autocomplete", tag: "Before", rows: [{ label: "Scope", value: "one line", score: 0.2 }, { label: "Context", value: "open file", score: 0.3 }, { label: "Verifies", value: "no", score: 0.05 }] }}
          b={{ name: "Coding agent", tag: "After", rows: [{ label: "Scope", value: "whole task", score: 0.9 }, { label: "Context", value: "whole repo", score: 0.85 }, { label: "Verifies", value: "runs tests", score: 0.8 }] }}
        />
      </HudStage>
    ),
  },
  {
    id: "transmission-quote",
    kind: "piece",
    title: "Transmission quote",
    useFor: "A quote or callout as an intercepted transmission: the line types on beside a waveform that talks while it types, then the attribution and source land.",
    api: "<Transmission quote by role? source? at channel? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <HudStage>
        <Transmission quote="Talk is cheap. Show me the code." by="Linus Torvalds" role="Linux kernel mailing list" source="lkml · 2000" at={0.2} />
      </HudStage>
    ),
  },
  {
    id: "flow-table",
    kind: "piece",
    title: "Flow on a holo-table",
    useFor: "A diagram or pipeline in real perspective: pads light on a tilted table, node cards rise out of them on light stalks as they're named, links draw across the floor and packets keep flowing while the table turns.",
    api: "<FlowFloor nodes={[{ id, label, sub?, x, z, t, tone? }]} links={[{ from, to, t }]} at? plate? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: FlowDemo,
  },
  {
    id: "source-tag",
    kind: "piece",
    title: "Source tag",
    useFor: "A source label or lower third: a hairline stands up, the tag unfolds sideways with a barcode tail; on `out` it folds back to the line and blinks out as a dot.",
    api: "<SourceTag kind? title meta? at out? x? y? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <HudStage>
        <SourceTag title="Model context windows" meta="docs.anthropic.com · 2026" at={0.3} />
      </HudStage>
    ),
  },
  {
    id: "scan-wipe",
    kind: "transition",
    title: "Scan wipe + glitch landing",
    useFor: "The theme's scene change: a bright scan line with a ruler crosses the frame, the next scene is already behind it and lands with a 6-frame glitch slice. Shown with the chapter card.",
    api: "<ScanWipe at dur? from={…} to={…} glitch? label? /> · <GlitchSlice at frames? strength?>…</GlitchSlice> · <ChapterCard index of name at out? tone? />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: WipeDemo,
  },
  {
    id: "holo-stack",
    kind: "piece",
    title: "Exploded hologram stack",
    useFor: "'Under the hood' beats: a system projected from a floor pad as a slowly turning stack of plates that explodes apart on cue, each layer called out by a leader line while a scan band climbs through it.",
    api: "<HoloStack layers={[{ name, sub? }]} (bottom → top) at explodeAt cx? cy? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <HudStage amp={0.8}>
        <HoloStack at={0.2} explodeAt={1.0} layers={[{ name: "Compute", sub: "where the model runs" }, { name: "Memory", sub: "the context window" }, { name: "Interface", sub: "tools and APIs" }]} />
      </HudStage>
    ),
  },
  {
    id: "wire-globe",
    kind: "piece",
    title: "Wire globe radar",
    useFor: "Networks, regions, users around the world, security: a wireframe globe turns inside a radar ring, nodes ping as they face us, arcs lift between them, a readout panel reports.",
    api: "<WireGlobe dots={[{ lat, lon, at, tone? }]} arcs={[[i, j, at]]} at cx? cy? R? rows? panelTitle? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <HudStage amp={0.8}>
        <WireGlobe
          at={0.1}
          dots={[
            { lat: 51.5, lon: -0.1, at: 0.6 },
            { lat: 40.7, lon: -74, at: 0.7 },
            { lat: 37.8, lon: -122.4, at: 0.8 },
            { lat: 28.6, lon: 77.2, at: 0.5, tone: "ok" },
            { lat: 1.35, lon: 103.8, at: 0.9 },
            { lat: 35.7, lon: 139.7, at: 1.0 },
            { lat: -33.9, lon: 151.2, at: 1.1 },
          ]}
          arcs={[[3, 4, 1.2], [3, 0, 1.5], [4, 5, 1.8], [0, 1, 2.1]]}
          rows={[
            { label: "Regions", value: 7, at: 1.0 },
            { label: "Latency", value: 42, unit: "ms", at: 1.2 },
            { label: "Packets/s", value: 18400, at: 1.4, bar: 0.66 },
          ]}
        />
      </HudStage>
    ),
  },
  {
    id: "incident-alert",
    kind: "piece",
    title: "Incident inversion",
    useFor: "The one 'it broke' moment per video (a failed build, a breach, the bug): the HUD hard-cuts to its negative, a red cross slams in, a huge vertical counter rolls and the incident card glitches into place.",
    api: "<IncidentAlert at title detail code? kind? before={<scene before the cut />} />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: IncidentDemo,
  },
];

export const holographicHud: LibraryTheme = {
  slug: "holographic-hud",
  name: "Holographic HUD",
  summary: "Translucent notched cards pop out of depth and unfold in a dark projection room: scramble-decoded type, ring gauges, data readouts, a holo-table in real perspective, CSS 3D tilt throughout and one inverted incident moment.",
  feel: ["futuristic", "technical", "glowing", "busy-but-controlled", "2.5D"],
  status: "draft",
  board: "data/references/themes/holographic-hud.md",
  Background: HoloField,
  entries,
};

export default holographicHud;

