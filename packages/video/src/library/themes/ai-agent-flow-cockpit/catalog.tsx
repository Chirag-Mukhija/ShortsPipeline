// Catalog of the AI agent flow cockpit theme: one entry and one demo per reusable piece, built from its reference board.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { ramp, useTime } from "../../core/time";
import { AgentCard, AnswerCard, ExcerptCard, FlyingCite, MetricCard, ThinkingTrace, ToolCard, type Attempt } from "./cards";
import { Icon, type IconName } from "./icons";
import { CameraPlaceholder, Eyebrow, HeadlineCycler, PanelZoom, RiseLines, SourceTag, WiredLine, WirePan } from "./page";
import { C, UI } from "./theme";
import { AgentNode, Card, CockpitPanel, Page, PortDot, SourceChip, StatusPill, StepNode, Tag, portB, portL, portR, portT, type Box } from "./ui";
import { Packet, Wire, WireLayer, hvh, pulseEnd, route, vhv, type Pt } from "./wires";

const ORIGIN = "theme board: data/references/themes/ai-agent-flow-cockpit.md (primefold.ai cockpit)";
const FULL: Box = { x: 96, y: 96, w: 1728, h: 888 };

const SOURCES: { label: string; icon: IconName }[] = [
  { label: "Surveys", icon: "survey" },
  { label: "Reviews", icon: "star" },
  { label: "Email", icon: "mail" },
  { label: "Tickets", icon: "ticket" },
  { label: "Contracts", icon: "doc" },
];

// ---------- background ----------
const IdleCockpit: FC = () => {
  const ghost: Box[] = [
    { x: 120, y: 200, w: 300, h: 90 },
    { x: 120, y: 400, w: 300, h: 90 },
    { x: 120, y: 600, w: 300, h: 90 },
    { x: 720, y: 330, w: 340, h: 220 },
    { x: 1320, y: 360, w: 300, h: 160 },
  ];
  return (
    <CockpitPanel box={FULL}>
      <WireLayer>
        {[0, 1, 2].map((i) => (
          <Wire key={i} r={hvh(portR(ghost[i]!), portL(ghost[3]!, -50 + i * 50), 570)} flow={0.7} />
        ))}
        <Wire r={hvh(portR(ghost[3]!), portL(ghost[4]!), 1190)} flow={0.7} />
      </WireLayer>
      {ghost.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: i < 3 ? 999 : 26, background: "rgba(29,34,38,0.55)", border: `2px solid ${i < 3 ? C.chipLine : C.border}`, boxSizing: "border-box" }} />
      ))}
      <Tag text="sources" x={120} y={150} anchor="left" />
      <Tag text="agent" x={720} y={290} anchor="left" />
      <Tag text="answer" x={1320} y={320} anchor="left" />
    </CockpitPanel>
  );
};

// ---------- title card ----------
const TitleDemo: FC = () => {
  const { t } = useTime();
  const rise = ramp(t, 0.7, 0.9);
  const chips: Box[] = [0, 1, 2].map((i) => ({ x: 70, y: 70 + i * 104, w: 330, h: 76 }));
  const agent: Box = { x: 620, y: 60, w: 640, h: 360 };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 110 }}>
        <Eyebrow text="Part 02 · How agents work" at={0.1} />
        <RiseLines lines={["How a question", "becomes a next move."]} at={0.25} style={{ marginTop: 26 }} />
      </div>
      <CockpitPanel box={{ x: 96, y: 640 + (1 - rise) * 240, w: 1728, h: 560 }} at={0.7}>
        <WireLayer>
          {chips.map((c, i) => (
            <Wire key={i} r={hvh(portR(c), portL(agent, -40 + i * 40), 510)} drawAt={1.0 + i * 0.08} pulses={[{ at: 1.5 + i * 0.25 }]} lit={ramp(t, 2.2 + i * 0.25, 0.3)} />
          ))}
        </WireLayer>
        {chips.map((c, i) => (
          <SourceChip key={i} box={c} label={SOURCES[i]!.label} icon={SOURCES[i]!.icon} at={0.9 + i * 0.13} activeAt={1.5 + i * 0.25} />
        ))}
        <Card box={agent} edge={C.green} edgeK={ramp(t, 1.6, 0.4) * 0.6} style={{ padding: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontFamily: UI, fontWeight: 600, fontSize: 32, color: C.text, flex: 1 }}>Agent</span>
            <StatusPill state={t > 1.6 ? "working" : "idle"} />
          </div>
        </Card>
      </CockpitPanel>
    </AbsoluteFill>
  );
};

