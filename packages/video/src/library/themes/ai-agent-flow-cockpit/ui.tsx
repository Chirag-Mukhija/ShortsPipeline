// Cockpit primitives: the paper page, the dark glowing panel, cards, chips, ticks, spinners, carets, shimmer text and the compact agent node with ports.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { Icon, type IconName } from "./icons";
import { C, EXPO, IN, MONO, R, UI, alpha, fr, mix } from "./theme";
import type { Pt } from "./wires";

export type Box = { x: number; y: number; w: number; h: number };
export const portL = (b: Box, dy = 0): Pt => [b.x, b.y + b.h / 2 + dy];
export const portR = (b: Box, dy = 0): Pt => [b.x + b.w, b.y + b.h / 2 + dy];
export const portT = (b: Box, dx = 0): Pt => [b.x + b.w / 2 + dx, b.y];
export const portB = (b: Box, dx = 0): Pt => [b.x + b.w / 2 + dx, b.y + b.h];

// The value of the last key whose time has passed: a piece's state at time t.
export const pick = <T,>(t: number, keys: [number, T][]): T => {
  let v = keys[0]![1];
  for (const [k, val] of keys) if (t >= k) v = val;
  return v;
};

// Text typed at the board's 28 characters a second.
export const typed = (text: string, t: number, at: number, cps = 28) => text.slice(0, Math.max(0, Math.floor((t - at) * cps)));
export const typeEnd = (text: string, at: number, cps = 28) => at + text.length / cps;

export const enter = (t: number, at: number, dx = 0, dy = 18, d = fr(18)): CSSProperties => {
  const e = ramp(t, at, d, EXPO);
  return { opacity: e, transform: `translate(${dx * (1 - e)}px, ${dy * (1 - e)}px)` };
};

