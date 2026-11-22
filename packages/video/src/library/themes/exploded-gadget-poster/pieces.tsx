// Poster pieces: the yellow field and grey hero band, the SVG stage, spec table, big stat, A-vs-B shelf, signal path, source sticker and the vertical section scroll.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { BODY, DISPLAY, GREY, GREY_HI, INK, MONO, SIZE, VIOLET, WHITE, YELLOW, YELLOW_HI, YELLOW_LO } from "./theme";
import { countUp, ease, EXPO_OUT, pop, rnd, squash, squashPop, wiggle } from "./motion";
import { FloorShadow } from "./gadgets";

// ---------- surfaces ----------
// The canary field: flat yellow with one soft studio light drifting slowly across it (the idle life).
export const PosterField: FC<{ color?: string }> = ({ color = YELLOW }) => {
  const { t } = useTime();
  const lx = 34 + Math.sin(t * 0.21) * 8;
  const ly = 30 + Math.cos(t * 0.17) * 6;
  return (
    <AbsoluteFill style={{ background: color }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 80% at ${lx}% ${ly}%, ${YELLOW_HI} 0%, rgba(255,216,74,0) 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, ${YELLOW_LO} 140%)`, opacity: 0.6 }} />
    </AbsoluteFill>
  );
};

// The grey hero band with a soft spotlight behind the object, as on a product landing page.
export const HeroBand: FC<{ spot?: [number, number]; style?: CSSProperties }> = ({ spot = [50, 55], style }) => {
  const { t } = useTime();
  return (
    <AbsoluteFill style={{ background: GREY, ...style }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 38% 52% at ${spot[0] + Math.sin(t * 0.3) * 1.5}% ${spot[1]}%, ${GREY_HI} 0%, rgba(154,157,160,0) 100%)` }} />
    </AbsoluteFill>
  );
};

// Full-frame SVG for drawn gadgets; HTML type sits on top of it.
export const Stage: FC<{ children: ReactNode }> = ({ children }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {children}
  </svg>
);

// Places SVG artwork; `rise` lifts it in from below with the squash spring at `at`.
export const Place: FC<{ x: number; y: number; s?: number; r?: number; at?: number; children: ReactNode; shadow?: number }> = ({ x, y, s = 1, r = 0, at, children, shadow }) => {
  const { t } = useTime();
  const k = at === undefined ? 1 : squash(t, at);
  const e = at === undefined ? 1 : ease(t, at, 0.6, EXPO_OUT);
  if (e <= 0) return null;
  return (
    <g transform={`translate(${x} ${y + (1 - e) * 140})`} opacity={Math.min(1, e * 4)}>
      {shadow && <FloorShadow y={shadow} rx={260 * s} ry={34 * s} o={0.18 * e} />}
      <g transform={`rotate(${r}) scale(${s * (1.04 - 0.04 * k)} ${s * (0.8 + 0.2 * k)})`}>{children}</g>
    </g>
  );
};