// ---------- sources wiring into an agent ----------
const SourcesDemo: FC = () => {
  const { t } = useTime();
  const chips: Box[] = SOURCES.map((_, i) => ({ x: 70, y: 166 + i * 120, w: 360, h: 80 }));
  const agent: Box = { x: 1150, y: 376, w: 480, h: 136 };
  const pulseAt = (i: number) => 0.9 + i * 0.3;
  const routes = chips.map((c, i) => hvh(portR(c), portL(agent, -44 + i * 22), 790));
  const reads = routes.map((r, i) => pulseEnd({ at: pulseAt(i) }, r));
  return (
    <CockpitPanel box={FULL}>
      <WireLayer>
        {routes.map((r, i) => (
          <Wire key={i} r={r} drawAt={0.5 + i * 0.05} pulses={[{ at: pulseAt(i) }]} lit={ramp(t, reads[i]!, 0.3) * 0.8} />
        ))}
      </WireLayer>
      <Tag text="context · 5 sources" x={70} y={110} anchor="left" />
      {chips.map((c, i) => (
        <SourceChip key={i} box={c} label={SOURCES[i]!.label} icon={SOURCES[i]!.icon} at={0.15 + i * (4 / 30)} activeAt={pulseAt(i)} doneAt={reads[i]} />
      ))}
      <AgentNode
        box={agent}
        title="Agent"
        at={0.35}
        states={[[0, "idle"], [reads[0]!, "active"], [reads[4]! + 0.3, "done"]]}
        subAt={[[0, "waiting for context"], ...reads.map((r, i): [number, string] => [r, `reading ${i + 1} of 5`]), [reads[4]! + 0.3, "read 5 sources"]]}
      />
    </CockpitPanel>
  );
};

// ---------- agent card ----------
const AgentDemo: FC = () => {
  const { t } = useTime();
  const chips: Box[] = [0, 1, 2, 3].map((i) => ({ x: 70, y: 250 + i * 104, w: 330, h: 76 }));
  const card: Box = { x: 640, y: 50, w: 800, h: 788 };
  const pulses = [2.4, 2.6, 2.8, 3.0];
  const routes = chips.map((c, i) => hvh(portR(c), portL(card, -60 + i * 40), 520));
  return (
    <CockpitPanel box={FULL}>
      <WireLayer>
        {routes.map((r, i) => (
          <Wire key={i} r={r} drawAt={0.3} pulses={[{ at: pulses[i]! }]} lit={ramp(t, pulseEnd({ at: pulses[i]! }, r), 0.3) * 0.8} />
        ))}
      </WireLayer>
      {chips.map((c, i) => (
        <SourceChip key={i} box={c} label={SOURCES[i]!.label} icon={SOURCES[i]!.icon} at={0.1 + i * (4 / 30)} activeAt={pulses[i]} />
      ))}
      <AgentCard
        box={card}
        at={0.1}
        question="Why are customers cancelling, and what do we fix first?"
        askAt={0.4}
        reads={routes.map((r, i) => pulseEnd({ at: pulses[i]! }, r))}
        steps={[
          { label: "Analysed {n} responses", at: 3.7, done: 4.5, icon: "scan", count: 212 },
          { label: "Checked the service terms", at: 4.5, done: 5.0, icon: "doc" },
          { label: "Onboarding is the top complaint.", at: 5.1, note: true },
          { label: "Creating 1 chart", at: 5.4, done: 5.9, icon: "chart" },
        ]}
        doneAt={6.1}
        composer
      />
    </CockpitPanel>
  );
};

// ---------- thinking trace ----------
const TraceDemo: FC = () => {
  const { t } = useTime();
  return (
    <CockpitPanel box={FULL}>
      <Card box={{ x: 364, y: 170, w: 1000, h: 548 }} style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: UI, fontWeight: 600, fontSize: 40, color: C.text, flex: 1 }}>The plan · 4 steps</span>
          <StatusPill state={t >= 3.4 ? "done" : t >= 0.5 ? "working" : "idle"} label={t >= 3.4 ? "4 / 4 done" : undefined} />
        </div>
        <ThinkingTrace
          size={44}
          gap={38}
          steps={[
            { label: "Read the codebase", at: 0.5, done: 1.1, icon: "book" },
            { label: "Write a plan", at: 1.1, done: 1.7, icon: "list" },
            { label: "Edit the files", at: 1.7, done: 2.5, icon: "pen" },
            { label: "Run the tests", at: 2.5, done: 3.3, icon: "code" },
          ]}
        />
      </Card>
    </CockpitPanel>
  );
};

