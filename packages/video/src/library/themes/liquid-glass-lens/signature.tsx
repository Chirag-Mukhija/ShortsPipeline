// Moments only liquid glass does: the tab droplet that lenses its label, a scripted button press, a magnifier sweeping a page, droplets carrying a flow, drops merging into one, and the lens wipe.
import type { FC, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { Behind, Glass, SMOKE } from "./glass";
import { condense, glintAt, press, slide, squash } from "./moves";
import { PlateSvg, type Mood } from "./plate";
import { INK, LIME, SANS, SOFT, sp } from "./theme";
import { GlassPill, kicker, label, textW } from "./pieces";

// ---------- GlassTabBar ----------
export const GlassTabBar: FC<{ tabs: string[]; activeAt: [number, number][]; at: number; y?: number; caption?: string }> = ({ tabs, activeAt, at, y = 600, caption }) => {
  const { t } = useTime();
  const tw = 250, h = 132;
  const w = tw * tabs.length + 40;
  const x0 = 960 - w / 2 + 20 + tw / 2;
  const c = condense(t, at);
  const keys: [number, number][] = activeAt.map(([k, i]) => [k, x0 + i * tw]);
  const s = slide(t, keys);
  const live = activeAt.reduce((k, [tk, i]) => (t >= tk ? i : k), activeAt[0]?.[1] ?? 0);
  const lx0 = Math.min(s.lead, s.trail), lx1 = Math.max(s.lead, s.trail);
  const dw = tw - 24 + (lx1 - lx0);
  const dh = (h - 30) * Math.sqrt((tw - 24) / dw);
  const labels = (lime: boolean) => (
    <g>
      {tabs.map((tb, i) => (
        <text key={i} x={x0 + i * tw} y={y + 15} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={40} fill={lime && i === live ? LIME : INK} stroke="rgba(6,24,10,0.45)" strokeWidth={5} paintOrder="stroke">
          {tb}
        </text>
      ))}
    </g>
  );
  const moving = clamp01((lx1 - lx0) / 60);
  return (
    <>
      {t >= at ? <Glass shape={{ blobs: [{ x: 960, y, w, h }] }} {...c} tint={SMOKE} bevel={40} /> : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: c.content }}>{labels(false)}</svg>
      <Behind svg={null}>
        {t >= at + 0.3 ? (
          <Glass
            shape={{ blobs: [{ x: (lx0 + lx1) / 2, y, w: dw, h: dh }] }} mode="dome" zoom={1.32} under={labels(true)} res={0.5} margin={40}
            {...condense(t, at + 0.3)} tint={[10, 28, 14, 0.3]} bevel={34} wobble={moving * 0.2} glow={0.5} shadow={0.16}
          />
        ) : null}
      </Behind>
      {caption ? <div style={{ position: "absolute", left: 0, right: 0, top: y + 130, textAlign: "center", ...kicker(28, SOFT), opacity: c.content }}>{caption}</div> : null}
    </>
  );
};

// ---------- GlassButtonPress: a scripted cursor hovers, presses and releases a glass button ----------
const Cursor: FC<{ x: number; y: number; down: number }> = ({ x, y, down }) => (
  <svg width={80} height={80} style={{ position: "absolute", left: x - 8, top: y - 6, transform: `scale(${1 - 0.12 * down})`, transformOrigin: "8px 6px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))" }}>
    <path d="M8 6 L8 58 L22 45 L32 68 L42 63 L32 41 L52 41 Z" fill="#fff" stroke="#111" strokeWidth={3} strokeLinejoin="round" />
  </svg>
);

export const GlassButtonPress: FC<{ text: string; at: number; pressAt: number[]; x?: number; y?: number; done?: string }> = ({ text, at, pressAt, x = 960, y = 540, done }) => {
  const { t } = useTime();
  const c = condense(t, at);
  const w = textW(text, 56) + 200, h = 150;
  const pr = pressAt.map((p) => press(t, p)).reduce((m, p) => (p.p > m.p ? p : m), press(t, -99));
  const first = pressAt[0] ?? at + 1;
  // Cursor path: glides in from the lower right, settles on the button just before the first press.
  const e = ramp(t, first - 1.1, 0.95, INOUT);
  const cx = interpolate(e, [0, 1], [1560, x + 40]), cy = interpolate(e, [0, 1], [900, y + 10]);
  const hover = ramp(t, first - 0.25, 0.2);
  const ok = done ? ramp(t, (pressAt[pressAt.length - 1] ?? first) + 0.25, 0.35) : 0;
  return (
    <>
      {t >= at ? (
        <Glass
          shape={{ blobs: [{ x, y: y + pr.sink, w: w * (1 + 0.02 * pr.p), h: h * pr.squash }] }} {...c} bevel={pr.bevel} shadow={c.shadow * pr.shadow / 0.25}
          tint={[228, 255, 138, 0.06 + 0.12 * ok]} glow={hover * 0.8 + pr.p} wobble={c.wobble + pr.p * 0.5} glint={glintAt(t, [first + 0.1])}
        >
          <span style={{ ...label(56, 700, ok > 0.5 ? LIME : INK), opacity: c.content }}>{ok > 0.5 && done ? done : text}</span>
        </Glass>
      ) : null}
      {t >= first - 1.1 ? <Cursor x={cx} y={cy + pr.sink} down={pr.p} /> : null}
    </>
  );
};

