// Catalog of the UI walkthrough theme: Screen Studio-style polish for the creator's own screen recordings, demoed on the drawn stand-in app "Orbit".
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { ramp, useTime } from "../../core/time";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { WallpaperBackdrop, Dusk } from "./backdrop";
import { CommandPalette, NewProjectDialog, ORBIT, OrbitApp, OrbitMobile, Toast, center } from "./app";
import { FloatingWindow, appPt, appRect } from "./window";
import { CaptionPill, KeyChips, Spotlight, TypingOverlay, caretOn, typeOut } from "./overlays";
import { BeforeAfterSlider, PromptToChart, SelectClaim, Walkthrough } from "./signature";
import { ChapterCard, LowerThird, SourceChip, StatWidget, TitleCard } from "./pieces";
import { ScreenPush } from "./transitions";

const ORIGIN = "library build (ui-walkthrough-demo board), demoed on the drawn stand-in app";
const c = center;

const AutoZoomDemo: FC = () => {
  const name = "Weekend side project";
  const nb = c(ORBIT.newBtn);
  const cr = c(ORBIT.create);
  return (
    <Walkthrough
      zoom={1.75}
      keys={[
        { t: 0, x: 1150, y: 640 },
        { t: 0.9, x: nb.x + 30, y: nb.y + 8 },
        { t: 1.5, x: nb.x + 30, y: nb.y + 8, click: true },
        { t: 2.4, x: 640, y: 330, click: true },
        { t: 4.7, x: cr.x + 10, y: cr.y + 6, click: true },
        { t: 5.6, x: 1180, y: 330, dur: 0.7 },
      ]}
      targets={[{ rect: ORBIT.newBtn, at: 1.5 }, { rect: ORBIT.create, at: 4.7, hold: 0.1 }]}
      screen={({ t }) => {
        const ty = typeOut(t, name, 2.65, 14);
        return (
          <OrbitApp press={Math.min(ramp(t, 1.42, 0.08), 1 - ramp(t, 1.55, 0.15))} added={{ name, meta: "Next.js · just now", p: ramp(t, 4.95, 0.45) }}>
            <NewProjectDialog p={Math.min(ramp(t, 1.58, 0.22), 1 - ramp(t, 4.82, 0.2))} name={ty.text} caret={t > 2.4 && caretOn(t, ty.typing)} focus={ramp(t, 2.4, 0.2)} createPress={Math.min(ramp(t, 4.62, 0.08), 1 - ramp(t, 4.75, 0.15))} />
            <Toast p={ramp(t, 4.95, 0.3)} text="Project created" />
          </OrbitApp>
        );
      }}
      overlay={() => <CaptionPill at={0.3} step={[1, 3]} text="Click [New project], name it, hit [Create]" />}
    />
  );
};

const CursorDemo: FC = () => {
  const nb = c(ORBIT.newBtn);
  const row = c(ORBIT.row(1));
  return (
    <Walkthrough
      auto="off"
      keys={[
        { t: 0.1, x: 1100, y: 700 },
        { t: 0.9, x: row.x - 180, y: row.y + 4 },
        { t: 1.8, x: nb.x + 20, y: nb.y + 6, click: true },
      ]}
      targets={[{ rect: ORBIT.newBtn, at: 1.8 }]}
      screen={({ t }) => <OrbitApp hoverRow={[1, Math.min(ramp(t, 0.75, 0.15), 1 - ramp(t, 1.15, 0.2))]} press={Math.min(ramp(t, 1.72, 0.08), 1 - ramp(t, 1.85, 0.15))} />}
      overlay={() => <CaptionPill at={0.2} text="Glides on a [spring], ripples on the click" />}
    />
  );
};

