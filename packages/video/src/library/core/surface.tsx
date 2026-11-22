// Theme-free surfaces: layered background recipes that live slowly from palette colours, life layers (grain, vignette, light leak, light sweep, particles) and a text-pocket helper for contrast.
import { createContext, useContext, useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, interpolateColors, random } from "remotion";
import { noise2D } from "@remotion/noise";
import { clamp01, useTime } from "./time";
import { H, W } from "./video";
import { useCamera } from "./camera-rig";

// base = the main tone (dark or light decides the recipe's mood); accent/accentLit = the glow; deep = the darkest shade; light = the palest.
export type SurfacePalette = { base: string; accent: string; accentLit?: string; deep?: string; light?: string };

// Any CSS colour with an alpha, and a mix of two; done in JS so no recipe depends on color-mix support.
export const withAlpha = (c: string, a: number) => {
  const m = interpolateColors(0, [0, 1], [c, c]).match(/[\d.]+/g) ?? ["0", "0", "0", "1"];
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${(a * Number(m[3] ?? 1)).toFixed(3)})`;
};
export const mix = (a: string, b: string, k: number) => interpolateColors(clamp01(k), [0, 1], [a, b]);

const full = (p: SurfacePalette) => ({ lit: p.accentLit ?? mix(p.accent, "#ffffff", 0.45), deep: p.deep ?? mix(p.base, "#000000", 0.55), light: p.light ?? mix(p.base, "#ffffff", 0.85) });
const TAU = Math.PI * 2;
const wave = (t: number, period: number, ph = 0) => Math.sin((t / period) * TAU + ph);
// Oversized so parallax shifts and slow drifts never reveal an edge.
const OVER: CSSProperties = { position: "absolute", left: -120, top: -120, width: W + 240, height: H + 240 };
const safeId = (id: string) => `s${id.replace(/[^a-zA-Z0-9]/g, "")}`;

type RecipeProps = { p: SurfacePalette; t: number };

const HorizonGlow: FC<RecipeProps> = ({ p, t }) => {
  const { lit, deep } = full(p);
  return (
    <>
      <div style={{ ...OVER, background: `linear-gradient(180deg, ${deep} 0%, ${p.base} 58%, ${mix(p.base, p.accent, 0.16)} 100%)` }} />
      <div style={{ ...OVER, background: `radial-gradient(${72 + 5 * wave(t, 11)}% ${44 + 6 * wave(t, 9, 1)}% at ${50 + 4 * wave(t, 17)}% 104%, ${withAlpha(p.accent, 0.55)}, ${withAlpha(p.accent, 0.16)} 48%, transparent 72%)` }} />
      <div style={{ ...OVER, background: `linear-gradient(180deg, transparent 66%, ${withAlpha(lit, 0.12 + 0.04 * wave(t, 7))} 76%, transparent 86%)` }} />
    </>
  );
};

const DuotoneDiagonal: FC<RecipeProps> = ({ p, t }) => {
  const { lit } = full(p);
  return (
    <>
      <div style={{ ...OVER, background: `linear-gradient(${160 + 7 * wave(t, 14)}deg, ${mix(p.accent, "#000000", 0.45)} 0%, ${p.base} 48%, ${mix(lit, "#000000", 0.68)} 100%)` }} />
      <div style={{ ...OVER, transform: `translateX(${(((t / 9) % 1) - 0.5) * 900}px)`, background: `linear-gradient(115deg, transparent 32%, ${withAlpha(lit, 0.07)} 46%, transparent 60%)` }} />
    </>
  );
};

const MeshBlob: FC<RecipeProps> = ({ p, t }) => {
  const { lit, light } = full(p);
  const blobs = [
    { c: p.accent, x: 0.18, y: 0.22, r: 1100, a: 0.42 },
    { c: lit, x: 0.82, y: 0.3, r: 1000, a: 0.5 },
    { c: mix(p.accent, light, 0.5), x: 0.6, y: 0.92, r: 1200, a: 0.4 },
    { c: light, x: 0.35, y: 0.65, r: 900, a: 0.7 },
  ];
  return (
    <>
      <div style={{ ...OVER, background: p.base }} />
      {blobs.map((b, i) => {
        const x = b.x * W + noise2D(`mesh${i}`, t * 0.18, 0) * 70;
        const y = b.y * H + noise2D(`mesh${i}`, 0, t * 0.18) * 70;
        return <div key={i} style={{ position: "absolute", left: x - b.r / 2, top: y - b.r / 2, width: b.r, height: b.r, borderRadius: "50%", background: `radial-gradient(closest-side, ${withAlpha(b.c, b.a)}, ${withAlpha(b.c, 0)})` }} />;
      })}
    </>
  );
};

const SpotlightTint: FC<RecipeProps> = ({ p, t }) => {
  const { lit, deep } = full(p);
  const sway = 2.2 * wave(t, 10);
  return (
    <>
      <div style={{ ...OVER, background: `radial-gradient(58% 62% at ${50 + sway}% 38%, ${mix(p.base, p.accent, 0.2)}, ${p.base} 62%, ${deep} 100%)` }} />
      <div style={{ ...OVER, transformOrigin: "50% 0%", transform: `rotate(${sway * 0.9}deg)`, clipPath: "polygon(43% 0%, 57% 0%, 78% 100%, 22% 100%)", filter: "blur(40px)", background: `linear-gradient(180deg, ${withAlpha(lit, 0.14)}, ${withAlpha(lit, 0.02)} 85%)` }} />
      <div style={{ ...OVER, background: `radial-gradient(34% 10% at ${50 + sway * 1.6}% 84%, ${withAlpha(lit, 0.16 + 0.03 * wave(t, 5))}, transparent)` }} />
    </>
  );
};

const LayeredSky: FC<RecipeProps> = ({ p, t }) => {
  const { lit, light, deep } = full(p);
  const band = (i: number) => {
    const y = 640 + i * 150;
    const dx = -((t * (10 + i * 14)) % 800);
    let d = `M ${dx - 400} ${H + 240}`;
    for (let x = dx - 400; x <= W + 800; x += 80) d += ` L ${x} ${y + Math.sin(x / (260 - i * 40) + i * 2) * (40 + i * 10)}`;
    return `${d} L ${W + 800} ${H + 240} Z`;
  };
  return (
    <>
      <div style={{ ...OVER, background: `linear-gradient(180deg, ${mix(p.accent, light, 0.62)} 0%, ${mix(lit, light, 0.55)} 55%, ${p.base} 100%)` }} />
      <div style={{ ...OVER, background: `radial-gradient(16% 26% at ${68 + 1.5 * wave(t, 20)}% 44%, ${withAlpha("#ffffff", 0.7)}, ${withAlpha(lit, 0.25)} 45%, transparent 70%)` }} />
      <svg width={W + 240} height={H + 240} style={{ position: "absolute", left: -120, top: -120 }}>
        {[0, 1, 2].map((i) => (
          <path key={i} d={band(i)} fill={mix(mix(p.accent, deep, 0.25 + i * 0.25), light, 0.55 - i * 0.18)} opacity={0.28 + i * 0.08} />
        ))}
      </svg>
    </>
  );
};

const PaperTexture: FC<RecipeProps> = ({ p, t }) => {
  const id = safeId(useId());
  const { deep } = full(p);
  return (
    <>
      <div style={{ ...OVER, background: `linear-gradient(${125 + 6 * wave(t, 16)}deg, ${mix(p.base, "#ffffff", 0.35)} 0%, ${p.base} 50%, ${mix(p.base, deep, 0.12)} 100%)` }} />
      <svg width={W + 240} height={H + 240} style={{ position: "absolute", left: -120, top: -120, mixBlendMode: "multiply", opacity: 0.55 }}>
        <filter id={`${id}f`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.40  0 0 0 0 0.34  0 0 0 0.32 0" />
        </filter>
        <filter id={`${id}m`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves={2} seed={3} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.44  0 0 0 0 0.36  0 0 0 0.7 -0.25" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id}m)`} />
        <rect width="100%" height="100%" filter={`url(#${id}f)`} />
      </svg>
      <div style={{ ...OVER, background: `radial-gradient(40% 50% at ${30 + 8 * wave(t, 13)}% 30%, ${withAlpha("#ffffff", 0.22)}, transparent 70%)` }} />
    </>
  );
};

