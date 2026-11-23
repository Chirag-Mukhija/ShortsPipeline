// Parts combine: two to four labelled parts drive in one by one, each transforms from a travel capsule into its piece of a ring, then on a spoken word they fly together and lock into one emblem whose name lands below.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const partSchema = z.object({
  label: z.string().min(1).max(18).describe("The part's name, 1–3 words, ≤ 18 characters (e.g. 'Early bedtime')"),
  word: z.string().optional().describe("Spoken word this part drives in on"),
});

const schema = z.object({
  parts: z.array(partSchema).min(2).max(4).describe("2–4 parts in spoken order; each arrives, transforms into its piece, and ends labelled around the emblem. Give each ~1 s or more"),
  combineWord: z.string().optional().describe("Spoken word the parts fly together and lock on ('together', 'combine', 'add')"),
  name: z.string().min(1).max(28).describe("What the parts make together, landed under the emblem, ≤ 28 characters (e.g. 'A morning that runs itself')"),
  nameWord: z.string().optional().describe("Spoken word the name lands on; default just after the lock"),
  core: z.string().max(3).optional().describe("1–3 characters stamped in the emblem's centre on the lock (e.g. 'AM', '1', '+'); leave empty for a plain core"),
});

type Props = z.infer<typeof schema>;
type Pt = { x: number; y: number };

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1]!, 16);
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const onColor = (fill: string, s: Style) => (contrast(fill, s.bg) >= contrast(fill, s.ink) ? s.bg : s.ink);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const range = (t: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) => (b <= a ? (t >= b ? 1 : 0) : interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));
const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const bbox = (pts: Pt[]) => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
const pathOf = (pts: Pt[]) => `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")} Z`;

// Both shapes are sampled side by side with the same point counts (top ↔ outer arc, right ↔ end edge, bottom ↔ inner arc, left ↔ start edge), so the capsule unfolds into its piece without the outline crossing itself.
const SA = 40;
const SB = 12;
const rectPts = (w: number, h: number): Pt[] => {
  const pts: Pt[] = [];
  const side = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let k = 0; k < n; k++) pts.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n });
  };
  side(-w / 2, -h / 2, w / 2, -h / 2, SA);
  side(w / 2, -h / 2, w / 2, h / 2, SB);
  side(w / 2, h / 2, -w / 2, h / 2, SA);
  side(-w / 2, h / 2, -w / 2, -h / 2, SB);
  return pts;
};
// One ring piece pointing up, its straight edges pulled in by `h` so neighbours leave an even seam.
const sectorPts = (R: number, r: number, span: number, h: number): Pt[] => {
  const a0 = -Math.PI / 2 - span / 2;
  const a1 = -Math.PI / 2 + span / 2;
  const at = (rho: number, a: number) => ({ x: Math.cos(a) * rho, y: Math.sin(a) * rho });
  const pts: Pt[] = [];
  const [o0, o1] = [a0 + Math.asin(h / R), a1 - Math.asin(h / R)];
  for (let k = 0; k < SA; k++) pts.push(at(R, o0 + ((o1 - o0) * k) / SA));
  for (let k = 0; k < SB; k++) {
    const rho = R + ((r - R) * k) / SB;
    pts.push(at(rho, a1 - Math.asin(h / rho)));
  }
  const [i1, i0] = [a1 - Math.asin(h / r), a0 + Math.asin(h / r)];
  for (let k = 0; k < SA; k++) pts.push(at(r, i1 + ((i0 - i1) * k) / SA));
  for (let k = 0; k < SB; k++) {
    const rho = r + ((R - r) * k) / SB;
    pts.push(at(rho, a0 + Math.asin(h / rho)));
  }
  return pts;
};

