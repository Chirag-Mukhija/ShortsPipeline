// Cockpit cards with behaviour: the agent card (typed question, working shimmer, reading counter), the thinking trace, tool calls with retries, the answer card that grows out of the agent, the context meter and the cited excerpt.
import type { FC, ReactNode } from "react";
import { interpolate } from "remotion";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { Icon, type IconName } from "./icons";
import { C, EXPO, HEAD, MONO, UI, alpha, fr, mix } from "./theme";
import { Card, Caret, CitationPill, Shimmer, Spinner, StatusPill, Tick, enter, typeEnd, typed, type Box, type Status } from "./ui";

export type TraceStep = {
  label: string;
  at: number;
  // When the step finishes; defaults to 0.6 s after it starts.
  done?: number;
  icon?: IconName;
  // A finding in brighter text, not a step: no icon, no tick.
  note?: boolean;
  // Replaces {n} in the label with a number counting up to this while the step runs.
  count?: number;
  fail?: boolean;
};

const IconTile: FC<{ icon: IconName; size?: number; color?: string }> = ({ icon, size = 52, color = C.green }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.3, background: alpha(color, 0.14), border: `2px solid ${alpha(color, 0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
    <Icon name={icon} size={Math.round(size * 0.58)} />
  </div>
);

// Steps that tick one by one: spinner while running, green check when done; layout is fixed from the start so nothing jumps.
export const ThinkingTrace: FC<{ steps: TraceStep[]; size?: number; gap?: number }> = ({ steps, size = 30, gap = 14 }) => {
  const { t } = useTime();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {steps.map((s, i) => {
        const done = s.done ?? s.at + 0.6;
        const run = ramp(t, s.at, Math.max(0.2, done - s.at), EXPO);
        const label = s.count == null ? s.label : s.label.replace("{n}", Math.round(s.count * run).toLocaleString("en-US"));
        if (s.note)
          return (
            <div key={i} style={{ ...enter(t, s.at, 0, 10, 0.4), fontFamily: UI, fontWeight: 500, fontSize: size + 2, lineHeight: 1.3, color: C.text }}>
              {s.label}
            </div>
          );
        const fin = t >= done;
        return (
          <div key={i} style={{ ...enter(t, s.at, 0, 10, 0.3), display: "flex", alignItems: "center", gap: size * 0.5 }}>
            <span style={{ color: fin ? C.muted : C.text }}>
              <Icon name={s.icon ?? "chev"} size={Math.round(size * 1.05)} />
            </span>
            <span style={{ fontFamily: UI, fontWeight: 500, fontSize: size, color: fin ? mix(C.text, C.muted, 0.25) : C.text, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{label}</span>
            <span style={{ color: C.wire }}>
              <Icon name="chev" size={Math.round(size * 0.8)} />
            </span>
            <span style={{ flex: 1 }} />
            {t >= s.at && (fin ? <Tick on={ramp(t, done, 0.25)} size={Math.round(size * 1.1)} fail={s.fail} /> : <Spinner size={Math.round(size * 1.0)} />)}
          </div>
        );
      })}
    </div>
  );
};

// The centre of the cockpit: a question types in, "Working…" shimmers, the source counter ticks as pulses land, the trace fills, then it settles to "Worked for Ns".
export const AgentCard: FC<{
  box: Box;
  at?: number;
  name?: string;
  question: string;
  askAt: number;
  workAt?: number;
  doneAt?: number;
  reads?: number[];
  readLabel?: string;
  steps?: TraceStep[];
  composer?: boolean;
  size?: number;
}> = ({ box, at = 0, name = "Agent", question, askAt, workAt, doneAt, reads, readLabel = "sources", steps = [], composer, size = 34 }) => {
  const { t } = useTime();
  const work = workAt ?? typeEnd(question, askAt) + 0.3;
  const status: Status = doneAt != null && t >= doneAt ? "done" : t >= work ? "working" : "idle";
  const typing = t < typeEnd(question, askAt);
  const nRead = reads ? reads.filter((r) => t >= r).length : 0;
  const lastRead = reads?.[reads.length - 1] ?? 0;
  const bump = reads ? Math.max(0, ...reads.map((r) => (t >= r ? Math.exp(-(t - r) * 9) : 0))) : 0;
  const edgeK = status === "working" ? 0.55 + 0.15 * Math.sin(t * 4) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, ...enter(t, at, 0, 24) }}>
      <Card box={box} edge={C.green} edgeK={edgeK} style={{ display: "flex", flexDirection: "column", gap: 22, padding: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <IconTile icon="agent" />
          <span style={{ fontFamily: UI, fontWeight: 600, fontSize: 32, color: C.text, flex: 1 }}>{name}</span>
          <StatusPill state={status} />
        </div>
        <div style={{ alignSelf: "flex-end", maxWidth: "88%", minHeight: size * 1.3, padding: "18px 24px", borderRadius: "24px 24px 8px 24px", background: C.cardHi, fontFamily: UI, fontWeight: 500, fontSize: size, lineHeight: 1.3, color: C.text, opacity: ramp(t, askAt - 0.2, 0.2) }}>
          {typed(question, t, askAt)}
          {t < work && <Caret typing={typing} />}
        </div>
        <div style={{ height: 38, display: "flex", alignItems: "center" }}>
          {t >= work && (doneAt == null || t < doneAt) && <Shimmer text="Working…" size={30} />}
          {doneAt != null && t >= doneAt && <span style={{ fontFamily: UI, fontWeight: 500, fontSize: 30, color: C.muted }}>Worked for {Math.max(1, Math.round(doneAt - work))}s</span>}
        </div>
        {(reads || steps.length > 0) && (
          <div style={{ border: `2px solid ${C.border}`, borderRadius: 20, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, opacity: ramp(t, work, 0.3) }}>
            {reads && (
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <span style={{ color: C.text }}>
                  <Icon name="book" size={32} />
                </span>
                <span style={{ fontFamily: UI, fontWeight: 500, fontSize: 30, color: C.text, whiteSpace: "nowrap" }}>
                  Reading{" "}
                  <span style={{ display: "inline-block", fontFamily: MONO, color: mix(C.text, C.greenHi, bump), transform: `scale(${1 + 0.25 * bump})` }}>{nRead}</span> {readLabel}
                </span>
                <span style={{ flex: 1 }} />
                {t >= lastRead + 0.3 ? <Tick on={ramp(t, lastRead + 0.3, 0.25)} size={33} /> : <Spinner size={30} />}
              </div>
            )}
            {steps.length > 0 && <ThinkingTrace steps={steps} />}
          </div>
        )}
        {composer && (
          <div style={{ marginTop: "auto", borderRadius: 20, background: C.well, border: `2px solid ${C.border}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontFamily: UI, fontSize: 28, color: C.muted }}>Ask a follow-up…</span>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
                <Icon name="plus" size={24} />
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.cardHi, display: "flex", alignItems: "center", justifyContent: "center", color: C.text }}>
                <Icon name="send" size={24} />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export type Attempt = { start: number; end: number; error?: string };