export const SURFACES = { horizonGlow: HorizonGlow, duotoneDiagonal: DuotoneDiagonal, meshBlob: MeshBlob, spotlightTint: SpotlightTint, layeredSky: LayeredSky, paperTexture: PaperTexture } satisfies Record<string, FC<RecipeProps>>;
export type SurfaceRecipe = keyof typeof SURFACES;

const PaletteCtx = createContext<SurfacePalette>({ base: "#15171d", accent: "#ff8a4c" });
export const useSurfacePalette = () => useContext(PaletteCtx);

// <Surface recipe palette>: the base stack (2-3 layers that drift on their own), then its children = life layers (<Grain>, <Particles>, ...), which default to the same palette.
// It never zooms; inside a <Camera> it slides by `parallax` (a far backdrop) and its life layers can read the camera too.
export const Surface: FC<{ recipe: SurfaceRecipe; palette: SurfacePalette; parallax?: number; children?: ReactNode }> = ({ recipe, palette, parallax = 0.04, children }) => {
  const { t } = useTime();
  const sh = useCamera().shift(parallax);
  const R = SURFACES[recipe];
  const cap = (v: number) => Math.max(-110, Math.min(110, v));
  return (
    <PaletteCtx.Provider value={palette}>
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: palette.base }}>
        <AbsoluteFill style={{ transform: `translate(${cap(sh.x)}px, ${cap(sh.y)}px)` }}>
          <R p={palette} t={t} />
        </AbsoluteFill>
        {children}
      </AbsoluteFill>
    </PaletteCtx.Provider>
  );
};