// ---------- LensSweep: a dome magnifier drifts across a page of text ----------
export const LensSweep: FC<{ lines: string[]; at: number; path: { t: number; x: number; y: number }[]; zoom?: number; r?: number }> = ({ lines, at, path, zoom = 1.75, r = 120 }) => {
  const { t } = useTime();
  const top = 330, lh = 84, left = 380;
  const pw = 1180, ph = lines.length * lh + 120;
  let px = path[0]?.x ?? 960, py = path[0]?.y ?? 540;
  for (const k of path.slice(1)) {
    const e = ramp(t, k.t - 0.9, 0.9, INOUT);
    px += (k.x - px) * e;
    py += (k.y - py) * e;
  }
  const page = (
    <g opacity={ramp(t, at - 0.4, 0.4)}>
      <rect x={left - 60} y={top - 70} width={pw} height={ph} rx={44} fill="rgba(6,20,10,0.55)" />
      {lines.map((l, i) => (
        <text key={i} x={left} y={top + i * lh + 30} fontFamily={SANS} fontSize={46} fontWeight={500} fill={INK}>{l}</text>
      ))}
    </g>
  );
  const c = condense(t, at);
  return (
    <Behind svg={page}>
      {t >= at ? <Glass shape={{ blobs: [{ x: px, y: py, w: r * 2, h: r * 2 }] }} mode="dome" zoom={zoom} {...c} tint={[255, 255, 255, 0.04]} bevel={40} margin={60} /> : null}
    </Behind>
  );
};

// ---------- DropletFlow: nodes on a line; a droplet carries the signal and melts into each node it reaches ----------
export const DropletFlow: FC<{ nodes: string[]; at: number; hop?: number; y?: number; title?: string }> = ({ nodes, at, hop = 0.9, y = 560, title }) => {
  const { t } = useTime();
  const n = nodes.length;
  const span = 1500;
  const xs = nodes.map((_, i) => 960 - span / 2 + (i * span) / (n - 1));
  const nw = nodes.map((s) => Math.max(textW(s, 44) + 110, 240));
  const nh = 140;
  const startT = at + 0.3 * n;
  // Droplet position along the nodes: an eased glide per hop.
  const pos = Math.min(n - 1, Math.max(0, (t - startT) / hop));
  const li = Math.min(n - 2, Math.floor(pos));
  const e = Easing.inOut(Easing.cubic)(clamp01(pos - li));
  const dx = xs[li]! + (xs[li + 1]! - xs[li]!) * e;
  const reached = t < startT ? -1 : Math.floor(pos + 0.02);
  const dropR = 34 + 6 * Math.sin(e * Math.PI);
  const drop = { x: dx, y, w: dropR * 2 * (1 + 0.35 * Math.sin(e * Math.PI)), h: dropR * 2 * (1 - 0.15 * Math.sin(e * Math.PI)) };
  // The droplet joins the shape of whichever node it is touching, so the smooth-min melts them together.
  const near = xs.findIndex((x, i) => Math.abs(x - dx) < nw[i]! / 2 + dropR + 50);
  const wire = (
    <g opacity={ramp(t, at, 0.5)}>
      <line x1={xs[0]} y1={y} x2={xs[n - 1]} y2={y} stroke="rgba(255,255,255,0.75)" strokeWidth={6} strokeDasharray="2 16" strokeLinecap="round" />
    </g>
  );
  return (
    <Behind svg={wire}>
      {title ? <GlassPill x={960} y={y - 230} text={title} at={at - 0.3} size={44} /> : null}
      {nodes.map((s, i) => {
        const na = at + 0.3 * i;
        if (t < na) return null;
        const c = condense(t, na);
        const sq = squash(t, startT + (i - 1) * hop + hop * 0.98, 0.09);
        const on = i === near && t >= startT;
        const blob = { x: xs[i]!, y, w: nw[i]! * (i > 0 ? sq.sx : 1), h: nh * (i > 0 ? sq.sy : 1) };
        const lit = i <= reached ? 1 : 0;
        return (
          <Glass key={i} shape={{ blobs: on ? [blob, drop] : [blob], k: 46 }} box={blob} {...c} tint={SMOKE} bevel={36} res={on ? 0.5 : 1} glow={lit * 0.5}>
            <span style={{ ...label(44, 700, lit ? LIME : INK), opacity: c.content }}>{s}</span>
          </Glass>
        );
      })}
      {near < 0 && t >= startT ? <Glass shape={{ blobs: [drop] }} mode="dome" zoom={1.4} tint={[228, 255, 138, 0.12]} bevel={26} res={0.5} margin={36} shadow={0.18} /> : null}
    </Behind>
  );
};