// A tool call as a card: arguments type into the input well, the status runs queued → running (ms ticking) → ok, or errors, backs off with a countdown ring and retries.
export const ToolCard: FC<{ box: Box; at?: number; name: string; icon?: IconName; input: string; output: string[]; attempts: Attempt[] }> = ({ box, at = 0, name, icon = "search", input, output, attempts }) => {
  const { t } = useTime();
  let i = -1;
  attempts.forEach((a, k) => {
    if (t >= a.start) i = k;
  });
  const cur = attempts[i];
  const next = attempts[i + 1];
  const max = attempts.length;
  let state: Status = "queued";
  let label: string | undefined;
  if (cur) {
    if (t < cur.end) {
      state = "working";
      label = `running · ${Math.round((t - cur.start) * 1000)} ms`;
    } else if (cur.error) {
      state = next ? "retry" : "error";
      label = cur.error;
    } else {
      state = "done";
      label = `ok · ${Math.round((cur.end - cur.start) * 1000)} ms`;
    }
  }
  const failAt = cur?.error && t >= cur.end ? cur.end : null;
  const shake = failAt == null ? 0 : 10 * Math.exp(-(t - failAt) * 7) * Math.sin((t - failAt) * 46);
  const edge = state === "done" ? C.green : state === "working" ? C.amber : state === "retry" || state === "error" ? C.red : C.border;
  const edgeK = state === "queued" ? 0 : state === "done" ? 0.6 : 0.85;
  const okAt = state === "done" && cur ? cur.end : null;
  const back = cur?.error && next ? clamp01((t - cur.end) / (next.start - cur.end)) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, ...enter(t, at, 24, 0), translate: `${shake}px 0` }}>
      <Card box={box} edge={edge} edgeK={edgeK} style={{ display: "flex", flexDirection: "column", gap: 18, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <IconTile icon={icon} color={state === "done" ? C.green : state === "queued" ? C.muted : edge} />
          <span style={{ fontFamily: MONO, fontSize: 32, color: C.text, flex: 1, whiteSpace: "nowrap" }}>{name}()</span>
          <StatusPill state={state === "retry" ? "error" : state} label={label} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted }}>input</span>
        <div style={{ background: C.well, borderRadius: 16, border: `2px solid ${C.border}`, padding: "16px 20px", fontFamily: MONO, fontSize: 28, lineHeight: 1.4, color: C.text, whiteSpace: "pre", minHeight: 40 }}>
          {typed(input, t, at + 0.15, 45)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted }}>output</span>
          {state === "retry" && cur && next && (
            <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 28, color: C.amber, marginLeft: "auto" }}>
              <svg width={32} height={32} viewBox="0 0 32 32">
                <circle cx={16} cy={16} r={12} fill="none" stroke={alpha(C.amber, 0.25)} strokeWidth={3.5} />
                <circle cx={16} cy={16} r={12} fill="none" stroke={C.amber} strokeWidth={3.5} pathLength={1} strokeDasharray={`${1 - back} 1`} transform="rotate(-90 16 16)" strokeLinecap="round" />
              </svg>
              retry {i + 2} of {max} in {Math.max(1, Math.ceil(next.start - t))}s
            </span>
          )}
        </div>
        <div style={{ flex: 1, background: C.well, borderRadius: 16, border: `2px solid ${C.border}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {state === "working" && <Shimmer text="waiting for result…" size={28} style={{ fontFamily: MONO }} />}
          {(state === "retry" || state === "error") && (
            <span style={{ fontFamily: MONO, fontSize: 28, color: C.red, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="x" size={28} /> {cur?.error}
            </span>
          )}
          {okAt != null &&
            output.map((line, k) => (
              <span key={k} style={{ ...enter(t, okAt + 0.1 + k * 0.14, 0, 8, 0.3), fontFamily: MONO, fontSize: 28, color: k === 0 ? C.greenHi : C.text, whiteSpace: "nowrap" }}>
                {line}
              </span>
            ))}
        </div>
      </Card>
    </div>
  );
};

export type Bar = { label: string; value: number; text?: string };
export type Cite = { n: number; label: string; at: number; hot?: boolean };

// The answer: grows out of the agent card (shared-element, 20 f), bars fill 24 f expo with a 3 f stagger, citations and a follow-up action land after.
export const AnswerCard: FC<{ box: Box; at: number; from?: Box; title: string; bars?: Bar[]; barsAt?: number; cites?: Cite[]; action?: string; actionAt?: number; children?: ReactNode }> = ({ box, at, from, title, bars = [], barsAt, cites = [], action, actionAt, children }) => {
  const { t } = useTime();
  const g = ramp(t, at, fr(20), EXPO);
  const f0 = from ?? { x: box.x + box.w * 0.04, y: box.y + box.h * 0.04, w: box.w * 0.92, h: box.h * 0.92 };
  const r = { x: f0.x + (box.x - f0.x) * g, y: f0.y + (box.y - f0.y) * g, w: f0.w + (box.w - f0.w) * g, h: f0.h + (box.h - f0.h) * g };
  const show = ramp(t, at + 0.35, 0.35);
  const ba = barsAt ?? at + 0.55;
  if (t < at) return null;
  return (
    <Card box={r} edge={C.green} edgeK={0.35 * (1 - ramp(t, at + 1, 1))} style={{ overflow: "hidden", opacity: ramp(t, at, 0.12) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h, padding: 30, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 22, opacity: show }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.green }}>
          <Icon name="agent" size={30} />
          <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted }}>answer</span>
        </div>
        <span style={{ fontFamily: UI, fontWeight: 600, fontSize: 38, color: C.text, lineHeight: 1.15 }}>{title}</span>
        {bars.map((b, k) => {
          const p = ramp(t, ba + k * fr(3), fr(24), EXPO);
          return (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: UI, fontWeight: 500, fontSize: 30, color: C.text }}>{b.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 28, color: k === 0 ? C.greenHi : C.muted }}>{b.text ?? `${Math.round(b.value * p)}%`}</span>
              </div>
              <div style={{ height: 16, borderRadius: 8, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${b.value * p}%`, height: "100%", borderRadius: 8, background: k === 0 ? C.green : mix(C.green, C.wire, 0.45) }} />
              </div>
            </div>
          );
        })}
        {children}
        {cites.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {cites.map((c, k) => {
              const s = ramp(t, c.at, 0.35, EXPO);
              return <CitationPill key={k} n={c.n} label={c.label} hot={c.hot ? ramp(t, c.at + 0.3, 0.3) : 0} style={{ opacity: s, transform: `scale(${0.8 + 0.2 * s})` }} />;
            })}
          </div>
        )}
        {action && (
          <div style={{ ...enter(t, actionAt ?? at + 1.6, 0, 12, 0.4), alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderRadius: 16, border: `2px solid ${C.border}`, fontFamily: UI, fontWeight: 500, fontSize: 30, color: C.text }}>
            <Icon name="arrow" size={28} color={C.green} />
            {action}
          </div>
        )}
      </div>
    </Card>
  );
};

