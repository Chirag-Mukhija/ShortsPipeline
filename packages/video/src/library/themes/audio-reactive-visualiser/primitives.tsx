// Visualiser primitives: the deterministic additive canvas, glow sprites, trails, the void background, beat pulse, chromatic peak, zoom punch and flash.
import { useId, useLayoutEffect, useRef, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { beatClock, useSong, type Sampler } from "../../core/beat";
import { W, H, FPS } from "../../core/video";
import { hexRgb, M, mix, NEON, rgba, VOID, withAlpha, type Palette } from "./theme";
import { bassOf, rnd, spectrumAt } from "./signal";

// A full-frame canvas redrawn from scratch every frame (no retained pixels), so any frame renders identically on its own.
// `additive` draws with "lighter": overlapping light adds up, which is the theme's glow.
export const Canvas2D: FC<{ draw: (ctx: CanvasRenderingContext2D) => void; additive?: boolean; style?: CSSProperties }> = ({ draw, additive = true, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useCurrentFrame();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = additive ? "lighter" : "source-over";
    draw(ctx);
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, ...style }} />;
};

// Radial-gradient sprites, cached per colour: one drawImage per particle instead of a shadowBlur, which is slow in headless renders.
const sprites = new Map<string, HTMLCanvasElement>();
const sprite = (color: string) => {
  let s = sprites.get(color);
  if (!s) {
    s = document.createElement("canvas");
    s.width = s.height = 64;
    const g = s.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, withAlpha(color, 1));
    gr.addColorStop(0.16, withAlpha(color, 0.75));
    gr.addColorStop(0.42, withAlpha(color, 0.16));
    gr.addColorStop(1, withAlpha(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    sprites.set(color, s);
  }
  return s;
};
// A glowing point: r is the core radius; the halo spans 4r.
export const glowDot = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, a: number) => {
  if (a <= 0.003) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(sprite(color), x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.globalAlpha = 1;
};
// A glowing polyline: a wide faint pass, then a thin bright core.
export const glowLine = (ctx: CanvasRenderingContext2D, pts: [number, number][], color: string, width: number, a: number, close = false) => {
  if (pts.length < 2 || a <= 0.003) return;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    if (close) ctx.closePath();
  };
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  path();
  ctx.strokeStyle = withAlpha(color, 0.14 * a);
  ctx.lineWidth = width * 6;
  ctx.stroke();
  path();
  ctx.strokeStyle = withAlpha(color, 0.35 * a);
  ctx.lineWidth = width * 2.4;
  ctx.stroke();
  path();
  ctx.strokeStyle = withAlpha(color, a);
  ctx.lineWidth = width;
  ctx.stroke();
};

// TrailBuffer for canvas: redraws the last `length` frames (oldest first) at fade^k opacity. k is frames back, so the caller
// recomputes positions at t - k/FPS: trails come from the frame, never from retained state.
export const trail = (length: number, fade: number, drawAt: (framesBack: number, alpha: number) => void) => {
  for (let k = length; k >= 0; k--) drawAt(k, Math.pow(fade, k));
};
// The same for SVG/HTML: render(secondsBack, alpha) is called for each past frame, oldest at the back.
export const TrailBuffer: FC<{ length?: number; fade?: number; render: (secondsBack: number, alpha: number) => ReactNode }> = ({ length = 6, fade = 0.62, render }) => (
  <>
    {Array.from({ length: length + 1 }, (_, i) => length - i).map((k) => (
      <g key={k} opacity={Math.pow(fade, k)}>{render(k / FPS, Math.pow(fade, k))}</g>
    ))}
  </>
);

// Drop zoom punch: 1 → 1+amount over 3 f, back to 1 by 12 f.
export const punch = (t: number, at: number, amount = 0.2) => {
  const f = (t - at) * FPS;
  if (f < 0 || f > 12) return 1;
  return f < 3 ? 1 + amount * Easing.out(Easing.quad)(f / 3) : 1 + amount * (1 - Easing.inOut(Easing.cubic)((f - 3) / 9));
};
// Kick flash: full for `frames`, then a 3 f tail.
export const flash = (t: number, at: number, frames = 2) => {
  const f = (t - at) * FPS;
  if (f < 0) return 0;
  return f < frames ? 1 : Math.max(0, 1 - (f - frames) / 3);
};
export const Flash: FC<{ v: number; color?: string; max?: number }> = ({ v, color = "#FFFFFF", max = 0.55 }) =>
  v > 0 ? <AbsoluteFill style={{ background: color, opacity: v * max, mixBlendMode: "screen", pointerEvents: "none" }} /> : null;