// ---------- tool call (and retry) ----------
const ToolScene: FC<{ retry?: boolean }> = ({ retry }) => {
  const { t } = useTime();
  const agent: Box = { x: 70, y: 380, w: 440, h: 128 };
  const tool: Box = { x: 800, y: 124, w: 860, h: 640 };
  const out = hvh(portR(agent, -28), portL(tool, -170), 650);
  const back = hvh(portL(tool, 170), portR(agent, 28), 690);
  const a: Attempt[] = retry
    ? [{ start: 1.25, end: 1.95, error: "429 · rate limited" }, { start: 3.6, end: 4.3 }]
    : [{ start: 1.5, end: 2.45 }];
  const last = a[a.length - 1]!;
  return (
    <CockpitPanel box={FULL}>
      <WireLayer>
        <Wire r={out} drawAt={0.3} pulses={a.map((x) => ({ at: x.start - 0.65 }))} />
        <Wire r={back} drawAt={0.35} pulses={a.map((x) => ({ at: x.end, color: x.error ? C.red : C.green }))} />
      </WireLayer>
      <Tag text="call" x={725} y={out.pts[out.pts.length - 1]![1] - 34} at={0.5} />
      <Tag text="result" x={715} y={back.pts[0]![1] + 34} at={0.5} />
      {a.map((x, k) => (
        <Packet key={k} r={out} at={x.start - 0.65} dur={0.65} label={retry ? "url" : "query"} />
      ))}
      {retry && t > 1.95 && t < 3.6 && <Tag text="backing off 2s" x={290} y={570} at={2.0} color={C.amber} />}
      <AgentNode
        box={agent}
        title="Agent"
        at={0.1}
        ports={false}
        states={retry ? [[0, "idle"], [0.5, "active"], [2.0, "error"], [3.4, "active"], [last.end + 0.7, "done"]] : [[0, "idle"], [0.5, "active"], [last.end + 0.7, "done"]]}
        subAt={
          retry
            ? [[0, "idle"], [0.5, "fetching page"], [2.0, "call failed"], [3.4, "retrying"], [last.end + 0.7, "got the page"]]
            : [[0, "idle"], [0.5, "needs the policy"], [last.end + 0.7, "got 3 matches"]]
        }
      />
      <ToolCard
        box={tool}
        at={0.5}
        name={retry ? "fetch_page" : "search_docs"}
        icon={retry ? "globe" : "search"}
        input={retry ? '{\n  "url": "example.com/pricing"\n}' : '{\n  "query": "refund window",\n  "top_k": 3\n}'}
        output={retry ? ["→ 200 OK · 18 KB", "title: Pricing", "3 plans found"] : ["→ 3 matches", "refunds.md  §2   0.92", "faq.md      #7   0.81", "terms.pdf   p.4  0.77"]}
        attempts={a}
      />
    </CockpitPanel>
  );
};