// A big number inside a card: counts up expo-out, punches on landing, and a cell meter fills toward a limit (tokens in a context window, rows scanned).
export const MetricCard: FC<{ box: Box; at: number; dur?: number; value: number; label: string; of?: number; ofLabel?: string; cols?: number; rows?: number; suffix?: string }> = ({ box, at, dur = 1.6, value, label, of, ofLabel, cols = 24, rows = 3, suffix = "" }) => {
  const { t } = useTime();
  const p = ramp(t, at, dur, EXPO);
  const punch = 1 + 0.06 * Math.exp(-Math.max(0, t - (at + dur * 0.55)) * 8) * (t > at + dur * 0.55 ? 1 : 0);
  const n = Math.round(value * p);
  const cells = cols * rows;
  const fill = of ? (value / of) * p * cells : 0;
  return (
    <Card box={box} style={{ ...enter(t, at - 0.3, 0, 20), padding: "34px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted, letterSpacing: 1 }}>{label}</span>
      <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 200, lineHeight: 1, color: C.text, fontVariantNumeric: "tabular-nums", letterSpacing: -6, transformOrigin: "left center", transform: `scale(${punch})` }}>
        {n.toLocaleString("en-US")}
        {suffix}
      </span>
      {of != null && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, marginTop: 18 }}>
            {Array.from({ length: cells }, (_, k) => {
              const on = clamp01(fill - k);
              const edge = on > 0 && on < 1;
              return <div key={k} style={{ height: 22, borderRadius: 5, background: on > 0 ? mix(C.cardHi, edge ? C.amber : C.green, Math.max(on, 0.35)) : "rgba(255,255,255,0.06)", boxShadow: edge ? `0 0 12px ${alpha(C.amber, 0.6)}` : "none" }} />;
            })}
          </div>
          <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted, marginTop: 8 }}>{ofLabel ?? `of ${of.toLocaleString("en-US")}`}</span>
        </>
      )}
    </Card>
  );
};