const TypingDemo: FC = () => {
  const text = "Weekend side project";
  const f = c(ORBIT.nameField);
  return (
    <Walkthrough
      auto="off"
      keys={[{ t: 0, x: f.x - 160, y: f.y + 6 }]}
      screen={({ t }) => {
        const ty = typeOut(t, text, 0.5, 13);
        return (
          <OrbitApp>
            <NewProjectDialog name={ty.text} caret={caretOn(t, ty.typing)} focus={1} />
          </OrbitApp>
        );
      }}
      stage={() => <TypingOverlay text={text} at={0.5} cps={13} x={960} y={150} w={900} from={appPt(ORBIT.nameField.x + 30, ORBIT.nameField.y)} />}
      overlay={({ t }) => <KeyChips keys={["↵"]} label="Enter" at={typeOut(t, text, 0.5, 13).end + 0.2} y={830} />}
    />
  );
};

const KeysDemo: FC = () => (
  <Walkthrough
    auto="off"
    cursorAt={99}
    keys={[{ t: 0, x: 1000, y: 600 }]}
    screen={({ t }) => {
      const q = typeOut(t, "dep", 1.15, 9);
      return (
        <OrbitApp>
          <CommandPalette p={ramp(t, 0.72, 0.22)} query={q.text} caret={caretOn(t, q.typing)} selected={0} />
        </OrbitApp>
      );
    }}
    overlay={() => (
      <>
        <KeyChips keys={["⌘", "K"]} at={0.5} label="Command menu" />
        <KeyChips keys={["⌘", "↵"]} at={2.05} label="Deploy" />
      </>
    )}
  />
);

const SpotlightDemo: FC = () => {
  const a = ORBIT.card(0);
  const b = ORBIT.card(2);
  return (
    <AbsoluteFill>
      <FloatingWindow>
        <OrbitApp />
      </FloatingWindow>
      <Spotlight rect={appRect({ x: a.x, y: a.y, w: b.x + b.w - a.x, h: a.h })} at={0.4} label="Live numbers, no refresh" side="bottom" />
    </AbsoluteFill>
  );
};

const ChapterDemo: FC = () => {
  const { t } = useTime();
  const e = ramp(t, 0, 0.5);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - 0.75 * e, filter: `blur(${e * 14}px)`, transform: `scale(${1 - 0.04 * e})` }}>
        <FloatingWindow>
          <OrbitApp page="settings" />
        </FloatingWindow>
      </AbsoluteFill>
      <ChapterCard n={2} total={4} at={0.3} title="Connect your repo" sub="Orbit watches main and ships every push." steps={["Install the CLI", "Connect your repo", "Add a domain", "Ship it"]} />
    </AbsoluteFill>
  );
};

const WallpaperDemo: FC = () => (
  <AbsoluteFill style={{ clipPath: "inset(0 0 0 50%)" }}>
    <WallpaperBackdrop wallpaper="dawn" />
  </AbsoluteFill>
);