// ---------- spec table ----------
// Printed spec sheet: hairline rules draw across, labels fade up and values count up, one row per `stagger`.
export type SpecRow = { k: string; v: number | string; unit?: string; decimals?: number; key?: boolean };
export const SpecTable: FC<{ rows: SpecRow[]; at: number; x: number; y: number; width?: number; rowH?: number; stagger?: number }> = ({ rows, at, x, y, width = 760, rowH = 96, stagger = 0.22 }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: x, top: y, width }}>
      {rows.map((r, i) => {
        const a = at + i * stagger;
        const line = ease(t, a, 0.45, EXPO_OUT);
        const s = squashPop(t, a + 0.12, 30);
        const val = typeof r.v === "number" ? countUp(t, a + 0.12, 0.7, r.v, r.decimals ?? 0) : r.v;
        return (
          <div key={i} style={{ position: "relative", height: rowH, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "absolute", left: 0, bottom: 0, height: 4, width: "100%", background: INK, transform: `scaleX(${line})`, transformOrigin: "0 50%" }} />
            <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: SIZE.body, color: INK, opacity: line }}>{r.k}</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 62, letterSpacing: "-0.03em", color: r.key ? VIOLET : INK, opacity: s.o, transform: `scale(${s.sx}, ${s.sy})`, transformOrigin: "100% 100%", fontVariantNumeric: "tabular-nums" }}>
              {val}
              {r.unit && <span style={{ fontSize: 40, marginLeft: 8 }}>{r.unit}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ---------- big stat ----------
// A poster-sized number that counts up, with its unit as a violet sticker slapped on the corner.
export const BigStat: FC<{ value: number; decimals?: number; unit: string; caption: string; at: number; x: number; y: number; size?: number; dur?: number }> = ({ value, decimals = 0, unit, caption, at, x, y, size = SIZE.mega, dur = 1.1 }) => {
  const { t } = useTime();
  const s = squashPop(t, at, 60);
  const u = pop(t, at + dur * 0.85, 0.4);
  const c = ease(t, at + 0.3, 0.5, EXPO_OUT);
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.9, letterSpacing: "-0.05em", color: INK, opacity: s.o, transform: `scale(${s.sx}, ${s.sy})`, transformOrigin: "0 100%", fontVariantNumeric: "tabular-nums" }}>
          {countUp(t, at, dur, value, decimals)}
        </div>
        <div style={{ position: "absolute", right: -size * 0.46, top: -size * 0.16, transform: `rotate(${-8 + wiggle(t, 1.5)}deg) scale(${u})`, background: VIOLET, color: WHITE, fontFamily: DISPLAY, fontWeight: 800, fontSize: size * 0.24, padding: `${size * 0.04}px ${size * 0.12}px ${size * 0.055}px`, borderRadius: 999, boxShadow: "0 14px 34px rgba(17,17,17,0.22)", whiteSpace: "nowrap" }}>
          {unit}
        </div>
      </div>
      <div style={{ marginTop: 30, maxWidth: 760, fontFamily: BODY, fontWeight: 500, fontSize: 42, lineHeight: 1.3, color: INK, opacity: c, transform: `translateY(${(1 - c) * 20}px)` }}>{caption}</div>
    </div>
  );
};