// ---------- the full run: sources → agent → answer, with the camera pushing in ----------
const RunDemo: FC = () => {
  const { t } = useTime();
  const chips: Box[] = [0, 1, 2, 3].map((i) => ({ x: 50, y: 250 + i * 104, w: 330, h: 76 }));
  const agent: Box = { x: 470, y: 50, w: 640, h: 788 };
  const answer: Box = { x: 1180, y: 50, w: 500, h: 788 };
  const pulses = [1.9, 2.1, 2.3, 2.5];
  const routes = chips.map((c, i) => hvh(portR(c), portL(agent, -20 + i * 44), 425));
  const dim = ramp(t, 4.0, 0.5);
  const labels = ["surveys.csv", "reviews.json", "tickets.log", "contracts.pdf"];
  const cites = [0, 3, 2].map((src, k) => ({ src, n: k + 1, label: labels[src]!, at: 5.3 + k * 0.18 }));
  return (
    <PanelZoom keys={[{ t: 0, x: 960, y: 540, s: 1 }, { t: 4.0, x: 1150, y: 560, s: 1.1, d: 2.6 }]}>
      <CockpitPanel box={FULL}>
        <WireLayer>
          {routes.map((r, i) => (
            <Wire key={i} r={r} drawAt={0.35} pulses={[{ at: pulses[i]! }]} lit={ramp(t, pulseEnd({ at: pulses[i]! }, r), 0.3) * (1 - dim)} opacity={1 - 0.6 * dim} />
          ))}
          <Wire r={hvh(portR(agent, -200), portL(answer, -200))} drawAt={3.9} drawDur={0.3} pulses={[{ at: 4.0, dur: 0.3 }]} lit={0.8} />
        </WireLayer>
        {chips.map((c, i) => (
          <SourceChip key={i} box={c} label={SOURCES[i]!.label} icon={SOURCES[i]!.icon} at={0.15 + i * (4 / 30)} activeAt={pulses[i]} dim={dim} />
        ))}
        <AgentCard
          box={agent}
          at={0.05}
          question="Why are customers cancelling?"
          askAt={0.5}
          reads={routes.map((r, i) => pulseEnd({ at: pulses[i]! }, r))}
          steps={[
            { label: "Analysed {n} responses", at: 3.2, done: 3.7, icon: "scan", count: 212 },
            { label: "Checked contracts", at: 3.5, done: 3.9, icon: "doc" },
          ]}
          doneAt={4.0}
          composer
        />
        <AnswerCard
          box={answer}
          at={4.0}
          from={agent}
          title="Why customers cancel"
          bars={[{ label: "Slow onboarding", value: 41 }, { label: "Unanswered tickets", value: 22 }, { label: "Pricing", value: 14 }]}
          barsAt={4.5}
          cites={cites.map((c) => ({ n: c.n, label: c.label, at: c.at + 0.55, hot: c.n === 2 }))}
          action="Draft a fix plan"
          actionAt={6.0}
        />
        {cites.map((c, k) => (
          <FlyingCite key={k} n={c.n} label={c.label} at={c.at} dur={0.55} from={[chips[c.src]!.x + 180, chips[c.src]!.y + 38]} to={[answer.x + 30 + 150, 456 + 25 + k * 62]} lift={160} />
        ))}
      </CockpitPanel>
    </PanelZoom>
  );
};

// ---------- big number ----------
const MetricDemo: FC = () => {
  const { t } = useTime();
  const chips: Box[] = [0, 1, 2].map((i) => ({ x: 70, y: 300 + i * 120, w: 330, h: 80 }));
  const card: Box = { x: 640, y: 120, w: 1000, h: 648 };
  return (
    <CockpitPanel box={FULL}>
      <WireLayer>
        {chips.map((c, i) => (
          <Wire key={i} r={hvh(portR(c), portL(card, -60 + i * 60), 520)} drawAt={0.2} lit={ramp(t, 0.6, 0.4) * 0.7} pulses={[0.5, 0.95, 1.4, 1.85].map((p) => ({ at: p + i * 0.12 }))} />
        ))}
      </WireLayer>
      {chips.map((c, i) => (
        <SourceChip key={i} box={c} label={["Docs", "Code", "Chat"][i]!} icon={(["doc", "code", "mail"] as IconName[])[i]!} at={0.05 + i * (4 / 30)} activeAt={0.5 + i * 0.12} />
      ))}
      <MetricCard box={card} at={0.8} dur={1.8} value={48210} label="TOKENS READ INTO CONTEXT" of={200000} ofLabel="of 200,000 · context window" cols={25} rows={3} />
    </CockpitPanel>
  );
};