// Deterministic film grain: turbulence tile that jumps 12x/s by a fixed offset table (draft 4.4), never per-render random.
export const Grain: FC<{ opacity?: number; blend?: CSSProperties["mixBlendMode"]; freq?: number; rate?: number }> = ({ opacity = 0.16, blend = "overlay", freq = 0.8, rate = 12 }) => {
  const { t } = useTime();
  const id = safeId(useId());
  const k = Math.floor(t * rate);
  const dx = ((k * 37) % 60) - 30;
  const dy = ((k * 61) % 60) - 30;
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity, mixBlendMode: blend, pointerEvents: "none" }}>
      <svg width={W + 120} height={H + 120} style={{ position: "absolute", left: -60 + dx, top: -60 + dy }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={11} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

// Edge darkening (or lightening on light surfaces), breathing 2 % so it never sits dead.
export const Vignette: FC<{ strength?: number; color?: string; inner?: number }> = ({ strength = 0.5, color = "#000000", inner = 52 }) => {
  const { t } = useTime();
  const i = inner + 2 * wave(t, 9);
  return <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse 78% 74% at 50% 48%, transparent ${i}%, ${withAlpha(color, strength * 0.55)} ${i + 26}%, ${withAlpha(color, strength)} 100%)` }} />;
};

// Two warm blurred blooms wandering near a corner, screen-blended and flickering slowly; sits in front of everything.
export const LightLeak: FC<{ color?: string; colorB?: string; strength?: number; corner?: "tl" | "tr" | "bl" | "br"; seed?: string }> = ({ color, colorB, strength = 0.55, corner = "tr", seed = "leak" }) => {
  const { t } = useTime();
  const pal = useSurfacePalette();
  const a = color ?? pal.accent;
  const b = colorB ?? full(pal).lit;
  const cx = corner.includes("r") ? W * 0.88 : W * 0.12;
  const cy = corner.includes("b") ? H * 0.86 : H * 0.12;
  const flick = 0.75 + 0.25 * noise2D(seed, t * 0.7, 3);
  const blob = (c: string, r: number, i: number) => {
    const x = cx + noise2D(`${seed}x${i}`, t * 0.15, 0) * 260;
    const y = cy + noise2D(`${seed}y${i}`, 0, t * 0.15) * 180;
    return <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(closest-side, ${withAlpha(c, 0.9)}, ${withAlpha(c, 0.35)} 45%, ${withAlpha(c, 0)})` }} />;
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: strength * flick, filter: "blur(30px)" }}>
      {blob(a, 520, 0)}
      {blob(b, 300, 1)}
    </AbsoluteFill>
  );
};