// The light page every cockpit sits on: paper white with a faint node-canvas dot grid and a slow drifting patch where the dots darken.
export const Page: FC = () => {
  const { t } = useTime();
  const x = 960 + Math.sin(t * 0.22) * 620;
  const y = 540 + Math.cos(t * 0.17) * 300;
  const grid: CSSProperties = { backgroundSize: "36px 36px", backgroundPosition: "18px 18px" };
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <AbsoluteFill style={{ ...grid, backgroundImage: `radial-gradient(${C.pageDot} 1.7px, transparent 2px)` }} />
      <AbsoluteFill
        style={{
          ...grid,
          backgroundImage: `radial-gradient(${C.pageDotHi} 1.9px, transparent 2.2px)`,
          maskImage: `radial-gradient(520px circle at ${x}px ${y}px, black, transparent 75%)`,
          WebkitMaskImage: `radial-gradient(520px circle at ${x}px ${y}px, black, transparent 75%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// The dark rounded cockpit: teal glow low-left, brown glow high-right, both drifting; enters 0.96 → 1 over 18 f.
export const CockpitPanel: FC<{ box: Box; at?: number; out?: number; glow?: [string, string]; grid?: boolean; radius?: number; children?: ReactNode; style?: CSSProperties }> = ({ box, at = 0, out, glow = [C.glowA, C.glowB], grid = true, radius = R.panel, children, style }) => {
  const { t } = useTime();
  const e = ramp(t, at, fr(18), EXPO);
  const o = out == null ? 1 : 1 - ramp(t, out, fr(12), IN);
  const gx = 14 + Math.sin(t * 0.31) * 7;
  const gy = 84 + Math.cos(t * 0.27) * 6;
  const bx = 88 + Math.sin(t * 0.23 + 1.4) * 6;
  const by = 10 + Math.cos(t * 0.29 + 0.6) * 6;
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, opacity: e * o, transform: `scale(${0.96 + 0.04 * e})`, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          overflow: "hidden",
          background: `radial-gradient(${box.w * 0.6}px ${box.h * 0.85}px at ${gx}% ${gy}%, ${glow[0]}, transparent 72%), radial-gradient(${box.w * 0.55}px ${box.h * 0.8}px at ${bx}% ${by}%, ${glow[1]}, transparent 70%), ${C.panel}`,
          boxShadow: `0 50px 100px -40px rgba(20, 23, 26, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.06)`,
        }}
      >
        {grid && <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1.6px, transparent 2px)", backgroundSize: "32px 32px" }} />}
      </div>
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
};

// A flat cockpit card: no gradient, 2 px border that can light green (active), amber (cited) or coral (error).
export const Card: FC<{ box: Box; edge?: string; edgeK?: number; radius?: number; style?: CSSProperties; children?: ReactNode }> = ({ box, edge = C.green, edgeK = 0, radius = R.card, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.w,
      height: box.h,
      borderRadius: radius,
      background: C.card,
      border: `2px solid ${mix(C.border, edge, edgeK)}`,
      boxShadow: `0 24px 50px -20px rgba(0,0,0,0.6)${edgeK > 0 ? `, 0 0 ${36 * edgeK}px ${alpha(edge, 0.28 * edgeK)}` : ""}`,
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

// A round status tick: grey ring that fills green and draws its check when `on` reaches 1.
export const Tick: FC<{ on: number; size?: number; color?: string; fail?: boolean }> = ({ on, size = 34, color = C.green, fail }) => {
  const col = fail ? C.red : color;
  const draw = clamp01(on * 1.6 - 0.4);
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" style={{ display: "block", flexShrink: 0 }}>
      <circle cx={17} cy={17} r={15} fill={alpha(col, on)} stroke={mix(C.wire, col, on)} strokeWidth={2} />
      <path d={fail ? "M11.5 11.5l11 11 M22.5 11.5l-11 11" : "M10 17.5l4.6 4.6L24 12.6"} fill="none" stroke={C.panel} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
    </svg>
  );
};

export const Spinner: FC<{ size?: number; color?: string }> = ({ size = 30, color = C.amber }) => {
  const { t } = useTime();
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ display: "block", flexShrink: 0, transform: `rotate(${t * 420}deg)` }}>
      <circle cx={15} cy={15} r={11.5} fill="none" stroke={alpha(color, 0.22)} strokeWidth={3} />
      <circle cx={15} cy={15} r={11.5} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="0.28 1" />
    </svg>
  );
};

// Blinks every 15 f, stays solid while text is still arriving.
export const Caret: FC<{ typing?: boolean; color?: string; h?: number }> = ({ typing, color = C.greenHi, h = 0.95 }) => {
  const { f } = useTime();
  const on = typing || Math.floor(f / 15) % 2 === 0;
  return <span style={{ display: "inline-block", width: 3, height: `${h}em`, marginLeft: 4, verticalAlign: "-0.12em", background: color, opacity: on ? 1 : 0 }} />;
};

// "Working…" shimmer: a bright band sweeps through muted text on a 36 f loop.
export const Shimmer: FC<{ text: string; size?: number; color?: string; style?: CSSProperties }> = ({ text, size = 30, color = C.muted, style }) => {
  const { f } = useTime();
  const p = (f % 36) / 36;
  return (
    <span
      style={{
        fontFamily: UI,
        fontWeight: 500,
        fontSize: size,
        backgroundImage: `linear-gradient(90deg, ${color} 0%, ${color} 38%, #FFFFFF 50%, ${color} 62%, ${color} 100%)`,
        backgroundSize: "300% 100%",
        backgroundPosition: `${100 - p * 100}% 0`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        ...style,
      }}
    >
      {text}
    </span>
  );
};

export type Status = "idle" | "queued" | "working" | "done" | "error" | "retry";
const STATUS: Record<Status, { col: string; text: string }> = {
  idle: { col: C.muted, text: "idle" },
  queued: { col: C.muted, text: "queued" },
  working: { col: C.amber, text: "working" },
  done: { col: C.green, text: "done" },
  error: { col: C.red, text: "error" },
  retry: { col: C.amber, text: "retrying" },
};