// ---------- comparison ----------
const CompareDemo: FC = () => {
  const { t } = useTime();
  const pickAt = 3.7;
  const lose = ramp(t, pickAt, 0.4);
  const L: Box = { x: 96, y: 260, w: 780, h: 720 };
  const Rb: Box = { x: 944, y: 260, w: 880, h: 720 };
  const col = (y: number): Box => ({ x: 240, y, w: 300, h: 84 });
  const l = [col(150), col(330), col(510)];
  const cell = (c: number, r: number): Box => ({ x: 40 + c * 280, y: 150 + r * 180, w: 240, h: 84 });
  const ask = cell(0, 0);
  const plan = cell(1, 0);
  const act = cell(2, 0);
  const check = cell(2, 1);
  const ans = cell(1, 2);
  const lp = [0.9, 1.4];
  const rp = { ap: 0.9, pa: 1.3, ac: 1.7, cp: 2.1, pa2: 2.5, ac2: 2.9, ca: 3.3 };
  const loopR = route([portL(check), [plan.x + plan.w / 2, check.y + check.h / 2], portB(plan)]);
  const lit = (from: number, to: number) => Math.min(ramp(t, from, 0.2), 1 - ramp(t, to, 0.3));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 96 }}>
        <RiseLines lines={["One pass vs. a loop"]} at={0.1} size={88} />
      </div>
      <CockpitPanel box={L} at={0.3} style={{ opacity: 1 - 0.45 * lose }}>
        <Tag text="CHATBOT · one pass" x={40} y={70} anchor="left" at={0.5} />
        <WireLayer>
          <Wire r={vhv(portB(l[0]!), portT(l[1]!))} drawAt={0.6} pulses={[{ at: lp[0]!, dur: 0.4 }]} />
          <Wire r={vhv(portB(l[1]!), portT(l[2]!))} drawAt={0.7} pulses={[{ at: lp[1]!, dur: 0.4 }]} />
        </WireLayer>
        <StepNode box={l[0]!} label="Ask" icon="user" at={0.5} lit={lit(0.8, 1.2)} />
        <StepNode box={l[1]!} label="Model" icon="agent" at={0.6} lit={lit(1.3, 1.7)} />
        <StepNode box={l[2]!} label="Answer" icon="arrow" at={0.7} lit={lit(1.8, 99) * 0.6} />
        <Tag text="answers once, never checks" x={390} y={680} at={2.0} />
      </CockpitPanel>
      <CockpitPanel box={Rb} at={0.4} style={{ boxShadow: lose > 0 ? `0 0 0 ${4 * lose}px ${C.green}` : undefined, borderRadius: 36 }}>
        <Tag text="AGENT · loops until done" x={40} y={70} anchor="left" at={0.6} />
        <WireLayer>
          <Wire r={hvh(portR(ask), portL(plan))} drawAt={0.7} pulses={[{ at: rp.ap, dur: 0.35 }]} />
          <Wire r={hvh(portR(plan), portL(act))} drawAt={0.75} pulses={[{ at: rp.pa, dur: 0.35 }, { at: rp.pa2, dur: 0.35 }]} />
          <Wire r={vhv(portB(act), portT(check))} drawAt={0.8} pulses={[{ at: rp.ac, dur: 0.35 }, { at: rp.ac2, dur: 0.35 }]} />
          <Wire r={loopR} drawAt={0.85} pulses={[{ at: rp.cp, dur: 0.4 }]} litColor={C.amber} lit={lit(rp.cp, rp.cp + 0.6) * 0.9} />
          <Wire r={route([portB(check), [check.x + check.w / 2, ans.y + ans.h / 2], portR(ans)])} drawAt={0.9} pulses={[{ at: rp.ca, dur: 0.4 }]} />
        </WireLayer>
        <StepNode box={ask} label="Ask" icon="user" at={0.6} lit={lit(0.8, 1.2)} />
        <StepNode box={plan} label="Plan" icon="list" at={0.65} lit={Math.max(lit(1.2, 1.6), lit(2.45, 2.8))} />
        <StepNode box={act} label="Act" icon="bolt" at={0.7} lit={Math.max(lit(1.6, 2.0), lit(2.8, 3.2))} />
        <StepNode box={check} label="Check" icon="check" at={0.75} lit={Math.max(lit(2.0, 2.4), lit(3.2, 3.6))} color={t < 2.6 ? C.amber : C.green} />
        <StepNode box={ans} label="Answer" icon="arrow" at={0.8} lit={lit(3.65, 99) * 0.8} />
        <Tag text="loop ×2" x={loopR.pts[0]![0] - 150} y={check.y + check.h / 2 - 34} at={2.1} color={C.amber} />
      </CockpitPanel>
    </AbsoluteFill>
  );
};

// ---------- quote / callout ----------
const ExcerptDemo: FC = () => {
  const chip: Box = { x: 70, y: 404, w: 330, h: 80 };
  const card: Box = { x: 560, y: 214, w: 1100, h: 460 };
  return (
    <CockpitPanel box={FULL}>
      <WireLayer>
        <Wire r={hvh(portR(chip), portL(card), 480)} drawAt={0.3} pulses={[{ at: 0.7 }]} lit={0.8} />
      </WireLayer>
      <SourceChip box={chip} label="Contracts" icon="doc" at={0.1} activeAt={0.7} />
      <ExcerptCard box={card} at={0.2} n={3} source="contracts.pdf" where="p.4" before="Refunds: a cancelled order is " hit="refunded within 14 days" after=" to the original payment method." hitAt={1.4} />
    </CockpitPanel>
  );
};