// One bright band crossing the frame once (start `at`, `dur` s), screen-blended: the draft's once-per-segment light sweep.
export const LightSweep: FC<{ at?: number; dur?: number; angle?: number; color?: string; width?: number; strength?: number }> = ({ at = 0.5, dur = 1.4, angle = 22, color = "#ffffff", width = 0.16, strength = 0.35 }) => {
  const { t } = useTime();
  const p = clamp01((t - at) / dur);
  if (p <= 0 || p >= 1) return null;
  const e = p * p * (3 - 2 * p);
  const x = -0.25 + e * 1.5;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: strength * Math.sin(p * Math.PI) }}>
      <div style={{ ...OVER, transform: `translateX(${(x - 0.5) * W}px) rotate(${angle}deg)`, background: `linear-gradient(90deg, transparent ${50 - width * 50}%, ${withAlpha(color, 0.9)} 50%, transparent ${50 + width * 50}%)` }} />
    </AbsoluteFill>
  );
};

// Seeded soft dots with depth: near ones bigger, faster, brighter. rise = embers/bubbles, drift = dust sideways, float = in-place hover.
export const Particles: FC<{ count?: number; seed?: string; mode?: "rise" | "drift" | "float"; color?: string; size?: [number, number]; opacity?: number; speed?: number; parallax?: number }> = ({
  count = 36,
  seed = "dust",
  mode = "rise",
  color,
  size = [3, 12],
  opacity = 0.35,
  speed = 1,
  parallax = 0.12,
}) => {
  const { t } = useTime();
  const id = safeId(useId());
  const cam = useCamera();
  const c = color ?? full(useSurfacePalette()).lit;
  const span = { w: W + 200, h: H + 200 };
  const wrap = (v: number, m: number) => ((v % m) + m) % m - 100;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id={id}>
            <stop offset="0%" stopColor={c} stopOpacity={1} />
            <stop offset="45%" stopColor={c} stopOpacity={0.5} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </radialGradient>
        </defs>
        {Array.from({ length: count }, (_, i) => {
          const z = random(`${seed}z${i}`);
          const r = size[0] + (size[1] - size[0]) * z * z;
          const v = speed * (14 + 70 * z);
          const sh = cam.shift(parallax * (0.3 + z));
          const bx = random(`${seed}x${i}`) * span.w + sh.x;
          const by = random(`${seed}y${i}`) * span.h + sh.y;
          const wob = noise2D(`${seed}w${i}`, t * 0.25, i) * (18 + 30 * z);
          const x = mode === "drift" ? wrap(bx + t * v, span.w) : wrap(bx + wob, span.w);
          const y = mode === "rise" ? wrap(by - t * v, span.h) : wrap(by + (mode === "drift" ? wob : noise2D(`${seed}v${i}`, i, t * 0.25) * 24), span.h);
          const tw = 0.55 + 0.45 * noise2D(`${seed}t${i}`, t * 0.8, i);
          return <circle key={i} cx={x} cy={y} r={r * 2.2} fill={`url(#${id})`} opacity={opacity * (0.35 + 0.65 * z) * tw} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Spread onto a text container: a soft dark (or light) pocket behind it so text meets the draft's contrast rule; layout is unchanged (padding cancelled by margin).
export const textPocket = ({ tone = "dark", strength = 0.55, pad = [56, 120], color }: { tone?: "dark" | "light"; strength?: number; pad?: [number, number]; color?: string } = {}): CSSProperties => {
  const c = color ?? (tone === "dark" ? "#06070a" : "#fbfaf6");
  return {
    padding: `${pad[0]}px ${pad[1]}px`,
    margin: `${-pad[0]}px ${-pad[1]}px`,
    backgroundImage: `radial-gradient(closest-side, ${withAlpha(c, strength)} 0%, ${withAlpha(c, strength * 0.75)} 50%, ${withAlpha(c, 0)} 100%)`,
  };
};
