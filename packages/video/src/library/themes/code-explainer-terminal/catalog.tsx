// Catalog of the code-explainer theme: one entry and one small demo per reusable item, built from its reference board.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { BLUE, GREEN, MONO, MUTED, ORANGE, PURPLE, RED, TEXT } from "./theme";
import { Caret, EditorBg, Glyph } from "./chrome";
import { CodeWindow, DiffView } from "./code";
import { InstallSteps, TerminalSession } from "./terminal";
import { BigStat, CommentQuote, KeywordPop, MemeFrame, PopLine, StackBadges, StatTicker, TitleCard, ToolTag, Versus } from "./pieces";
import { RequestFlow } from "./flow";
import { GlitchCut, PunchIn } from "./fx";

const ORIGIN = "theme build from data/references/themes/code-explainer-terminal.md";

const AGENT = `// agent.ts — the whole loop, honestly
import { llm, tools } from "./ai";

async function run(task: string) {
  const plan = await llm.plan(task);
  for (const step of plan.steps) {
    await tools.exec(step);
  }
  return plan.summary;
}`;

const BUGGY = `def total(items):
    sum = 0
    for item in items:
        sum += item.price
    return summ`;

const IdlePrompt: FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", alignItems: "center", gap: 16, fontFamily: MONO, fontWeight: 500, fontSize: 44, color: BLUE }}>
    ~/studio
    <Glyph kind="chevron" size={44} color={PURPLE} />
    <Caret size={44} block color={TEXT} />
  </div>
);

const GlitchDemo: FC = () => (
  <GlitchCut
    at={0.93}
    from={<CodeWindow x={310} y={250} w={1300} code={BUGGY} lang="py" title="cart.py" at={-1} cps={1000} squiggles={[{ line: 4, from: 11, to: 15, at: -1 }]} />}
    to={
      <>
        <KeywordPop text="it compiled." at={0.95} y={500} color={GREEN} size={190} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center", fontFamily: MONO, fontWeight: 500, fontSize: 44, color: MUTED }}>{"// first try. suspicious."}</div>
      </>
    }
  />
);