// Mono status pill with a breathing dot while work is in flight.
export const StatusPill: FC<{ state: Status; label?: string; size?: number }> = ({ state, label, size = 28 }) => {
  const { t } = useTime();
  const s = STATUS[state];
  const live = state === "working" || state === "retry";
  const breathe = live ? 0.55 + 0.45 * Math.sin(t * 7) : 1;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "6px 18px 6px 14px", borderRadius: 999, background: alpha(s.col, 0.13), border: `2px solid ${alpha(s.col, 0.5)}`, fontFamily: MONO, fontSize: size, color: s.col === C.muted ? C.text : s.col, whiteSpace: "nowrap" }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, background: s.col, opacity: breathe, boxShadow: live ? `0 0 12px ${s.col}` : "none" }} />
      {label ?? s.text}
    </div>
  );
};

// A source in the left column: icon, label, status tick; gets an amber ring while it is being read and its tick turns green.
export const SourceChip: FC<{ box: Box; label: string; icon: IconName; at?: number; activeAt?: number; doneAt?: number; dim?: number }> = ({ box, label, icon, at = 0, activeAt, doneAt, dim = 0 }) => {
  const { t } = useTime();
  const ring = activeAt == null ? 0 : ramp(t, activeAt, 0.2) * (1 - ramp(t, activeAt + 1.1, 0.4));
  const done = doneAt ?? (activeAt == null ? undefined : activeAt + 0.55);
  const tick = done == null ? 0 : ramp(t, done, 0.3);
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, ...enter(t, at, -24, 0), filter: dim > 0 ? `saturate(${1 - dim * 0.6})` : undefined }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - dim * 0.6,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 18px 0 14px",
          borderRadius: 999,
          boxSizing: "border-box",
          background: alpha(C.card, 0.9),
          border: `2px solid ${mix(mix(C.chipLine, C.green, tick * 0.35), C.amber, ring)}`,
          boxShadow: ring > 0 ? `0 0 0 ${5 * ring}px ${alpha(C.amber, 0.22 * ring)}, 0 0 30px ${alpha(C.amber, 0.25 * ring)}` : "0 10px 24px -12px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ width: box.h - 26, height: box.h - 26, borderRadius: 999, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: mix(C.muted, C.text, Math.max(ring, tick)) }}>
          <Icon name={icon} size={Math.round((box.h - 26) * 0.56)} />
        </div>
        <span style={{ flex: 1, fontFamily: UI, fontWeight: 500, fontSize: 30, color: C.text, whiteSpace: "nowrap" }}>{label}</span>
        <Tick on={tick} />
      </div>
    </div>
  );
};