// ---------- A vs B ----------
export type Side = { title: string; lines: string[]; art: ReactNode; at: number };
const SideCol: FC<{ side: Side; cx: number }> = ({ side, cx }) => {
  const { t } = useTime();
  const s = squashPop(t, side.at + 0.15, 60);
  const l = ease(t, side.at + 0.35, 0.5, EXPO_OUT);
  return (
    <div style={{ position: "absolute", left: cx - 400, top: 640, width: 800, textAlign: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, letterSpacing: "-0.035em", lineHeight: 1, color: INK, opacity: s.o, transform: `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`, transformOrigin: "50% 100%" }}>{side.title}</div>
      {side.lines.map((ln, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 22 : 6, fontFamily: BODY, fontWeight: 500, fontSize: 38, color: INK, opacity: l }}>{ln}</div>
      ))}
    </div>
  );
};
export const Versus: FC<{ a: Side; b: Side; vsAt: number; artY?: number }> = ({ a, b, vsAt, artY = 380 }) => {
  const { t } = useTime();
  const v = pop(t, vsAt, 0.4);
  return (
    <AbsoluteFill>
      <Stage>
        <Place x={500} y={artY} at={a.at} shadow={150}>{a.art}</Place>
        <Place x={1420} y={artY} at={b.at} shadow={150}>{b.art}</Place>
        <line x1={960} x2={960} y1={150} y2={150 + 780 * ease(t, a.at, 0.8, EXPO_OUT)} stroke={INK} strokeWidth={4} strokeDasharray="4 16" strokeLinecap="round" />
      </Stage>
      <SideCol side={a} cx={500} />
      <SideCol side={b} cx={1420} />
      {v > 0 && (
        <div style={{ position: "absolute", left: 960, top: 560, transform: `translate(-50%, -50%) scale(${v}) rotate(${-6 + wiggle(t, 1.5)}deg)`, width: 150, height: 150, borderRadius: 999, background: VIOLET, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, boxShadow: "0 18px 40px rgba(17,17,17,0.25)" }}>
          vs.
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- signal path ----------
// Parts on a shelf joined by a thick ink line that draws on; a violet packet rides it and each part pops as the line reaches it.
export type PathNode = { label: string; sub?: string; art: ReactNode; t: number };
export const SignalPath: FC<{ nodes: PathNode[]; y?: number; x0?: number; x1?: number; loop?: number }> = ({ nodes, y = 560, x0 = 300, x1 = 1620, loop = 1.6 }) => {
  const { t } = useTime();
  const n = nodes.length;
  const xs = nodes.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const segs = xs.slice(1).map((x, i) => {
    const xa = xs[i]!;
    const mid = (xa + x) / 2;
    return { d: `M ${xa} ${y} Q ${mid} ${y + 120} ${x} ${y}`, p: ease(t, nodes[i]!.t + 0.15, Math.max(0.3, nodes[i + 1]!.t - nodes[i]!.t - 0.1), Easing.inOut(Easing.cubic)), xa, x, mid };
  });
  const done = nodes[n - 1]!.t + 0.3;
  const q = t > done ? ((t - done) / loop) % 1 : -1;
  const qi = Math.min(n - 2, Math.floor(q * (n - 1)));
  const qs = segs[qi]!;
  const qu = q * (n - 1) - qi;
  const bez = (a: number, c: number, b: number, u: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
  return (
    <AbsoluteFill>
      <Stage>
        {segs.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={`${s.p} 1`} />
        ))}
        {q >= 0 && (
          <g transform={`translate(${bez(qs.xa, qs.mid, qs.x, qu)} ${bez(y, y + 120, y, qu)})`}>
            <circle r={22} fill={WHITE} />
            <circle r={13} fill={VIOLET} />
          </g>
        )}
        {nodes.map((nd, i) => (
          <Place key={i} x={xs[i]!} y={y - 20} at={nd.t} shadow={120}>
            {nd.art}
          </Place>
        ))}
      </Stage>
      {nodes.map((nd, i) => {
        const s = squashPop(t, nd.t + 0.15, 40);
        return (
          <div key={i} style={{ position: "absolute", left: xs[i]! - 200, top: y + 170, width: 400, textAlign: "center", opacity: s.o }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, letterSpacing: "-0.03em", color: INK, lineHeight: 1, transform: `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`, transformOrigin: "50% 100%" }}>{nd.label}</div>
            {nd.sub && <div style={{ marginTop: 10, fontFamily: BODY, fontWeight: 500, fontSize: 32, color: INK }}>{nd.sub}</div>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- source sticker ----------
// A white product-label sticker (barcode, SOURCE, title, detail) slapped on at the bottom-left: rises with back-out and settles from -9° to -2°.
export const SourceSticker: FC<{ title: string; detail: string; at: number; x?: number; y?: number; out?: number }> = ({ title, detail, at, x = 96, y = 984, out }) => {
  const { t } = useTime();
  const p = pop(t, at, 0.5);
  const ex = out === undefined ? 0 : ease(t, out, 0.35, (v) => v * v * v);
  if (p <= 0) return null;
  const bars = Array.from({ length: 22 }, (_, i) => 2 + Math.floor(rnd(`bar${i}${title}`) * 4) * 2);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateY(${-100 + (1 - p) * 220 + ex * 260}%) rotate(${-2 - 7 * (1 - p)}deg)`, transformOrigin: "0 100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "stretch", gap: 28, background: WHITE, borderRadius: 18, padding: "24px 40px 24px 26px", boxShadow: "0 20px 50px rgba(17,17,17,0.18)" }}>
        <svg width={70} height={110} viewBox="0 0 70 110">
          {bars.reduce<{ x: number; el: ReactNode[] }>((acc, w, i) => {
            if (i % 2 === 0) acc.el.push(<rect key={i} x={acc.x} y={0} width={w * 0.7} height={110} fill={INK} />);
            return { x: acc.x + w * 0.85, el: acc.el };
          }, { x: 0, el: [] }).el}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: VIOLET, letterSpacing: "0.12em" }}>SOURCE</div>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 40, color: INK, lineHeight: 1.15 }}>{title}</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: GREY }}>{detail}</div>
        </div>
        <div style={{ position: "absolute", right: 0, top: 0, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 34px 34px 0", borderColor: `transparent ${YELLOW} #D8D6CF transparent`, borderTopRightRadius: 18 }} />
      </div>
    </div>
  );
};

// ---------- vertical section scroll ----------
// The page as a vertical stack of full-frame sections; at each cut the stack scrolls one frame-height up in 20 frames, the current section easing out (in-cubic) as the next rises from below.
export const PosterScroll: FC<{ sections: ReactNode[]; cuts: number[]; dur?: number }> = ({ sections, cuts, dur = 20 / 30 }) => {
  const { t } = useTime();
  const pos = cuts.reduce((s, c) => s + ease(t, c, dur, Easing.bezier(0.55, 0, 0.3, 1)), 0);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H * sections.length, transform: `translateY(${-pos * H}px)` }}>
        {sections.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: 0, top: i * H, width: W, height: H, overflow: "hidden", boxShadow: i > 0 ? "0 -30px 60px rgba(17,17,17,0.18)" : undefined }}>
            {s}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