// ---------- lower third ----------
const TagDemo: FC = () => (
  <AbsoluteFill>
    <CameraPlaceholder />
    <SourceTag y={810} at={0.3} icon="doc" eyebrow="SOURCE [2]" title="Your source title" detail="site.com · 2026" />
  </AbsoluteFill>
);

// ---------- multi-agent hand-off ----------
const HandoffDemo: FC = () => {
  const { t } = useTime();
  const plan: Box = { x: 80, y: 110, w: 440, h: 130 };
  const res: Box = { x: 640, y: 379, w: 480, h: 130 };
  const wri: Box = { x: 1200, y: 648, w: 440, h: 130 };
  const w1 = route([portB(plan), [plan.x + plan.w / 2, res.y + res.h / 2], portL(res)]);
  const w2 = route([portB(res), [res.x + res.w / 2, wri.y + wri.h / 2], portL(wri)]);
  const srcs: Box[] = [0, 1, 2].map((i) => ({ x: 738 + i * 100, y: 160, w: 84, h: 84 }));
  return (
    <CockpitPanel box={FULL}>
      <WireLayer>
        <Wire r={w1} drawAt={0.3} pulses={[{ at: 1.4, dur: 0.8 }]} lit={ramp(t, 2.2, 0.3) * 0.7} />
        <Wire r={w2} drawAt={0.35} pulses={[{ at: 3.1, dur: 0.8 }]} lit={ramp(t, 3.9, 0.3) * 0.7} />
        {srcs.map((s, i) => (
          <Wire key={i} r={route([portB(s), [s.x + s.w / 2, res.y]])} drawAt={0.5} pulses={[{ at: 2.2 + i * 0.2, dur: 0.4 }]} lit={ramp(t, 2.6 + i * 0.2, 0.3) * 0.7} ports={false} />
        ))}
      </WireLayer>
      {srcs.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, borderRadius: 42, background: C.card, border: `2px solid ${C.chipLine}`, display: "flex", alignItems: "center", justifyContent: "center", color: t > 2.2 + i * 0.2 ? C.text : C.muted }}>
          <Icon name={(["globe", "doc", "db"] as IconName[])[i]!} size={40} />
        </div>
      ))}
      <Tag text="sources" x={1090} y={202} anchor="left" />
      <AgentNode box={plan} title="Planner" icon="list" at={0.1} states={[[0, "idle"], [0.4, "active"], [1.3, "done"]]} subAt={[[0, "splits the task"], [1.3, "plan.md ready"]]} />
      <AgentNode box={res} title="Researcher" icon="search" at={0.2} states={[[0, "idle"], [2.2, "active"], [3.0, "done"]]} subAt={[[0, "waiting"], [2.2, "reading 3 sources"], [3.0, "notes ready"]]} />
      <AgentNode box={wri} title="Writer" icon="pen" at={0.3} states={[[0, "idle"], [3.9, "active"], [4.7, "done"]]} subAt={[[0, "waiting"], [3.9, "drafting answer"], [4.7, "draft.md ready"]]} />
      <Packet r={w1} at={1.4} dur={0.8} label="plan.md" />
      <Packet r={w2} at={3.1} dur={0.8} label="notes ×6" />
      <Tag text="3 agents · 2 hand-offs" x={80} y={800} anchor="left" />
    </CockpitPanel>
  );
};

// ---------- transition ----------
const PanScene: FC<{ box: Box; title: string; sub: string; icon: IconName; side: "out" | "in"; at: number }> = ({ box, title, sub, icon, side, at }) => {
  const node: Box = { x: box.w / 2 - 230, y: box.h / 2 - 65, w: 460, h: 130 };
  const edge: Pt = side === "out" ? [box.w, box.h / 2] : [0, box.h / 2];
  return (
    <CockpitPanel box={box}>
      <WireLayer>
        <Wire r={side === "out" ? route([portR(node), edge]) : route([edge, portL(node)])} ports={false} />
      </WireLayer>
      <Tag text={side === "out" ? "step 1" : "step 2"} x={48} y={60} anchor="left" />
      <AgentNode box={node} title={title} sub={sub} icon={icon} states={[[0, side === "out" ? "done" : "idle"], [at, "active"]]} />
      <PortDot p={edge} on />
    </CockpitPanel>
  );
};
const PanDemo: FC = () => (
  <WirePan
    at={0.7}
    dur={1.1}
    fromX={96 + 1100}
    toX={724}
    a={<PanScene box={{ x: 96, y: 200, w: 1100, h: 680 }} title="Retrieve" sub="found 3 passages" icon="search" side="out" at={99} />}
    b={<PanScene box={{ x: 724, y: 200, w: 1100, h: 680 }} title="Act" sub="writing the reply" icon="bolt" side="in" at={1.7} />}
  />
);

