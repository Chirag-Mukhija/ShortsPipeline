// Cockpit wiring: right-angled routes with rounded corners, measured so a wire can draw on, retract, light up, carry travelling pulses and packets, and keep idle dots flowing.
import type { CSSProperties, FC, ReactNode } from "react";
import { interpolate } from "remotion";
import { ramp, useTime } from "../../core/time";
import { C, EXPO, IN, MONO, R, SINE, alpha, fr } from "./theme";

export type Pt = [number, number];
export type Route = { pts: Pt[]; cum: number[]; len: number; d: string };

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// Drop repeated and collinear points so a straight run never gets a zero-length corner.
const simplify = (pts: Pt[]) => {
  const d = pts.filter((p, i) => i === 0 || dist(pts[i - 1]!, p) > 0.01);
  if (d.length < 3) return d;
  const out: Pt[] = [d[0]!];
  for (let i = 1; i < d.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = d[i]!;
    const c = d[i + 1]!;
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) > 0.01) out.push(b);
  }
  out.push(d[d.length - 1]!);
  return out;
};

const roundCorners = (raw: Pt[], r: number): Pt[] => {
  const p = simplify(raw);
  if (p.length < 3) return p;
  const out: Pt[] = [p[0]!];
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    const c = p[i + 1]!;
    const l1 = dist(a, b);
    const l2 = dist(b, c);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const s: Pt = [b[0] - ((b[0] - a[0]) / l1) * rr, b[1] - ((b[1] - a[1]) / l1) * rr];
    const e: Pt = [b[0] + ((c[0] - b[0]) / l2) * rr, b[1] + ((c[1] - b[1]) / l2) * rr];
    for (let k = 0; k <= 10; k++) {
      const q = k / 10;
      out.push([(1 - q) * (1 - q) * s[0] + 2 * (1 - q) * q * b[0] + q * q * e[0], (1 - q) * (1 - q) * s[1] + 2 * (1 - q) * q * b[1] + q * q * e[1]]);
    }
  }
  out.push(p[p.length - 1]!);
  return out;
};

export const route = (corners: Pt[], r = R.wire): Route => {
  const pts = roundCorners(corners, r);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return { pts, cum, len: cum[cum.length - 1] ?? 0, d };
};

// The board's habit: leave a port horizontally, turn at midX, run vertically, enter the next port horizontally.
export const hvh = (a: Pt, b: Pt, midX = (a[0] + b[0]) / 2, r?: number) => route([a, [midX, a[1]], [midX, b[1]], b], r);
// The same with the turns stacked vertically, for ports on the top and bottom of a node.
export const vhv = (a: Pt, b: Pt, midY = (a[1] + b[1]) / 2, r?: number) => route([a, [a[0], midY], [b[0], midY], b], r);

export const pointAt = (rt: Route, u: number): Pt => {
  const s = Math.min(1, Math.max(0, u)) * rt.len;
  let i = 1;
  while (i < rt.cum.length - 1 && rt.cum[i]! < s) i++;
  const a = rt.pts[i - 1]!;
  const b = rt.pts[i]!;
  const seg = rt.cum[i]! - rt.cum[i - 1]!;
  const k = seg > 0 ? (s - rt.cum[i - 1]!) / seg : 0;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
};

// Dash pattern that shows only the stretch [s0, s1] of the path.
const span = (s0: number, s1: number, len: number) => `0 ${Math.max(0, s0)} ${Math.max(0, s1 - s0)} ${len + 10}`;

export type Pulse = { at: number; dur?: number; back?: boolean; color?: string };

// Seconds a pulse needs to finish its run: the board's 20 frames, a little longer on long wires.
const pulseDur = (p: Pulse, len: number) => p.dur ?? Math.max(fr(20), len / 900);

export const pulseEnd = (p: Pulse, rt: Route) => p.at + pulseDur(p, rt.len);

type WireProps = {
  r: Route;
  drawAt?: number;
  drawDur?: number;
  retractAt?: number;
  // 0..1: the wire lights green (a source in use, a chosen path).
  lit?: number;
  litColor?: string;
  pulses?: Pulse[];
  // Opacity of the idle dots that keep flowing along every wire (loop 60 f).
  flow?: number;
  flowBack?: boolean;
  ports?: boolean;
  width?: number;
  opacity?: number;
};