const entries: LibraryEntry[] = [
  {
    id: "editor-bg",
    kind: "background",
    title: "Editor-dark ground",
    useFor: "The surface every scene in this theme sits on: GitHub-dark #0D1117, a soft centre glow, 1 px scanlines with a slow shimmer band, a dim server log ticking at the right edge, a vignette.",
    api: "<EditorBg />",
    seconds: 2,
    origin: ORIGIN,
    Demo: IdlePrompt,
  },
  {
    id: "title-card",
    kind: "piece",
    title: "Command-line title card",
    useFor: "The hook or episode title: a shell command types itself, Enter, the title types out with a block caret, an orange bar wipes under it and tag chips rise.",
    api: '<TitleCard cmd title={["line 1", "line 2"]} at accent? chips={[{ k, v, color }]} out? />',
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <TitleCard
        cmd={'./explain "learn by building"'}
        title={["AI writes the code.", "So what do I learn?"]}
        accent="learn?"
        at={0.2}
        size={132}
        chips={[{ k: "EP", v: "01" }, { k: "stack", v: "TS + AI", color: BLUE }, { k: "runtime", v: "8 min", color: GREEN }]}
      />
    ),
  },
  {
    id: "keyword-pop",
    kind: "primitive",
    title: "Keyword pop and claim line",
    useFor: "A word the narrator hits hard: the line builds word by word on the word times, then the key word slams in on a tilted slab (0.6 → 1, back-out 1.7, 8 f) with a short shake. Hard-cut it at `out`.",
    api: '<PopLine y words={[{ w, at, color?, big? }]} /> · <KeywordPop text at out? color variant="slab"|"glow" />',
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <PopLine y={240} size={116} words={[{ w: "every", at: 0.25 }, { w: "framework", at: 0.45 }, { w: "is", at: 0.7 }, { w: "just", at: 0.85 }]} />
        <KeywordPop text="JavaScript" at={1.2} y={640} size={220} />
      </>
    ),
  },
  {
    id: "code-window",
    kind: "piece",
    title: "Typewriter code window",
    useFor: "Showing real code as it's explained: GitHub-dark syntax, typed at 40–60 chars/s, each line sliding up 8 px as it starts, a caret that blinks on holds.",
    api: '<CodeWindow x y w code lang="ts"|"py"|"sh"|"json" title at cps? size? focus? squiggles? exit? />',
    seconds: 5.6,
    origin: ORIGIN,
    Demo: () => <CodeWindow x={310} y={190} w={1300} code={AGENT} title="agent.ts" at={0.4} cps={55} />,
  },
  {
    id: "line-focus",
    kind: "piece",
    title: "Line focus with zoom",
    useFor: "\"This is the line that matters\": a bar wipes across the range in 6 f, every other line dims to 35 %, the active lines glow and the view zooms to 1.3x. Pair with a big word on the right (code left 60 %).",
    api: "<CodeWindow … focus={{ from, to, at, zoom?: 1.3, until? }} />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <>
        <CodeWindow x={96} y={200} w={1130} code={AGENT} title="agent.ts" at={-1} cps={1000} focus={{ from: 5, to: 7, at: 0.7, zoom: 1.3 }} />
        <KeywordPop text={"that's\nthe agent"} at={1.4} x={1555} y={540} size={96} variant="glow" rotate={0} />
      </>
    ),
  },
  {
    id: "error-squiggle",
    kind: "piece",
    title: "Bug squiggle and error hover",
    useFor: "Pointing at a bug or a gotcha: a red wavy underline draws under the exact characters in 8 f, then an editor-style hover shows the error.",
    api: "<CodeWindow … squiggles={[{ line, from, to, at, msg? }]} /> or <ErrorSquiggle x y width at />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <CodeWindow x={310} y={210} w={1300} code={BUGGY} lang="py" title="cart.py" at={-1} cps={1000} squiggles={[{ line: 4, from: 11, to: 15, at: 0.8, msg: "NameError: name 'summ' is not defined" }]} />
        <KeywordPop text="bug." at={1.6} x={1560} y={210} size={110} color={RED} rotate={6} />
      </>
    ),
  },
  {
    id: "terminal-session",
    kind: "piece",
    title: "Terminal session",
    useFor: "\"Type a command, the result appears\": commands type at 2 chars a frame, Enter, output prints line by line (coloured by prefix: ok / error / warn / ->), the prompt arrow turns green on success.",
    api: "<TerminalSession x y w h script={[{ cmd, at, out: string[] }]} cwd? cps? />",
    seconds: 4.6,
    origin: ORIGIN,
    Demo: () => (
      <TerminalSession
        x={260}
        y={170}
        w={1400}
        h={740}
        cwd="~/code"
        script={[
          { cmd: "npm create vite@latest my-app", at: 0.4, out: ["-> scaffolding project in ./my-app", "ok done. now run:"] },
          { cmd: "cd my-app && npm i", at: 1.7, out: ["added 214 packages in 3s"] },
          { cmd: "npm run dev", at: 2.8, out: ["  VITE v6.0.1  ready in 182 ms", "-> Local: http://localhost:5173/"] },
        ]}
      />
    ),
  },
  {
    id: "install-steps",
    kind: "piece",
    title: "CLI checklist steps",
    useFor: "A list or a process said step by step: each step types in with a spinner, flips to a green check on its word, and a block progress bar fills underneath.",
    api: "<InstallSteps x y w title steps={[{ text, at, done?, note? }]} />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <InstallSteps
        x={310}
        y={250}
        w={1300}
        title="learn.sh"
        steps={[
          { text: "pick a thing you want to exist", at: 0.3, done: 0.95, note: "day 1" },
          { text: "build it badly, with AI", at: 1.05, done: 1.7, note: "week 1" },
          { text: "read every line it wrote", at: 1.8, done: 2.45, note: "week 2" },
          { text: "break it on purpose", at: 2.6 },
        ]}
      />
    ),
  },
  {
    id: "big-stat",
    kind: "piece",
    title: "Big stat count-up",
    useFor: "A number the narrator lands: it counts up with ease-out under a `// comment` label, a mini bar chart rises and a delta chip pops. Hold 45–75 frames.",
    api: "<BigStat to from? at dur? prefix? suffix? decimals? label delta={{ text, good? }} bars? />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => <BigStat to={48213} at={0.4} label="GitHub stars in 30 days" delta={{ text: "+312%" }} y={250} />,
  },
  {
    id: "diff-view",
    kind: "piece",
    title: "Diff: red out, green in",
    useFor: "A refactor, a fix or before/after code: removed lines flash red and collapse, added lines open in green on a 2-frame stagger, the tab counts +/-.",
    api: '<DiffView x y w title lines={[{ s, k: " "|"-"|"+" }]} at enter? lang? />',
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => (
      <DiffView
        x={260}
        y={260}
        w={1400}
        title="user.ts"
        at={1.0}
        enter={0.2}
        lines={[
          { s: "async function getUser(id: string) {" },
          { s: "  const res = await fetch(`/api/u/${id}`);", k: "-" },
          { s: "  const data = await res.json();", k: "-" },
          { s: "  return data;", k: "-" },
          { s: "  return api.users.get(id);", k: "+" },
          { s: "}" },
        ]}
      />
    ),
  },
  {
    id: "versus",
    kind: "piece",
    title: "A vs B config panes",
    useFor: "Framework or tool comparisons: two editor panes rise, a VS badge slams between them, rows type in side by side with green/red marks, the verdict glows the winner and dims the loser.",
    api: "<Versus a={{ name, logo, color }} b={…} rows={[{ k, a, b, win? }]} at rowGap? verdict={{ at, side }} />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <Versus
        a={{ name: "REST", logo: "R", color: BLUE }}
        b={{ name: "GraphQL", logo: "GQ", color: PURPLE }}
        at={0.2}
        rows={[
          { k: "endpoints", a: "many", b: "one", win: "b" },
          { k: "caching", a: "built in", b: "manual", win: "a" },
          { k: "to learn", a: "an evening", b: "a weekend", win: "a" },
        ]}
        verdict={{ at: 3.0, side: "a" }}
      />
    ),
  },
  {
    id: "comment-quote",
    kind: "piece",
    title: "Doc-comment quote",
    useFor: "A quote or a callout: framed as a /** doc comment */, the words arrive at the narration's pace (or on word times), the key phrase turns orange, @author and @see tags cite the source.",
    api: "<CommentQuote quote author source? at wps? wordTimes? highlight? size? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => <CommentQuote quote="Talk is cheap. Show me the code." author="Linus Torvalds" source="Linux kernel mailing list, 2000" highlight="Show me the code" at={0.3} wps={5} size={104} />,
  },
  {
    id: "request-flow",
    kind: "piece",
    title: "Request flow diagram",
    useFor: "How a system works: service cards rise, dashed lanes draw between them, request and reply packets travel (requests above the line, replies below) and each card pulses in the packet's colour when it arrives.",
    api: "<RequestFlow nodes={[{ id, label, sub, logo, color, x, y, at }]} hops={[{ from, to, at, label, color, dur? }]} />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <PopLine y={190} size={84} words={[{ w: "one", at: 0.1 }, { w: "request,", at: 0.25 }, { w: "four", at: 0.4, color: ORANGE }, { w: "hops", at: 0.55, color: ORANGE }]} />
        <RequestFlow
          nodes={[
            { id: "web", label: "browser", sub: "localhost:5173", logo: "W", color: BLUE, x: 290, y: 600, at: 0.2 },
            { id: "api", label: "edge fn", sub: "/api/users", logo: "fn", color: ORANGE, x: 960, y: 600, at: 0.35 },
            { id: "db", label: "postgres", sub: "users table", logo: "PG", color: PURPLE, x: 1630, y: 600, at: 0.5 },
          ]}
          hops={[
            { from: "web", to: "api", at: 0.9, label: "GET /users", color: BLUE },
            { from: "api", to: "db", at: 1.6, label: "SELECT *", color: PURPLE },
            { from: "db", to: "api", at: 2.3, label: "42 rows", color: GREEN },
            { from: "api", to: "web", at: 3.0, label: "200 OK", color: GREEN },
          ]}
        />
      </>
    ),
  },
  {
    id: "tool-tag",
    kind: "piece",
    title: "Tool lower third, stack chips, stat ticker",
    useFor: "Naming the tool on screen: a lower third with monogram, name and version · site; a row of stack chips (one can lift into focus); a corner ticker counting a live stat.",
    api: "<ToolTag name sub logo color at out? /> · <StackBadges items at focus? /> · <StatTicker label to at />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <>
        <StackBadges
          y={400}
          at={0.2}
          items={[
            { name: "TypeScript", logo: "TS", color: BLUE },
            { name: "Bun", logo: "B", color: "#F9E7C8" },
            { name: "Hono", logo: "H", color: ORANGE },
            { name: "Postgres", logo: "PG", color: PURPLE },
          ]}
          focus={{ i: 1, at: 1.3 }}
        />
        <StatTicker label="GitHub stars" to={74210} from={70100} at={0.8} />
        <ToolTag name="Bun" sub="v1.2 · bun.sh" logo="B" color="#F9E7C8" at={1.5} />
      </>
    ),
  },
  {
    id: "glitch-cut",
    kind: "transition",
    title: "Glitch cut",
    useFor: "A hard cut dressed for a joke or a dramatic turn: 6 frames of RGB split and jumping horizontal slices centred on the cut, re-rolled every 2 frames. Use sparingly; plain hard cuts are the default.",
    api: "<GlitchCut at from={<SceneA />} to={<SceneB />} frames? seed? strength? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: GlitchDemo,
  },
  {
    id: "punch-in",
    kind: "camera",
    title: "Punch-in on a word, with a meme slot",
    useFor: "The format's layout habit (code left 60 %, meme or screenshot right) plus the camera punch: 8–12 % in over 6 f toward a point on an emphasised word, hold 12 f, out 6 f.",
    api: "<PunchIn hits={[{ at, scale?, x?, y? }]}>…</PunchIn> · <MemeFrame x y w h at src? caption? />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => (
      <PunchIn hits={[{ at: 2.3, scale: 1.08, x: 1100, y: 520 }]}>
        <CodeWindow
          x={96}
          y={230}
          w={1040}
          code={"# deploy.sh\nnpm run build\nscp -r dist/ prod:/var/www\n# it works on my machine"}
          lang="sh"
          title="deploy.sh"
          at={0.1}
          cps={60}
        />
        <MemeFrame x={1230} y={250} w={594} h={540} at={1.6} caption="ship it" />
      </PunchIn>
    ),
  },
];

export const codeExplainerTerminal: LibraryTheme = {
  slug: "code-explainer-terminal",
  name: "Code explainer (terminal)",
  summary: "Fast tech commentary on GitHub-dark: editor windows with typewriter code, terminal sessions, big Inter keyword slams, red squiggles, diffs, glitch cuts and punch-ins on the spoken word.",
  feel: ["fast", "witty", "dense", "nerdy", "energetic"],
  status: "draft",
  board: "data/references/themes/code-explainer-terminal.md",
  Background: EditorBg,
  entries,
};

export default codeExplainerTerminal;