// BeatPulse: scales and brightens its children on the bass (or on a plain BPM clock when there is no track context or audio).
export const BeatPulse: FC<{ strength?: number; bpm?: number; samples?: Sampler; glow?: boolean; origin?: string; children: ReactNode }> = ({ strength = 0.12, bpm, samples, glow = true, origin = "50% 50%", children }) => {
  const song = useSong();
  const clock = bpm ? beatClock({ bpm }) : song.clock;
  const k = samples ? bassOf(spectrumAt(clock, song.t, 32, samples)) : clock.pulse(song.t, 0.14);
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + strength * k})`, transformOrigin: origin, filter: glow ? `brightness(${1 + 0.35 * k})` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// ChromaticPeak: splits children into a cyan copy and a magenta copy offset sideways on peaks (SVG filter, so it works on
// text, SVG and canvas alike). The fringes take the palette's colours rather than RGB, so the split stays on-theme.
export const ChromaticPeak: FC<{ amount: number; palette?: Palette; angle?: number; children: ReactNode; style?: CSSProperties }> = ({ amount, palette = NEON, angle = 0, children, style }) => {
  const id = `cp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const dx = Math.cos(angle) * amount;
  const dy = Math.sin(angle) * amount;
  const tint = (hex: string, a: number) => {
    const [r, g, b] = hexRgb(hex.startsWith("#") ? hex : "#FFFFFF");
    return `0 0 0 0 ${r / 255}  0 0 0 0 ${g / 255}  0 0 0 0 ${b / 255}  0 0 0 ${a} 0`;
  };
  const on = amount > 0.3;
  return (
    <AbsoluteFill style={style}>
      {on ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values={tint(palette.a, 0.85)} result="ca" />
            <feOffset in="ca" dx={-dx} dy={-dy} result="cao" />
            <feColorMatrix in="SourceGraphic" type="matrix" values={tint(palette.b, 0.85)} result="cb" />
            <feOffset in="cb" dx={dx} dy={dy} result="cbo" />
            <feBlend in="cao" in2="cbo" mode="screen" result="fringe" />
            <feMerge>
              <feMergeNode in="fringe" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ filter: on ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Stepped film grain (new seed every 2 frames), kept faint: the void should stay black, not grey.
export const Grain: FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const f = useCurrentFrame();
  const id = `gr${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "screen", pointerEvents: "none" }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={Math.floor(f / 2)} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter={`url(#${id})`} />
    </svg>
  );
};

// The void: near-black field, a tilted disc of orbiting particles with short trails, slowly rotating polar guides,
// a faint floor trace that never goes fully flat, slow hue drift and grain. Idle life even when the music is silent.
export const Void: FC<{ palette?: Palette; particles?: number; guides?: boolean; floor?: boolean; samples?: Sampler; intensity?: number }> = ({ palette = NEON, particles = 240, guides = true, floor = true, samples, intensity = 1 }) => {
  const { t, f, clock } = useSong();
  const spec = spectrumAt(clock, t, 48, samples, 9);
  const kick = clock.pulse(t, 0.2);
  const cx = W / 2;
  const cy = H / 2;
  const tilt = (-14 * Math.PI) / 180;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const cols = [palette.a, palette.c, palette.b, palette.a, palette.hi];
  const at = (i: number, tt: number) => {
    const r = 140 + 980 * Math.pow(rnd("vd", i), 0.75);
    const th = rnd("vd", i, 1) * Math.PI * 2 + tt * (0.04 + 28 / r);
    const x = r * Math.cos(th);
    const y = r * Math.sin(th) * 0.38;
    return [cx + x * cos - y * sin, cy + x * sin + y * cos] as [number, number];
  };
  const floorY = H - 54;
  const floorPts = Array.from({ length: 97 }, (_, i) => {
    const u = i / 96;
    const v = spec[Math.min(47, Math.floor(Math.abs(u - 0.5) * 2 * 47))] ?? 0;
    const env = Math.sin(Math.PI * u);
    return `${M + u * (W - 2 * M)},${floorY - env * (2 + v * 14) * Math.sin(u * 90 + t * 9)}`;
  }).join(" ");
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 48%, ${mix(VOID, palette.c, 0.07)} 0%, ${VOID} 70%)` }}>
      {guides ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <g transform={`translate(${cx} ${cy}) rotate(${f * 0.1})`} fill="none">
            {[200, 380, 560].map((r) => (
              <circle key={r} r={r} stroke={rgba("#5A5A78", 0.22)} strokeWidth={1} />
            ))}
            {Array.from({ length: 120 }, (_, i) => (
              <line key={i} x1={0} y1={-470} x2={0} y2={i % 10 === 0 ? -492 : -480} stroke={rgba("#6A6A8C", i % 10 === 0 ? 0.3 : 0.16)} strokeWidth={1.5} transform={`rotate(${i * 3})`} />
            ))}
          </g>
        </svg>
      ) : null}
      <Canvas2D
        style={{ filter: `hue-rotate(${Math.sin(t * 0.07) * 18}deg)` }}
        draw={(ctx) => {
          for (let i = 0; i < particles; i++) {
            const col = cols[Math.floor(rnd("vc", i) * cols.length)]!;
            const size = 0.9 + 1.8 * rnd("vs", i);
            const a = (0.2 + 0.5 * rnd("va", i)) * (0.8 + 0.5 * kick) * intensity;
            const p = at(i, t);
            // The orbit trail is the TrailBuffer idea: earlier positions recomputed, each segment fainter.
            for (let k = 0; k < 6; k++) {
              const q0 = at(i, t - k * 0.09);
              const q1 = at(i, t - (k + 1) * 0.09);
              ctx.beginPath();
              ctx.moveTo(q0[0], q0[1]);
              ctx.lineTo(q1[0], q1[1]);
              ctx.strokeStyle = withAlpha(col, a * 0.45 * (1 - k / 6));
              ctx.lineWidth = size * (1 - k / 8);
              ctx.stroke();
            }
            glowDot(ctx, col, p[0], p[1], size, a);
          }
        }}
      />
      {floor ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <polyline points={floorPts} fill="none" stroke={withAlpha(palette.a, 0.22 * intensity)} strokeWidth={1.5} />
        </svg>
      ) : null}
      <Grain />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, ${rgba(VOID, 0.85)} 100%)` }} />
    </AbsoluteFill>
  );
};

// Entrance helper: out-expo 0 → 1 from `at` over `frames`.
export const expoIn = (t: number, at: number, frames = 30) =>
  interpolate(t, [at, at + frames / FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