// ---------- MergeDrops: scattered droplets drift together and fuse into one pill that names the idea ----------
export const MergeDrops: FC<{ text: string; at: number; mergeAt: number; y?: number; drops?: { x: number; y: number; r: number }[] }> = ({ text, at, mergeAt, y = 540, drops }) => {
  const { t } = useTime();
  const ds = drops ?? [
    { x: 520, y: 330, r: 78 },
    { x: 1420, y: 300, r: 96 },
    { x: 760, y: 820, r: 64 },
    { x: 1260, y: 800, r: 70 },
  ];
  const pw = textW(text, 72) + 200, ph = 180;
  const m = sp(t, mergeAt, { stiffness: 38, damping: 10 });
  const g = sp(t, mergeAt + 0.95, { stiffness: 140, damping: 12 });
  const blobs = ds.map((d, i) => {
    const c = condense(t, at + i * 0.15);
    const bob = Math.sin(t * 1.4 + i * 1.9) * 10 * (1 - clamp01(m));
    const k = clamp01(m);
    const tx = 960 + (i - (ds.length - 1) / 2) * (pw / ds.length) * 0.6;
    const r = d.r * c.scale * (1 - 0.2 * k);
    return { x: d.x + (tx - d.x) * m, y: d.y + bob + (y - d.y) * m, w: r * 2, h: r * 2 };
  });
  const pill = { x: 960, y, w: Math.max(1, pw * g), h: Math.max(1, ph * clamp01(g * 1.4)) };
  const shrink = 1 - clamp01(g);
  const parts = g > 0.02 ? [...blobs.map((b) => ({ ...b, w: b.w * shrink, h: b.h * shrink })), pill] : blobs;
  const content = ramp(t, mergeAt + 1.3, 0.35);
  const sq = squash(t, mergeAt + 1.2, 0.06);
  return t >= at ? (
    <Glass
      shape={{ blobs: parts.map((p) => (p === pill ? { ...p, w: p.w * sq.sx, h: p.h * sq.sy } : p)), k: 64 }} box={pill} tint={SMOKE} bevel={40} res={0.75}
      wobble={0.2 + 0.5 * Math.min(1, Math.abs(1 - m))} refraction={0.69 * clamp01((t - at) / 0.4)} glint={glintAt(t, [mergeAt + 1.6])}
    >
      <span style={{ ...label(72, 700), opacity: content, transform: `scale(${0.9 + 0.1 * content})` }}>{text}</span>
    </Glass>
  ) : null;
};

// ---------- LensWipe: the next scene arrives through a lens that grows to fill the frame ----------
export const LensWipe: FC<{ at: number; dur?: number; to?: Mood; toLayer?: ReactNode; from?: ReactNode; x?: number; y?: number; caption?: string }> = ({ at, dur = 1.1, to = "dusk", toLayer, from, x = 960, y = 540, caption }) => {
  const { t } = useTime();
  const p = ramp(t, at, dur, Easing.inOut(Easing.cubic));
  const R = 220;
  const reach = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 80;
  const scale = 0.08 + (reach / R - 0.08) * p;
  const next = (
    <>
      <PlateSvg mood={to} />
      {toLayer}
    </>
  );
  const done = p >= 1;
  const pop = ramp(t, at + dur, 0.25);
  return (
    <>
      {from}
      {t >= at && !done ? (
        <Glass shape={{ blobs: [{ x, y, w: R * 2, h: R * 2 }] }} see={next} mode="dome" zoom={1.25} scale={scale} refraction={0.69 * (1 - pop)} tint={[255, 255, 255, 0.03]} bevel={70} margin={30} shadow={0.3} wobble={0.25 * (1 - p)} />
      ) : null}
      {done ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>{next}</svg>
      ) : null}
      {caption ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", ...label(44, 600), opacity: ramp(t, at + dur * 0.8, 0.4) }}>
          {caption}
        </div>
      ) : null}
    </>
  );
};