const entries: LibraryEntry[] = [
  {
    id: "page-and-idle-cockpit",
    kind: "background",
    title: "Paper page and idle cockpit",
    useFor: "The base of every scene: paper-white page with a faint node-canvas dot grid, and the dark cockpit panel whose glow drifts while dots keep flowing on its wires.",
    api: "<Page /> (theme Background) · <CockpitPanel box={{x,y,w,h}} at glow={[a,b]}> · <Wire r={hvh(a,b)} flow />",
    seconds: 3,
    origin: ORIGIN,
    Demo: IdleCockpit,
  },
  {
    id: "headline-cycler",
    kind: "piece",
    title: "Hero headline cycler",
    useFor: "Cold open or hook: a big headline swaps phrase every ~75 f over a full-bleed cockpit, a tab bar tracks which one is up with a progress underline, ghost wiring fires on each swap.",
    api: "<HeadlineCycler phrases={[[line, line], …]} subs={[…]} tabs={[{label, icon}]} at every={2.5} />",
    seconds: 6.6,
    origin: ORIGIN,
    Demo: () => (
      <HeadlineCycler
        at={0}
        phrases={[["Ask your sources", "anything."], ["Watch the agent", "go to work."], ["Every answer", "shows its sources."]]}
        subs={["Context flows in from every file you connect.", "It plans, calls tools and checks the result.", "Each claim links back to where it came from."]}
        tabs={[{ label: "Context", icon: "book" }, { label: "Tools", icon: "bolt" }, { label: "Answers", icon: "chart" }]}
      />
    ),
  },
  {
    id: "cockpit-title",
    kind: "piece",
    title: "Chapter title over a rising cockpit",
    useFor: "Chapter or section card: eyebrow and a two-line headline rise on the page, then the cockpit slides up from the bottom edge and its first sources start firing.",
    api: "<Eyebrow text at /> <RiseLines lines at size /> + <CockpitPanel box at> peeking from the bottom",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: TitleDemo,
  },
  {
    id: "wired-word",
    kind: "piece",
    title: "Key word snaps into a node",
    useFor: "A claim on the narration's word times; the key word turns into a dark node chip with ports and a pulse runs through it, so the idea literally becomes part of the system.",
    api: "<WiredLine y size words={[{ w, t, key? }]} />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <>
        <WiredLine y={300} size={112} words={[{ w: "The", t: 0.3 }, { w: "model", t: 0.45 }, { w: "doesn't", t: 0.65 }, { w: "remember.", t: 0.9 }]} />
        <WiredLine y={540} size={112} words={[{ w: "It", t: 1.6 }, { w: "retrieves.", t: 1.85, key: true }]} />
      </>
    ),
  },
  {
    id: "sources-wire-in",
    kind: "piece",
    title: "Sources wire into the agent",
    useFor: "Context / RAG beats: source chips stagger in, a pulse runs from each one to the agent as it's read, the chip rings amber and its tick turns green, the agent counts what it has read.",
    api: "<SourceChip box label icon at activeAt /> <Wire r={hvh(portR(chip), portL(agent))} pulses={[{at}]} /> <AgentNode states subAt />",
    seconds: 4.4,
    origin: ORIGIN,
    Demo: SourcesDemo,
  },
  {
    id: "agent-card",
    kind: "piece",
    title: "Agent card at work",
    useFor: "The agent itself: the question types in at 28 ch/s with a caret, \"Working…\" shimmers, the source counter ticks as pulses land, steps tick and it settles to \"Worked for Ns\".",
    api: "<AgentCard box question askAt reads={[t…]} steps={[{label, at, done, icon, count?, note?}]} doneAt composer />",
    seconds: 6.6,
    origin: ORIGIN,
    Demo: AgentDemo,
  },
  {
    id: "thinking-trace",
    kind: "piece",
    title: "Thinking trace (steps)",
    useFor: "Any list or step sequence: rows arrive one by one with a spinner that becomes a green check; counters in a label tick up while the step runs.",
    api: "<ThinkingTrace size gap steps={[{ label: 'Analysed {n} rows', at, done, icon, count }]} />",
    seconds: 4,
    origin: ORIGIN,
    Demo: TraceDemo,
  },
  {
    id: "tool-call",
    kind: "piece",
    title: "Tool call with input and output",
    useFor: "Explaining tool use: the agent sends an arguments packet down the call wire, the tool card types its JSON input, runs with a ms counter, and the result rides back on the return wire.",
    api: "<ToolCard box name icon input output={[…]} attempts={[{start, end}]} /> + <Packet r at label /> on the call wire",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: () => <ToolScene />,
  },
  {
    id: "retry-backoff",
    kind: "piece",
    title: "Error, back-off and retry",
    useFor: "Failures and resilience: a call errors (coral pulse back, card shakes, 429 pill), a countdown ring backs off, the retry goes through and the output lands.",
    api: "<ToolCard attempts={[{start, end, error: '429 · rate limited'}, {start, end}]} /> + red return pulse {color: C.red}",
    seconds: 5.2,
    origin: ORIGIN,
    Demo: () => <ToolScene retry />,
  },
  {
    id: "answer-run",
    kind: "piece",
    title: "Full run: question to cited answer",
    useFor: "The signature beat: sources fire into the agent, the answer card grows out of it while sources dim to 40 %, bars fill, citation pills fly from their sources into the answer, and the camera pushes in.",
    api: "<PanelZoom keys> <AnswerCard box at from={agentBox} title bars cites action /> <FlyingCite from to at n label />",
    seconds: 7,
    origin: ORIGIN,
    Demo: RunDemo,
  },
  {
    id: "context-meter",
    kind: "piece",
    title: "Big number with a context meter",
    useFor: "A stat that lands: the number counts up expo-out while wires keep feeding it, punches on landing, and a cell meter fills toward its limit (context window, rows, budget).",
    api: "<MetricCard box at dur value label of ofLabel cols rows />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: MetricDemo,
  },
  {
    id: "one-pass-vs-loop",
    kind: "piece",
    title: "One pass vs. a loop",
    useFor: "A vs B: two cockpits side by side, a straight one-shot flow against an agent loop whose check sends work back round in amber; the loser dims and the winner gets a green rim.",
    api: "<CockpitPanel> ×2 with <StepNode box label icon lit /> and <Wire pulses /> (loop wire litColor={C.amber})",
    seconds: 4.6,
    origin: ORIGIN,
    Demo: CompareDemo,
  },
  {
    id: "cited-excerpt",
    kind: "piece",
    title: "Cited excerpt",
    useFor: "A quote or callout with provenance: a source feeds a card showing the passage, and the exact phrase the agent used gets an amber highlight and an underline.",
    api: "<ExcerptCard box at n source where before hit after hitAt />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: ExcerptDemo,
  },
  {
    id: "source-tag",
    kind: "piece",
    title: "Source lower third",
    useFor: "Source or name label over footage: a wire runs in from the frame edge, a pulse lands, and the tag opens from its port; retracts the same way.",
    api: "<SourceTag y at out icon eyebrow title detail />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: TagDemo,
  },
  {
    id: "agent-handoff",
    kind: "piece",
    title: "Multi-agent hand-off",
    useFor: "Multi-agent systems: planner, researcher and writer nodes light in turn, each finished node sends its output down a wire as a packet to the next, the researcher pulls from its own sources.",
    api: "<AgentNode box title icon states={[[t, 'active'|'done']]} subAt /> + <Packet r at label />",
    seconds: 5.2,
    origin: ORIGIN,
    Demo: HandoffDemo,
  },
  {
    id: "wire-pan",
    kind: "transition",
    title: "Wire pan transition",
    useFor: "Scene change inside the cockpit language: the outgoing scene's out-port wire runs across the page into the next scene and the camera pans one screen along it with a pulse riding the wire.",
    api: "<WirePan at dur a={<SceneA />} b={<SceneB />} fromX fromY toX toY />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: PanDemo,
  },
];

const theme: LibraryTheme = {
  slug: "ai-agent-flow-cockpit",
  name: "AI agent flow cockpit",
  summary: "A dark wired cockpit on a paper page: sources feed an agent card, tool calls fire along right-angled wires, answers grow out of the agent with cited sources, and agents hand work to each other.",
  feel: ["clear", "trustworthy", "enterprise-calm", "structured", "premium"],
  status: "draft",
  board: "data/references/themes/ai-agent-flow-cockpit.md",
  Background: Page,
  entries,
};

export default theme;