const entries: LibraryEntry[] = [
  {
    id: "wallpaper",
    kind: "background",
    title: "Blurred wallpaper (dusk / dawn)",
    useFor: "Behind every window: a macOS-style gradient with light ribbons and slow drift; give it the camera so it counter-drifts 2 % as the view zooms or pans. Dusk by default, dawn for a light video.",
    api: '<WallpaperBackdrop wallpaper="dusk"|"dawn" cam={walk.cam} dim? />',
    seconds: 1,
    origin: ORIGIN,
    Demo: WallpaperDemo,
  },
  {
    id: "floating-window",
    kind: "primitive",
    title: "Floating window",
    useFor: "The frame for the creator's screen recording or screenshot (src), or a drawn UI: rises 24 px from 0.92 on a spring, deep soft shadow, glass sheen. mac or browser chrome, light or dark.",
    api: '<FloatingWindow src={staticFile("rec.mp4")}? chrome="mac"|"browser" url look at out win>{designSpaceChildren}</FloatingWindow>',
    seconds: 1.6,
    origin: ORIGIN,
    Demo: () => (
      <FloatingWindow at={0.2} chrome="browser" url="orbit.app/projects">
        <OrbitApp />
      </FloatingWindow>
    ),
  },
  {
    id: "spring-cursor",
    kind: "primitive",
    title: "Spring cursor + click ripple",
    useFor: "Any pointer movement: keys say where to be when; the path bows, a 170/20 spring smooths it (700/30 near clicks), the arrow squeezes on click, a ripple rings out and the target glows.",
    api: "<Walkthrough keys={[{ t, x, y, click? }]} targets={[{ rect, at }]} /> or <Cursor p clicks /> + <ClickRipple clicks /> + <TargetGlow rect at />",
    seconds: 2.2,
    origin: ORIGIN,
    Demo: CursorDemo,
  },
  {
    id: "auto-zoom",
    kind: "camera",
    title: "Auto-zoom walkthrough",
    useFor: "The core of a demo: the camera zooms 1.5–2x when the cursor rests or clicks, pans only when it leaves the inner 70 %, leads by 0.5 s and zooms out softer than it zoomed in. Works on a recording via src + space.",
    api: "<Walkthrough keys zoom={1.75} safeZone={0.7} auto=\"rests\"|\"clicks\"|zooms={[{ from, to, s }]} src? space={{ w, h }} screen={(w) => …} overlay={(w) => …} />",
    seconds: 6.8,
    origin: ORIGIN,
    Demo: AutoZoomDemo,
  },
  {
    id: "typed-input",
    kind: "piece",
    title: "Typed-input highlight",
    useFor: "When typing in the recording is too small to read: the field is lifted out and magnified with a tether to the real one; text types at human timing with a caret, Enter lands as a keycap.",
    api: "<TypingOverlay text at cps x y w from={appPt(...)} /> · typeOut(t, text, at, cps) · caretOn(t, typing)",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: TypingDemo,
  },
  {
    id: "key-chips",
    kind: "piece",
    title: "Shortcut keycaps",
    useFor: "Every keyboard shortcut the creator presses: physical keycaps pop in (back-out 1.5, 10 f), sink on the press, hold 24 f, with an optional plain-English label.",
    api: '<KeyChips keys={["⌘", "K"]} at label? x y />',
    seconds: 2.7,
    origin: ORIGIN,
    Demo: KeysDemo,
  },
  {
    id: "callout-spotlight",
    kind: "piece",
    title: "Callout spotlight",
    useFor: "Pointing at one region of the UI while the narration explains it: the rest dims, the hole irises onto the region, an accent outline glows and a label tag hangs off it.",
    api: '<Spotlight rect={appRect(ORBIT.card(0))} at label side="bottom"|"top"|"left"|"right" out? />',
    seconds: 2,
    origin: ORIGIN,
    Demo: SpotlightDemo,
  },
  {
    id: "step-chapter",
    kind: "piece",
    title: "Step chapter card",
    useFor: "Between tutorial steps, or any list of steps: the recording recedes and blurs, 'STEP 02 / 04' and the title rise, the checklist shows done, now and next.",
    api: "<ChapterCard n total title sub? steps={[...]} at out? />  · in-recording version: <CaptionPill step={[n, total]} />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: ChapterDemo,
  },
  {
    id: "hook-title",
    kind: "piece",
    title: "App-launch title card",
    useFor: "The hook of an 'I built this' video: the app icon drops in, the title rises line by line, and the app arrives on a phone (drawn, or the creator's own screen via phoneSrc).",
    api: '<TitleCard kicker title={["line", "with [accent]"]} sub? tag? at phone={<OrbitMobile />} | phoneSrc />',
    seconds: 2.2,
    origin: ORIGIN,
    Demo: () => (
      <TitleCard at={0.1} kicker="SIDE PROJECT · 3 WEEKENDS" title={["I built a deploy", "button for [my apps]."]} sub="Push to main, get a live link. Here's the whole build." tag="Watch the build" phone={<OrbitMobile />} />
    ),
  },
  {
    id: "select-claim",
    kind: "piece",
    title: "Drag-to-select claim",
    useFor: "The key words of a spoken claim: words rise on their word times, then an I-beam drags across the key phrase like selecting text, and a format bar pops above it.",
    api: "<SelectClaim words={[{ w, t }]} select={[from, to]} at dur? toolbar? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <SelectClaim
        words={[{ w: "Setup", t: 0.2 }, { w: "took", t: 0.4 }, { w: "three", t: 0.6 }, { w: "clicks,", t: 0.8 }, { w: "not", t: 1.05 }, { w: "three", t: 1.2 }, { w: "days.", t: 1.35 }]}
        select={[2, 3]}
        at={1.7}
      />
    ),
  },
  {
    id: "big-stat",
    kind: "piece",
    title: "Widget stat",
    useFor: "One big number: a desktop-widget card springs up, the value counts in out-expo with tabular digits and punches on landing, the sparkline draws and the pointer reads today's value.",
    api: "<StatWidget value at label prefix? suffix? decimals? delta? foot? spark={[...]} />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => <StatWidget value={128} at={0.1} label="Deploys this week" delta="↑ 24%" foot="orbit.app · last 7 days" />,
  },
  {
    id: "before-after",
    kind: "piece",
    title: "Before / after wipe",
    useFor: "Comparing two screens (old vs new UI, light vs dark, broken vs fixed): a hand cursor drags the divider across one window, then settles it in the middle.",
    api: '<BeforeAfterSlider a={node | src} b={node | src} at dur? rest? labels={["Before", "After"]} />',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <BeforeAfterSlider a={<OrbitApp />} b={<OrbitApp look="dark" />} at={0.6} labels={["Light", "Dark"]} />,
  },
  {
    id: "prompt-to-chart",
    kind: "piece",
    title: "Prompt to chart",
    useFor: "AI product demos and any data answer: a prompt bubble, a 12 f thinking shimmer, then axes, dots in x order and an honest least-squares trend line, with the agent's steps ticking beside it.",
    api: "<PromptToChart prompt reply at steps? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <PromptToChart at={0.3} prompt="Plot weekly signups since launch" reply="Signups by week, with a trend line." />,
  },
  {
    id: "lower-third",
    kind: "piece",
    title: "Lower third + source chip",
    useFor: "Naming the app or the creator over a recording (glass card, accent spine, text trails the plate), and a quiet source chip for where a screen or fact comes from.",
    api: "<LowerThird name role at out? avatar? /> · <SourceChip text label? at out? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <AbsoluteFill>
        <FloatingWindow>
          <OrbitApp />
        </FloatingWindow>
        <LowerThird at={0.2} name="Orbit 2.1" role="the app in this video · free and open source" />
        <SourceChip at={0.6} text="docs.orbit.app/deploy" />
      </AbsoluteFill>
    ),
  },
  {
    id: "screen-push",
    kind: "transition",
    title: "Window push",
    useFor: "Moving to the next screen or app: the window slides off as the next pushes in, overlapping all the way, with a touch of motion blur and the wallpaper counter-drifting. Crossfade and JumpCut cover cuts inside one recording.",
    api: "<ScreenPush a={<FloatingWindow …/>} b={<FloatingWindow …/>} at dur? dir? /> · <Crossfade a b at /> · <JumpCut cuts={[s…]}>",
    seconds: 1.5,
    origin: ORIGIN,
    Demo: () => (
      <ScreenPush
        at={0.45}
        a={
          <FloatingWindow>
            <OrbitApp />
          </FloatingWindow>
        }
        b={
          <FloatingWindow chrome="browser" url="orbit.app/settings">
            <OrbitApp page="settings" />
          </FloatingWindow>
        }
      />
    ),
  },
];

const theme: LibraryTheme = {
  slug: "ui-walkthrough-demo",
  name: "UI walkthrough demo",
  summary: "Screen Studio polish for the creator's own screen recordings: a floating window on a blurred dusk wallpaper, a spring cursor with click ripples, auto-zoom on rests and clicks, keycaps, spotlights and step chapters. Every frame takes a src, or shows the drawn stand-in app Orbit.",
  feel: ["polished", "modern", "guided", "app-store", "tutorial"],
  status: "draft",
  board: "data/references/themes/ui-walkthrough-demo.md",
  Background: Dusk,
  entries,
};

export default theme;
