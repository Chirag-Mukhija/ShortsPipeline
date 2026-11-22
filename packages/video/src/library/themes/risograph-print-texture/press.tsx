// The riso press: seeded noise, the ink/type/paper SVG filters, the plate timing (land, misregister, kick, halftone exit) and the SVG and HTML plates every piece prints with.
import { useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { W, H } from "../../core/video";
import { clamp01 } from "../../core/time";
import { PRESS, SCREEN_ANGLE } from "./theme";

// ---------- seeded noise ----------
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const rng = (seed: number) => {
  let a = Math.floor(seed * 9973) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Paper jitter: the sheet shifts up to 1 px every 3 frames, shared by every plate so the print moves as one.
export const paperJitter = (f: number): [number, number] => {
  const s = Math.floor(f / PRESS.jitterEvery);
  return [Math.round((hash(s) - 0.5) * 2), Math.round((hash(s + 91) - 0.5) * 2)];
};

// ---------- filters ----------
// Defined once per Stage/Page; duplicate ids across stages are identical for the same frame, so the first one wins harmlessly.
export const RisoDefs: FC = () => {
  const f = useCurrentFrame();
  const g = Math.floor(f / PRESS.grainEvery);
  const mottle = (id: string) => (
    <>
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={5} result={`${id}m`} />
      <feColorMatrix in={`${id}m`} type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.7 0 0 0 0.64" result={`${id}d`} />
    </>
  );
  return (
    <defs>
      {/* Solid ink: displaced rough edges, speckled grain that reseeds, and slow density mottling. */}
      <filter id="riso-ink" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={11} result="iw" />
        <feDisplacementMap in="SourceGraphic" in2="iw" scale={7} xChannelSelector="R" yChannelSelector="G" result="ir" />
        <feTurbulence type="fractalNoise" baseFrequency="0.77" numOctaves={2} seed={g} result="ig" />
        <feColorMatrix in="ig" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.2 0 0 0 2.5" result="is" />
        {mottle("i")}
        <feComposite in="is" in2="id" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="ia" />
        <feComposite in="ir" in2="ia" operator="in" />
      </filter>
      {/* Type: the same ink, gentler, so 36 px text keeps its shapes. */}
      <filter id="riso-type" x="-4%" y="-10%" width="108%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={1} seed={23} result="tw" />
        <feDisplacementMap in="SourceGraphic" in2="tw" scale={2.2} xChannelSelector="R" yChannelSelector="G" result="tr" />
        <feTurbulence type="fractalNoise" baseFrequency="0.83" numOctaves={2} seed={g + 400} result="tg" />
        <feColorMatrix in="tg" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.25" result="ts" />
        {mottle("t")}
        <feComposite in="ts" in2="td" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="ta" />
        <feComposite in="tr" in2="ta" operator="in" />
      </filter>
      {/* Stamp: heavier, blotchier coverage, like a rubber stamp short of ink. */}
      <filter id="riso-stamp" x="-8%" y="-12%" width="116%" height="124%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={31} result="sw" />
        <feDisplacementMap in="SourceGraphic" in2="sw" scale={5} xChannelSelector="R" yChannelSelector="G" result="sr" />
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={3} seed={g + 900} result="sg" />
        <feColorMatrix in="sg" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 2.95" result="ss" />
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={g + 77} result="sf" />
        <feColorMatrix in="sf" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 2.4" result="sp" />
        <feComposite in="ss" in2="sp" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="sa" />
        <feComposite in="sr" in2="sa" operator="in" />
      </filter>
    </defs>
  );
};

// ---------- plate timing ----------
export type Tex = "ink" | "type" | "stamp" | "none";
export type PlateCue = {
  // Seconds the plate prints.
  at: number;
  // Plate order: each later plate lands PRESS.plateGap frames after the one before (the print "ka-chunk").
  k?: number;
  // Resting misregistration in px for plates after the first.
  reg?: number;
  // Seconds where the misregistration kicks wide for emphasis, then settles.
  kick?: number | number[];
  // Seconds the plate screens out (halftone dots shrink to nothing over 12 f).
  out?: number;
  // Direction of the misregistration in degrees; defaults to a fixed angle per plate.
  dir?: number;
};

const DIRS = [-140, 35, 205, 300];

export const plateState = (f: number, fps: number, { at, k = 0, reg = PRESS.rest, kick, out, dir }: PlateCue) => {
  const df = f - (Math.round(at * fps) + k * PRESS.plateGap);
  if (df < 0) return null;
  const exit = out == null ? 0 : Easing.in(Easing.quad)(clamp01((f - Math.round(out * fps)) / PRESS.exit));
  if (exit >= 1) return null;
  const sp = spring({ frame: df, fps, config: { damping: 12 } });
  let mag = k === 0 ? PRESS.landOffset * 0.5 * (1 - sp) : reg + (PRESS.landOffset - reg) * (1 - sp);
  for (const c of kick == null ? [] : Array.isArray(kick) ? kick : [kick]) {
    const d = f - Math.round(c * fps);
    if (d < 0) continue;
    const env = d < 2 ? d / 2 : d < 6 ? 1 : Math.max(0, 1 - Easing.out(Easing.cubic)((d - 6) / 10));
    mag += PRESS.kick * env;
  }
  const a = ((dir ?? DIRS[k % DIRS.length]!) * Math.PI) / 180;
  const [jx, jy] = paperJitter(f);
  return { dx: Math.cos(a) * mag + jx, dy: Math.sin(a) * mag + jy, exit, df };
};

export const usePlate = (cue: PlateCue) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return plateState(f, fps, cue);
};

// ---------- staging ----------
// A zero-size SVG holding the filters, for HTML pages.
export const Defs: FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <RisoDefs />
  </svg>
);