// "[3] contracts.pdf": the citation that ties an answer back to its source.
export const CitationPill: FC<{ n: number; label: string; hot?: number; style?: CSSProperties }> = ({ n, label, hot = 0, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 16px 6px 10px", borderRadius: 12, background: mix(C.cardHi, "#3A3020", hot), border: `2px solid ${mix(C.border, C.amber, hot)}`, fontFamily: MONO, fontSize: 28, color: C.text, whiteSpace: "nowrap", ...style }}>
    <span style={{ color: mix(C.muted, C.amber, hot) }}>[{n}]</span>
    {label}
  </div>
);

export type NodeState = "idle" | "active" | "done" | "error";

// A compact node-graph node for an agent or a step: icon tile, title, mono subtitle, state edge and ports on both sides.
export const AgentNode: FC<{ box: Box; title: string; sub?: string; icon?: IconName; at?: number; states?: [number, NodeState][]; subAt?: [number, string][]; ports?: boolean; dim?: number }> = ({ box, title, sub, icon = "agent", at = 0, states = [[0, "idle"]], subAt, ports = true, dim = 0 }) => {
  const { t } = useTime();
  const state = pick(t, states);
  const changed = [...states].reverse().find(([k]) => t >= k)?.[0] ?? 0;
  const k = ramp(t, changed, 0.25);
  const edge = state === "active" ? C.green : state === "error" ? C.red : state === "done" ? C.green : C.border;
  const edgeK = state === "idle" ? 0 : state === "done" ? 0.45 : k;
  const subText = subAt ? pick(t, subAt) : sub;
  const tile = state === "error" ? C.red : state === "idle" ? C.muted : C.green;
  return (
    <div style={{ ...enter(t, at, 0, 20), position: "absolute", left: 0, top: 0, opacity: (enter(t, at).opacity as number) * (1 - dim * 0.55) }}>
      <Card box={box} edge={edge} edgeK={edgeK} style={{ display: "flex", alignItems: "center", gap: 22, padding: "0 26px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: alpha(tile, 0.14), border: `2px solid ${alpha(tile, 0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", color: tile === C.muted ? C.text : tile, flexShrink: 0 }}>
          <Icon name={icon} size={36} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontFamily: UI, fontWeight: 600, fontSize: 34, color: C.text, whiteSpace: "nowrap" }}>{title}</span>
          {subText != null &&
            (state === "active" ? <Shimmer text={subText} size={28} style={{ fontFamily: MONO, fontWeight: 500, whiteSpace: "nowrap" }} /> : <span style={{ fontFamily: MONO, fontSize: 28, color: C.muted, whiteSpace: "nowrap" }}>{subText}</span>)}
        </div>
        {state === "done" && (
          <div style={{ position: "absolute", right: 22, top: 22 }}>
            <Tick on={ramp(t, changed, 0.3)} size={32} />
          </div>
        )}
        {state === "error" && (
          <div style={{ position: "absolute", right: 22, top: 22 }}>
            <Tick on={1} size={32} fail />
          </div>
        )}
      </Card>
      {ports && (
        <>
          <PortDot p={portL(box)} on={state !== "idle"} />
          <PortDot p={portR(box)} on={state !== "idle"} />
        </>
      )}
    </div>
  );
};

export const PortDot: FC<{ p: Pt; on?: boolean; color?: string }> = ({ p, on, color = C.green }) => (
  <div style={{ position: "absolute", left: p[0] - 9, top: p[1] - 9, width: 18, height: 18, borderRadius: 9, background: C.panel, border: `3px solid ${on ? color : C.wire}`, boxSizing: "border-box" }} />
);

// Small mono label for wires and sections ("input", "handoff", "retry 1 of 3").
export const Tag: FC<{ text: string; x: number; y: number; at?: number; color?: string; anchor?: "left" | "center" }> = ({ text, x, y, at = 0, color = C.muted, anchor = "center" }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: anchor === "center" ? "translate(-50%, -50%)" : "translateY(-50%)", ...{ opacity: ramp(t, at, 0.3) }, fontFamily: MONO, fontSize: 28, color, whiteSpace: "nowrap", letterSpacing: 0.5 }}>
      {text}
    </div>
  );
};

// A small step pill for flow diagrams (Ask → Plan → Act): icon and label, lights green while a pulse is passing through.
export const StepNode: FC<{ box: Box; label: string; icon: IconName; at?: number; lit?: number; color?: string }> = ({ box, label, icon, at = 0, lit = 0, color = C.green }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, ...enter(t, at, 0, 14, 0.4) }}>
      <Card box={box} edge={color} edgeK={lit} radius={box.h / 2} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: mix(C.card, "#1F2C29", lit) }}>
        <span style={{ color: mix(C.muted, color, lit), display: "flex" }}>
          <Icon name={icon} size={34} />
        </span>
        <span style={{ fontFamily: UI, fontWeight: 600, fontSize: 32, color: C.text, whiteSpace: "nowrap" }}>{label}</span>
      </Card>
    </div>
  );
};