// A cited passage: source header, the excerpt, and the exact phrase the agent used getting an amber highlight and an underline that draws in 12 f.
export const ExcerptCard: FC<{ box: Box; at: number; n: number; source: string; where?: string; before: string; hit: string; after?: string; hitAt: number; footer?: string }> = ({ box, at, n, source, where, before, hit, after = "", hitAt, footer = "used in the answer" }) => {
  const { t } = useTime();
  const h = ramp(t, hitAt, 0.45, INOUT);
  const u = ramp(t, hitAt + 0.25, fr(12), EXPO);
  return (
    <Card box={box} edge={C.amber} edgeK={0.55 * h} style={{ ...enter(t, at, 0, 20), padding: "34px 42px", display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <IconTile icon="doc" color={mix(C.muted, C.amber, h)} />
        <span style={{ fontFamily: MONO, fontSize: 30, color: C.text }}>
          <span style={{ color: mix(C.muted, C.amber, h) }}>[{n}]</span> {source}
        </span>
        {where && <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted }}>· {where}</span>}
      </div>
      <div style={{ fontFamily: UI, fontWeight: 500, fontSize: 46, lineHeight: 1.42, color: mix(C.text, C.muted, h * 0.55) }}>
        {before}
        <span
          style={{
            color: C.text,
            backgroundImage: `linear-gradient(${alpha(C.amber, 0.24)}, ${alpha(C.amber, 0.24)}), linear-gradient(${C.amber}, ${C.amber})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${h * 100}% 100%, ${u * 100}% 4px`,
            backgroundPosition: "0 0, 0 100%",
            WebkitBoxDecorationBreak: "clone",
            boxDecorationBreak: "clone",
            padding: "0 6px",
            borderRadius: 6,
          }}
        >
          {hit}
        </span>
        {after}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14, opacity: ramp(t, hitAt + 0.6, 0.4) }}>
        <Tick on={ramp(t, hitAt + 0.6, 0.3)} size={32} />
        <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted }}>{footer}</span>
      </div>
    </Card>
  );
};

// Flying citation: a pill leaves a source and arcs into the answer, landing with a small pop.
export const FlyingCite: FC<{ from: [number, number]; to: [number, number]; at: number; dur?: number; n: number; label: string; lift?: number }> = ({ from, to, at, dur = 0.7, n, label, lift = 120 }) => {
  const { t } = useTime();
  const p = interpolate(t, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: INOUT });
  const o = ramp(t, at - 0.05, 0.12) * (1 - ramp(t, at + dur, 0.15));
  if (o <= 0) return null;
  const x = from[0] + (to[0] - from[0]) * p;
  const y = from[1] + (to[1] - from[1]) * p - Math.sin(Math.PI * p) * lift;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${0.9 + 0.15 * Math.sin(Math.PI * p)})`, opacity: o, boxShadow: `0 0 30px ${alpha(C.amber, 0.4)}`, borderRadius: 12 }}>
      <CitationPill n={n} label={label} hot={1} />
    </div>
  );
};