// Full-canvas SVG in 1920×1080 coordinates.
export const Svg: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

// A page of print: the filters plus whatever plates (SVG via <Svg>, or HTML <Ink>) sit on it.
export const Page: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={style}>
    <Defs />
    {children}
  </AbsoluteFill>
);

// Shorthand: a page whose children are all SVG.
export const Stage: FC<{ children: ReactNode }> = ({ children }) => (
  <Page>
    <Svg>{children}</Svg>
  </Page>
);

const texUrl = (tex: Tex) => (tex === "none" ? undefined : `url(#riso-${tex})`);

// ---------- SVG plate ----------
// One pass of one spot ink: children inherit the ink as fill, the group multiplies onto everything printed before it.
export const Plate: FC<PlateCue & { ink: string; tex?: Tex; children: ReactNode; opacity?: number; cell?: number }> = ({ ink, tex = "ink", children, opacity = 1, cell = 14, ...cue }) => {
  const id = `p${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const s = usePlate(cue);
  if (!s) return null;
  const angle = SCREEN_ANGLE[ink] ?? 45;
  return (
    <g style={{ mixBlendMode: "multiply" }} opacity={opacity} mask={s.exit > 0 ? `url(#${id}m)` : undefined}>
      {s.exit > 0 && (
        <defs>
          <pattern id={`${id}d`} width={cell} height={cell} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
            <circle cx={cell / 2} cy={cell / 2} r={cell * 0.74 * (1 - s.exit)} fill="#fff" />
          </pattern>
          <mask id={`${id}m`} maskUnits="userSpaceOnUse" x={-W} y={-H} width={W * 3} height={H * 3}>
            <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={`url(#${id}d)`} />
          </mask>
        </defs>
      )}
      <g transform={`translate(${s.dx} ${s.dy})`} fill={ink} stroke="none" filter={texUrl(tex)} color={ink}>
        {children}
      </g>
    </g>
  );
};

// ---------- HTML plate ----------
// The same pass for HTML text and boxes: text takes the ink as its colour, boxes use background: currentColor.
export const Ink: FC<PlateCue & { ink: string; tex?: Tex; style?: CSSProperties; children?: ReactNode; cell?: number }> = ({ ink, tex = "type", style, children, cell = 14, ...cue }) => {
  const s = usePlate(cue);
  if (!s) return null;
  const r = cell * 0.74 * (1 - s.exit);
  const mask = s.exit > 0 ? { WebkitMaskImage: `radial-gradient(circle, #000 ${r}px, transparent ${r + 0.8}px)`, WebkitMaskSize: `${cell}px ${cell}px` } : {};
  return (
    <div
      style={{
        position: "absolute",
        color: ink,
        mixBlendMode: "multiply",
        filter: texUrl(tex),
        translate: `${s.dx}px ${s.dy}px`,
        ...mask,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ---------- rough geometry ----------
export type Pt = [number, number];
export const pathD = (pts: Pt[], close = true) => {
  if (pts.length < 2) return "";
  // Catmull-Rom through the points so blobs stay soft.
  const n = pts.length;
  const at = (i: number) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]!;
  let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return close ? `${d}Z` : d;
};

// An organic blob: an ellipse whose radius wobbles by `wob` (0–1) with a few seeded lobes.
export const blobD = (cx: number, cy: number, rx: number, ry: number, seed = 1, wob = 0.12, n = 18) => {
  const r = rng(seed);
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wob * (0.55 * Math.sin(a * 2 + ph[0]!) + 0.3 * Math.sin(a * 3 + ph[1]!) + 0.15 * Math.sin(a * 5 + ph[2]!));
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  return pathD(pts);
};

// A hand-cut rectangle: straight-ish edges with a little seeded wander, corners kept sharp.
export const roughRectD = (x: number, y: number, w: number, h: number, seed = 1, amp = 3) => {
  const r = rng(seed);
  const j = () => (r() - 0.5) * 2 * amp;
  const c: Pt[] = [[x + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + h + j()], [x + j(), y + h + j()]];
  return `M${c.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")} Z`;
};