// Goes inside an <svg> layer that shares its coordinates with the cards.
export const Wire: FC<WireProps> = ({ r, drawAt, drawDur = 0.55, retractAt, lit = 0, litColor = C.green, pulses = [], flow = 0.4, flowBack, ports = true, width = 3, opacity = 1 }) => {
  const { t } = useTime();
  const draw = drawAt == null ? 1 : ramp(t, drawAt, drawDur, EXPO);
  const retract = retractAt == null ? 0 : ramp(t, retractAt, fr(12), IN);
  const s0 = retract * r.len;
  const s1 = draw * r.len;
  if (s1 - s0 <= 0.5 || opacity <= 0) return null;
  const dash = span(s0, s1, r.len);
  const shown = (u: number) => u * r.len >= s0 - 1 && u * r.len <= s1 + 1;
  const n = Math.max(2, Math.round(r.len / 240));
  const a = r.pts[0]!;
  const b = r.pts[r.pts.length - 1]!;
  return (
    <g opacity={opacity}>
      <path d={r.d} fill="none" stroke={C.wire} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      {lit > 0 && <path d={r.d} fill="none" stroke={litColor} strokeWidth={width + 0.5} strokeDasharray={dash} strokeLinecap="round" opacity={lit} />}
      {flow > 0 &&
        Array.from({ length: n }, (_, k) => {
          const raw = (((t / 2 + k / n) % 1) + 1) % 1;
          const u = flowBack ? 1 - raw : raw;
          if (!shown(u)) return null;
          const [x, y] = pointAt(r, u);
          return <circle key={k} cx={x} cy={y} r={3.5} fill={C.greenHi} opacity={flow * Math.sin(Math.PI * raw) * (0.5 + 0.5 * lit)} />;
        })}
      {pulses.map((p, k) => {
        const dur = pulseDur(p, r.len);
        if (t < p.at || t > p.at + dur + 0.35) return null;
        const raw = interpolate(t, [p.at, p.at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SINE });
        const u = p.back ? 1 - raw : raw;
        const col = p.color ?? C.green;
        const head = u * r.len;
        const tail = p.back ? Math.min(r.len, head + 180) : Math.max(0, head - 180);
        const land = ramp(t, p.at + dur, 0.3);
        const [x, y] = pointAt(r, u);
        const [ex, ey] = p.back ? a : b;
        return (
          <g key={k}>
            <path d={r.d} fill="none" stroke={col} strokeWidth={width + 1.5} strokeLinecap="round" strokeDasharray={span(Math.min(head, tail), Math.max(head, tail), r.len)} opacity={0.9 * (1 - land)} />
            {raw < 1 && (
              <>
                <circle cx={x} cy={y} r={20} fill={col} opacity={0.18} />
                <circle cx={x} cy={y} r={11} fill={col} opacity={0.45} />
                <circle cx={x} cy={y} r={6} fill="#F2FFF9" />
              </>
            )}
            {land > 0 && <circle cx={ex} cy={ey} r={8 + land * 26} fill="none" stroke={col} strokeWidth={3} opacity={1 - land} />}
          </g>
        );
      })}
      {ports && draw > 0.98 && retract === 0 && (
        <>
          <circle cx={a[0]} cy={a[1]} r={7} fill={C.panel} stroke={lit > 0.5 ? litColor : C.wire} strokeWidth={3} />
          <circle cx={b[0]} cy={b[1]} r={7} fill={C.panel} stroke={lit > 0.5 ? litColor : C.wire} strokeWidth={3} />
        </>
      )}
    </g>
  );
};

// An SVG overlay in the same pixel space as the cards around it.
export const WireLayer: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible", pointerEvents: "none", ...style }}>{children}</svg>
);

// A labelled pill that rides a wire: a tool's arguments going out, its result coming back, a file handed to the next agent.
export const Packet: FC<{ r: Route; at: number; dur?: number; back?: boolean; label: string; color?: string; dock?: boolean }> = ({ r, at, dur, back, label, color = C.green, dock }) => {
  const { t } = useTime();
  const d = dur ?? Math.max(0.8, r.len / 700);
  const raw = interpolate(t, [at, at + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SINE });
  const appear = ramp(t, at - 0.15, 0.2);
  const gone = dock ? 0 : ramp(t, at + d, 0.25);
  const o = appear * (1 - gone);
  if (o <= 0) return null;
  const [x, y] = pointAt(r, back ? 1 - raw : raw);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * appear})`,
        opacity: o,
        padding: "8px 18px",
        borderRadius: 999,
        background: C.panel,
        border: `2px solid ${color}`,
        boxShadow: `0 0 24px ${alpha(color, 0.45)}`,
        fontFamily: MONO,
        fontSize: 28,
        color: C.text,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
};