// Arrival: springs on "snappy", eases out (with a little overshoot on "hand") otherwise.
const arrive = (style: Style, frame: number, fps: number, at: number, seconds: number) =>
  style.motion === "snappy"
    ? spring({ frame: frame - at * fps, fps, config: { damping: 13, stiffness: 120, mass: 0.9 }, durationInFrames: Math.round(seconds * fps) })
    : interpolate(frame, [at * fps, (at + seconds) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: style.motion === "hand" ? Easing.out(Easing.back(1.5)) : Easing.out(Easing.quad) });

const PartsCombine: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const u = H / 1080;
  const split = W < 1400;
  const hand = style.motion === "hand";
  const light = lum(style.bg) > 0.5;
  const k = hand ? 0.47 : 0.56;
  const zf = hand ? 1.15 : 1;
  const parts = props.parts;
  const N = parts.length;

  // ---- Timing: one arrival per part (each needs ~1.1 s to land and transform), the lock on the combine word, labels and name after; settled 0.6 s before the end.
  const FIRST = 0.3;
  const cMin = FIRST + (N - 1) * 0.5 + 1.35;
  const C = Math.max(cMin, Math.min(duration - 2.6, cueAt(cues, props.combineWord, duration * 0.52) - 0.12));
  const lastA = C - 1.35;
  const A: number[] = [];
  parts.forEach((p, i) => {
    const fb = FIRST + (i * (lastA - FIRST)) / Math.max(1, N - 1);
    const want = cueAt(cues, p.word, fb + 0.12) - 0.12;
    const lo = i === 0 ? 0.05 : A[i - 1]! + 0.5;
    const hi = lastA - (N - 1 - i) * 0.5;
    A.push(Math.max(lo, Math.min(hi, want)));
  });
  const LOCK = C + 0.05 * (N - 1) + 0.55;
  const nameAt = Math.min(duration - 1.4, Math.max(LOCK + 0.45, cueAt(cues, props.nameWord, LOCK + 0.6) - 0.12));

  // ---- The emblem: a ring cut into N pieces, read left to right / clockwise.
  const E = { x: W / 2, y: H * (split ? 0.42 : 0.45) };
  const R = (split ? 200 : 270) * u;
  const r = R * 0.46;
  const cr = hand ? 0 : Math.max(2, Math.min(style.radius, 14) * 0.6) * u;
  const gapPx = 2 * cr + 8 * u;
  const span = (Math.PI * 2) / N;
  const base = N === 2 ? Math.PI : N === 3 ? (5 * Math.PI) / 6 : (-3 * Math.PI) / 4;
  const sec = sectorPts(R - cr, r + cr, span, gapPx / 2);
  const sb = bbox(sec);
  const local = sec.map((p) => ({ x: p.x - sb.cx, y: p.y - sb.cy }));
  const fills = [style.accent, style.accent2, mix(style.accent, 50, style.accent2), mix(style.ink, 78, style.surface)];

  // ---- Staging: one slot per part (a row in full frame, two columns in a split panel), label underneath.
  const labFs = (split ? 34 : 40) * u * zf;
  const margin = (split ? 60 : 120) * u;
  const cols = split ? Math.min(N, 2) : N;
  const rows = Math.ceil(N / cols);
  const areaTop = H * (rows > 1 ? 0.1 : 0.2);
  const areaBot = H * (rows > 1 ? 0.86 : 0.8);
  const slotW = (W - 2 * margin) / cols;
  const slotH = (areaBot - areaTop) / rows;
  const labRoom = labFs * 1.3 + 36 * u;

  const P = parts.map((p, i) => {
    const mid = base + i * span;
    const dir = { x: Math.cos(mid), y: Math.sin(mid) };
    const phi = wrapPi(mid + Math.PI / 2);
    const rb = bbox(local.map((q) => rot(q, phi)));
    return { ...p, i, mid, dir, phi, rb, fill: fills[i % fills.length]! };
  });
  const sStage = Math.min(split ? 0.66 : 0.8,...P.map((p) => Math.min((slotW * 0.8) / p.rb.w, ((slotH - labRoom) * 0.82) / p.rb.h)));
  const stageHalfH = Math.max(...P.map((p) => p.rb.h / 2)) * sStage;
  const slots = P.map((p) => {
    const row = Math.floor(p.i / cols);
    const inRow = row === rows - 1 ? N - row * cols : cols;
    const col = p.i - row * cols;
    return { x: W / 2 + (col - (inRow - 1) / 2) * slotW, y: rows === 1 ? E.y - labRoom * 0.3 : areaTop + (row + 0.5) * slotH - labRoom / 2 };
  });

  // Travel capsule sized to its label (two lines when the slot is narrow).
  const capFs = (split ? 34 : 40) * u * zf;
  const capPad = 40 * u;
  const capMaxW = Math.min(slotW * 0.9, 520 * u);
  const caps = P.map((p) => {
    const tw = p.label.length * capFs * k;
    const lines = tw > capMaxW - 2 * capPad ? 2 : 1;
    const w = lines === 2 ? capMaxW : Math.max(220 * u, tw + 2 * capPad);
    const h = Math.max(100 * u, lines * capFs * 1.12 + 46 * u);
    return { w, h, lines, pts: rectPts(w - 2 * cr, h - 2 * cr) };
  });

  // ---- Final labels around the ring, anchored on the side they sit.
  const labR = R + 60 * u;
  const labs = P.map((p) => {
    const x = E.x + p.dir.x * labR;
    const y = E.y + p.dir.y * labR;
    const ax = p.dir.x > 0.3 ? 0 : p.dir.x < -0.3 ? -100 : -50;
    const ay = p.dir.y < -0.3 ? -100 : p.dir.y > 0.3 ? 0 : -50;
    const maxW = ax === 0 ? W - margin * 0.7 - x : ax === -100 ? x - margin * 0.7 : 2 * Math.min(x, W - x) - margin;
    const lines = Math.min(2, Math.ceil((p.label.length * labFs * k) / maxW));
    const h = lines * labFs * 1.18;
    const bottom = ay === 0 ? y + h : ay === -50 ? y + h / 2 : y;
    return { x, y, ax, ay, maxW, bottom };
  });

  // ---- Name under the emblem (HUD, never zooms).
  const nameFs = Math.min((split ? 64 : 86) * u * zf, (W - 2 * margin) / Math.max(1, props.name.length * k));
  const nameTop = Math.max(E.y + R + (split ? 84 : 96) * u, Math.max(...labs.map((l) => l.bottom)) + 36 * u);

  // ---- Camera: push in while the parts fly, a small kick on the lock, then pull back before the labels arrive (every push has a back).
  const kick = t >= LOCK ? 0.03 * (1 - range(t, LOCK, LOCK + 0.6, Easing.out(Easing.cubic))) : 0;
  const cam = 1 + 0.07 * range(t, C - 0.3, LOCK, Easing.inOut(Easing.sin)) - 0.07 * range(t, LOCK + 0.1, LOCK + 1.0, Easing.out(Easing.cubic)) + kick;

  const shadowA = light ? 0.18 : 0.5;
  const locked = t >= LOCK;
  const flash = locked ? 1 - range(t, LOCK, LOCK + 0.45, Easing.out(Easing.quad)) : 0;
  const burst = (t - LOCK) / 0.65;
  const coreR = r - gapPx;
  const coreIn = enter(style, frame, fps, LOCK - 0.04, 0.5);
  const coreFill = mix(style.accent, 100 * (1 - range(t, LOCK + 0.1, LOCK + 0.7)), style.surface);
  const coreText = props.core ?? "";
  const coreFs = Math.min(coreR * 0.95, (coreR * 1.5) / Math.max(1, coreText.length * 0.62)) * (hand ? 1.15 : 1);
  const coreTxt = enter(style, frame, fps, LOCK + 0.18, 0.55);
  const sheen = range(t, LOCK + 0.15, LOCK + 0.85, Easing.inOut(Easing.sin));
  const halo = range(t, LOCK + 0.35, LOCK + 1.1, Easing.out(Easing.cubic));
  const words = props.name.split(" ");

  const states = P.map((p, i) => {
    const c = caps[i]!;
    const slot = slots[i]!;
    const a = arrive(style, frame, fps, A[i]!, 0.7);
    const M = A[i]! + 0.5;
    const m = range(t, M, M + 0.6, Easing.inOut(Easing.cubic));
    const squeeze = 1 - 0.07 * range(t, M - 0.16, M, Easing.out(Easing.quad)) * (1 - range(t, M, M + 0.3, Easing.out(Easing.quad)));
    const fStart = C + 0.05 * i;
    const f = range(t, fStart, fStart + 0.55, Easing.inOut(Easing.cubic));
    const ant = range(t, C - 0.3, C, Easing.out(Easing.cubic)) * (1 - f);
    const clunk = 18 * u * f * (1 - range(t, fStart + 0.43, fStart + 0.75, Easing.out(Easing.back(3))));
    const far = Math.max(W, H) * 1.15;
    const stage = { x: slot.x - p.rb.cx * sStage * m + p.dir.x * far * (1 - a), y: slot.y - p.rb.cy * sStage * m + p.dir.y * far * (1 - a) };
    const fin = { x: E.x + rot({ x: sb.cx, y: sb.cy }, p.phi).x, y: E.y + rot({ x: sb.cx, y: sb.cy }, p.phi).y };
    const dx = fin.x - stage.x;
    const dy = fin.y - stage.y;
    const dl = Math.hypot(dx, dy) || 1;
    const away = { x: stage.x - E.x, y: stage.y - E.y };
    const al = Math.hypot(away.x, away.y) || 1;
    const arc = Math.sin(Math.PI * f) * 60 * u * (i % 2 ? 1 : -1);
    const x = stage.x + dx * f + (-dy / dl) * arc + (away.x / al) * 26 * u * ant + p.dir.x * clunk;
    const y = stage.y + dy * f + (dx / dl) * arc + (away.y / al) * 26 * u * ant + p.dir.y * clunk;
    const sc = sStage + (1 - sStage) * f;
    const pts = c.pts.map((q, j) => ({ x: q.x * (1 - m) + local[j]!.x * sc * m, y: q.y * (1 - m) + local[j]!.y * sc * m }));
    const deg = (p.phi * m * 180) / Math.PI;
    const scale = squeeze * (1 - 0.04 * ant);
    const tf = `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(3)}) scale(${scale.toFixed(4)})`;
    return { a, m, M, f, x, y, pts, tf, visible: t >= A[i]! - 0.02 };
  });

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: a soft pool of light, a faint dot grid like an assembly bay floor, and two colour blooms that wake on the lock (their trigger). */}
      <AbsoluteFill style={{ background: `radial-gradient(70% 80% at 50% 46%, ${style.surface} 0%, transparent 72%)`, opacity: light ? 0.95 : 0.6 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${mix(style.ink, light ? 13 : 16)} ${2 * u}px, transparent ${2.6 * u}px)`,
          backgroundSize: `${46 * u}px ${46 * u}px`,
          backgroundPosition: `${E.x}px ${E.y}px`,
          maskImage: "radial-gradient(ellipse at 50% 46%, black 18%, transparent 72%)",
        }}
      />
      {[0, 1].map((b) => (
        <div
          key={b}
          style={{
            position: "absolute",
            left: E.x - 560 * u + (b ? 300 : -300) * u + Math.sin(t * 0.5 + b * 2) * 46 * u,
            top: E.y - 560 * u + Math.cos(t * 0.4 + b) * 36 * u,
            width: 1120 * u,
            height: 1120 * u,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b ? style.accent2 : style.accent} 0%, transparent 62%)`,
            opacity: (light ? 0.06 : 0.08) + 0.09 * range(t, LOCK - 0.1, LOCK + 0.4) * (b ? 0.6 : 1),
          }}
        />
      ))}

      {/* Camera rig. */}
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${E.x}px ${E.y}px` }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <filter id="pc-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={14 * u} />
            </filter>
            <clipPath id="pc-disc">
              <circle cx={E.x} cy={E.y} r={R + 2 * u} />
            </clipPath>
          </defs>

          {/* Contact shadows under the parked parts, fading as they lift off. */}
          {!hand
            ? P.map((p, i) => {
                const s = states[i]!;
                if (!s.visible || s.f >= 1) return null;
                return <ellipse key={`sh${i}`} cx={slots[i]!.x} cy={slots[i]!.y + Math.max(caps[i]!.h / 2, stageHalfH) * (1 - s.m) + stageHalfH * s.m + 14 * u} rx={(caps[i]!.w / 2) * 0.9} ry={16 * u} fill={`rgba(0,0,0,${shadowA * 0.8})`} filter="url(#pc-soft)" opacity={clamp01(s.a) * (1 - s.f)} />;
              })
            : null}

          {/* Speed streaks behind each arriving capsule. */}
          {P.map((p, i) => {
            const s = states[i]!;
            if (!s.visible || s.a > 0.97) return null;
            const c = caps[i]!;
            const trail = Math.abs(p.dir.x) * (c.w / 2) + Math.abs(p.dir.y) * (c.h / 2);
            const len = 300 * u * (1 - clamp01(s.a));
            return [-0.28, 0, 0.28].map((o, j) => {
              const ox = -p.dir.y * o * c.h * (Math.abs(p.dir.x) > 0.5 ? 1 : c.w / c.h);
              const oy = p.dir.x * o * c.h;
              const x0 = s.x + p.dir.x * (trail + 16 * u) + ox;
              const y0 = s.y + p.dir.y * (trail + 16 * u) + oy;
              return <line key={`st${i}-${j}`} x1={x0} y1={y0} x2={x0 + p.dir.x * len * (j === 1 ? 1 : 0.7)} y2={y0 + p.dir.y * len * (j === 1 ? 1 : 0.7)} stroke={p.fill} strokeWidth={(j === 1 ? 7 : 4) * u} strokeLinecap="round" opacity={0.75 * (1 - clamp01(s.a))} />;
            });
          })}

          {/* The pieces. */}
          {P.map((p, i) => {
            const s = states[i]!;
            if (!s.visible) return null;
            const d = pathOf(s.pts);
            const tick = Math.floor(t * 8);
            const boil = hand ? pathOf(s.pts.map((q, j) => ({ x: q.x + (hash(j * 7.1 + tick * 13.7 + i * 31) - 0.5) * 3.2 * u, y: q.y + (hash(j * 3.3 + tick * 5.9 + i * 17 + 50) - 0.5) * 3.2 * u }))) : "";
            return (
              <g key={`p${i}`} transform={s.tf}>
                {!hand ? <path d={d} transform={`rotate(${((-p.phi * s.m * 180) / Math.PI).toFixed(3)}) translate(0 ${12 * u}) rotate(${((p.phi * s.m * 180) / Math.PI).toFixed(3)})`} fill={`rgba(0,0,0,${shadowA})`} stroke={`rgba(0,0,0,${shadowA})`} strokeWidth={2 * cr} strokeLinejoin="round" filter="url(#pc-soft)" /> : <path d={d} transform={`rotate(${((-p.phi * s.m * 180) / Math.PI).toFixed(3)}) translate(${7 * u} ${8 * u}) rotate(${((p.phi * s.m * 180) / Math.PI).toFixed(3)})`} fill={mix(style.ink, 85)} />}
                <path d={d} fill={p.fill} stroke={hand ? "none" : p.fill} strokeWidth={2 * cr} strokeLinejoin="round" />
                {/* A lighter top edge gives the flat piece some material. */}
                <path d={d} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={3 * u} strokeLinejoin="round" transform={`translate(0 ${-1.5 * u})`} opacity={hand ? 0 : 1} />
                {hand ? <path d={boil} fill="none" stroke={style.ink} strokeWidth={3.5 * u} strokeLinejoin="round" /> : null}
                {flash > 0 ? <path d={d} fill={`rgba(255,255,255,${0.55 * flash})`} stroke={`rgba(255,255,255,${0.55 * flash})`} strokeWidth={2 * cr} strokeLinejoin="round" /> : null}
              </g>
            );
          })}

          {locked ? (
            <g>
              {/* Core disc pops in the hole and cools from the accent to the surface. */}
              <circle cx={E.x} cy={E.y} r={Math.max(0, coreR * coreIn)} fill={coreFill} stroke={hand ? style.ink : mix(style.ink, light ? 10 : 18)} strokeWidth={(hand ? 3.5 : 2) * u} />
              {!coreText ? <circle cx={E.x} cy={E.y} r={Math.max(0, coreR * 0.42 * coreIn)} fill="none" stroke={style.accent} strokeWidth={6 * u} opacity={clamp01(coreTxt)} /> : null}
              {/* Seams glow for a beat. */}
              {P.map((p, i) => {
                const b = p.mid + span / 2;
                return <line key={`sm${i}`} x1={E.x + Math.cos(b) * (r - 6 * u)} y1={E.y + Math.sin(b) * (r - 6 * u)} x2={E.x + Math.cos(b) * (R + 6 * u)} y2={E.y + Math.sin(b) * (R + 6 * u)} stroke={style.ink} strokeWidth={4 * u} strokeLinecap="round" opacity={0.8 * flash} />;
              })}
              {/* A light sweep crosses the emblem once. */}
              {sheen > 0 && sheen < 1 ? (
                <g clipPath="url(#pc-disc)">
                  <rect x={E.x - 1.7 * R + 3.4 * R * sheen} y={E.y - 1.6 * R} width={0.5 * R} height={3.2 * R} fill="rgba(255,255,255,0.26)" transform={`rotate(24 ${E.x} ${E.y})`} />
                </g>
              ) : null}
              {/* Impact rings. */}
              {[0, 1].map((j) => {
                const e = (t - LOCK - j * 0.09) / 0.65;
                if (e < 0 || e > 1) return null;
                const ee = Easing.out(Easing.cubic)(e);
                return <circle key={`br${j}`} cx={E.x} cy={E.y} r={R + 12 * u + (190 + j * 70) * u * ee} fill="none" stroke={j ? style.accent2 : style.accent} strokeWidth={(9 - j * 3) * u * (1 - e)} opacity={1 - e} />;
              })}
              {burst >= 0 && burst <= 1
                ? Array.from({ length: 12 }, (_, j) => {
                    const ang = (j / 12) * Math.PI * 2 + hash(j + 5) * 0.3;
                    const e = Easing.out(Easing.cubic)(burst);
                    const r0 = R + 30 * u + 120 * u * e;
                    const r1 = r0 + 40 * u * (1 - burst);
                    return <line key={`bd${j}`} x1={E.x + Math.cos(ang) * r0} y1={E.y + Math.sin(ang) * r0} x2={E.x + Math.cos(ang) * r1} y2={E.y + Math.sin(ang) * r1} stroke={j % 3 ? style.accent : style.accent2} strokeWidth={5 * u} strokeLinecap="round" opacity={1 - burst} />;
                  })
                : null}
              {/* Halo ring that keeps turning slowly once the whole exists (the only motion left on the hold). */}
              <circle cx={E.x} cy={E.y} r={R + 18 * u} fill="none" stroke={mix(style.ink, light ? 28 : 34)} strokeWidth={2.5 * u} strokeDasharray={`${3 * u} ${15 * u}`} strokeLinecap="round" opacity={halo} transform={`rotate(${(t - LOCK) * 9} ${E.x} ${E.y})`} />
              {/* Label ticks in each piece's colour. */}
              {P.map((p, i) => {
                const g = range(t, LOCK + 0.25 + 0.08 * i, LOCK + 0.6 + 0.08 * i, Easing.out(Easing.cubic));
                const r0 = R + 30 * u;
                const r1 = r0 + 18 * u * g;
                return <line key={`tk${i}`} x1={E.x + p.dir.x * r0} y1={E.y + p.dir.y * r0} x2={E.x + p.dir.x * r1} y2={E.y + p.dir.y * r1} stroke={p.fill} strokeWidth={6 * u} strokeLinecap="round" opacity={g > 0.01 ? 1 : 0} />;
              })}
            </g>
          ) : null}
        </svg>

        {/* Capsule labels ride inside the capsules, then hand over to the labels under the parked pieces. */}
        {P.map((p, i) => {
          const s = states[i]!;
          if (!s.visible) return null;
          const c = caps[i]!;
          const inCap = clamp01(s.a * 3) * (1 - range(t, s.M, s.M + 0.2, Easing.in(Easing.quad)));
          const st = range(t, s.M + 0.35, s.M + 0.8, Easing.out(Easing.cubic)) * (1 - range(t, C - 0.25, C + 0.05, Easing.in(Easing.cubic)));
          return (
            <div key={`cl${i}`}>
              {inCap > 0.01 ? (
                <div style={{ position: "absolute", left: s.x - c.w / 2 + capPad, top: s.y - c.h / 2, width: c.w - 2 * capPad, height: c.h, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: inCap }}>
                  <span style={{ fontFamily: hand ? style.display : style.body, fontWeight: hand ? 700 : 600, fontSize: capFs, lineHeight: 1.12, color: onColor(p.fill, style), letterSpacing: hand ? 0 : "-0.01em", textWrap: "balance" }}>{p.label}</span>
                </div>
              ) : null}
              {st > 0.01 ? (
                <div style={{ position: "absolute", left: slots[i]!.x - slotW / 2 + 12 * u, width: slotW - 24 * u, top: slots[i]!.y + stageHalfH + 30 * u, textAlign: "center", opacity: st, transform: `translateY(${(1 - st) * 22 * u}px)` }}>
                  <span style={{ fontFamily: hand ? style.display : style.body, fontWeight: hand ? 700 : 600, fontSize: labFs, lineHeight: 1.18, color: style.ink, letterSpacing: hand ? 0 : "-0.01em", textWrap: "balance" }}>{p.label}</span>
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Core stamp. */}
        {locked && coreText ? (
          <div style={{ position: "absolute", left: E.x - coreR, top: E.y - coreR, width: coreR * 2, height: coreR * 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "50%" }}>
            <span style={{ fontFamily: style.display, fontWeight: 800, fontSize: coreFs, lineHeight: 1, color: style.ink, letterSpacing: hand ? 0 : "-0.03em", transform: `translateY(${(1 - Math.min(1, coreTxt)) * 120}%)`, display: "inline-block" }}>{coreText}</span>
          </div>
        ) : null}

        {/* Final labels slide outward from the ring, one by one. */}
        {locked
          ? P.map((p, i) => {
              const l = labs[i]!;
              const g = enter(style, frame, fps, LOCK + 0.3 + 0.08 * i, 0.6);
              const back = (1 - Math.min(1, g)) * 34 * u;
              return (
                <div key={`fl${i}`} style={{ position: "absolute", left: l.x - p.dir.x * back, top: l.y - p.dir.y * back, width: 0, height: 0, opacity: clamp01(g * 1.6) }}>
                  <div style={{ position: "absolute", left: 0, top: 0, width: l.maxW, transform: `translate(${l.ax === 0 ? 0 : l.ax === -100 ? -l.maxW : -l.maxW / 2}px, ${l.ay}%)`, textAlign: l.ax === 0 ? "left" : l.ax === -100 ? "right" : "center" }}>
                    <span style={{ fontFamily: hand ? style.display : style.body, fontWeight: hand ? 700 : 600, fontSize: labFs, lineHeight: 1.18, color: style.ink, letterSpacing: hand ? 0 : "-0.01em", textWrap: "balance" }}>{p.label}</span>
                  </div>
                </div>
              );
            })
          : null}
      </AbsoluteFill>

      {/* HUD: the name lands word by word under the finished emblem. */}
      <div style={{ position: "absolute", left: margin * 0.5, right: margin * 0.5, top: nameTop, display: "flex", justifyContent: "center" }}>
        <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: nameFs, lineHeight: 1.1, color: style.ink, letterSpacing: hand ? 0 : "-0.025em", whiteSpace: "nowrap" }}>
          {words.map((w, j) => {
            const a = enter(style, frame, fps, nameAt + j * 0.08, 0.7);
            return (
              <span key={j} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.16em 0.08em 0.14em", margin: `-0.16em ${j < words.length - 1 ? 0.2 : -0.08}em -0.14em -0.08em` }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - Math.min(1, a)) * 108}%)` }}>{w}</span>
              </span>
            );
          })}
        </div>
      </div>

      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${light ? 0.12 : 0.42}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "parts-combine",
  title: "Parts combine",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Showing that separate pieces make one whole: 2–4 labelled parts drive in one by one on their words as capsules, each unfolds into its piece of a ring, then on the combine word they fly together and lock into one emblem with an impact, the labels settle around it and the name of the whole lands below. Good for 'these three habits together make…', ingredients of a dish or a skill, the roles in a team, a method built from steps that only work combined, 'put it all together' moments and music-only build-ups to a peak. As a split panel it sits beside face cam. No media.",
  avoid:
    "Parts that happen in order (use flow-diagram or timeline-path), a list to walk through at length (list-tick), more than 4 parts, segments under ~6 s (each part needs ~1 s before the lock), using it twice in a video, and logos or real brand marks on the emblem (it is abstract on purpose).",
  schema,
  example: {
    parts: [
      { label: "Early bedtime", word: "bed" },
      { label: "Ten-minute walk", word: "walk" },
      { label: "Real breakfast", word: "breakfast" },
    ],
    combineWord: "together",
    name: "A morning that runs itself",
    nameWord: "morning",
    core: "AM",
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.25, end: 0.5, word: "first" },
    { at: 0.55, end: 0.7, word: "an" },
    { at: 0.7, end: 0.95, word: "early" },
    { at: 0.95, end: 1.3, word: "bed" },
    { at: 1.7, end: 1.9, word: "then" },
    { at: 1.9, end: 2.0, word: "a" },
    { at: 2.0, end: 2.3, word: "ten" },
    { at: 2.3, end: 2.55, word: "minute" },
    { at: 2.55, end: 2.9, word: "walk" },
    { at: 3.1, end: 3.25, word: "and" },
    { at: 3.25, end: 3.35, word: "a" },
    { at: 3.35, end: 3.6, word: "real" },
    { at: 3.6, end: 4.05, word: "breakfast" },
    { at: 4.5, end: 4.7, word: "put" },
    { at: 4.7, end: 4.85, word: "them" },
    { at: 4.85, end: 5.3, word: "together" },
    { at: 5.6, end: 5.75, word: "and" },
    { at: 5.75, end: 5.85, word: "you" },
    { at: 5.85, end: 6.05, word: "get" },
    { at: 6.05, end: 6.15, word: "a" },
    { at: 6.15, end: 6.6, word: "morning" },
    { at: 6.6, end: 6.8, word: "that" },
    { at: 6.8, end: 7.0, word: "runs" },
    { at: 7.0, end: 7.4, word: "itself" },
  ],
  seconds: { min: 6, max: 14, demo: 9 },
  mediaSlots: 0,
  credit: { name: "'Anime robot combining sequence' (prompt-motion.com)", url: "https://prompt-motion.com/allforbigfire-86ff3c" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <PartsCombine props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
