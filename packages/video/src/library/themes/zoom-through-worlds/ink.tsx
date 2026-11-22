// Zoom-through-worlds primitives: hand-inked path builders, the boiling ink filter, star shapes, display type with word drops, asides and the full-frame stage.
import { useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { BACK, DISPLAY, HOT, INK, PAPER, SCRAWL, SERIF, SUN, inked, rng } from "./theme";

export type Pt = [number, number];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (t: number, a: number, d: number, e?: (x: number) => number) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: e });

// A closed smooth path through points (midpoint quadratics), so blobs never show corners.
export const smooth = (pts: Pt[], closed = true) => {
  if (pts.length < 3) return "";
  const n = pts.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (!closed) {
    let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
    for (let i = 1; i < n - 1; i++) {
      const m = mid(pts[i]!, pts[i + 1]!);
      d += ` Q${pts[i]![0].toFixed(1)} ${pts[i]![1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    }
    return `${d} L${pts[n - 1]![0].toFixed(1)} ${pts[n - 1]![1].toFixed(1)}`;
  }
  const start = mid(pts[n - 1]!, pts[0]!);
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i]!, pts[(i + 1) % n]!);
    d += ` Q${pts[i]![0].toFixed(1)} ${pts[i]![1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + "Z";
};

// An organic ellipse: radius jittered per point by `j` (0..1), seeded.
export const blob = (cx: number, cy: number, rx: number, ry: number, seed = 1, j = 0.06, n = 14, rot = 0) => {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const k = 1 + (r() * 2 - 1) * j;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts);
};

// A hand-inked open stroke between two points with a little sag and wobble.
export const inkLine = (a: Pt, b: Pt, seed = 1, sag = 0.04, n = 6) => {
  const r = rng(seed);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / (len || 1);
  const ny = (b[0] - a[0]) / (len || 1);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const off = Math.sin(u * Math.PI) * sag * len + (i > 0 && i < n ? (r() - 0.5) * len * 0.012 : 0);
    pts.push([a[0] + (b[0] - a[0]) * u + nx * off, a[1] + (b[1] - a[1]) * u + ny * off]);
  }
  return smooth(pts, false);
};

// Rounded rectangle whose sides bow a touch, like a hand-inked box.
export const inkRect = (x: number, y: number, w: number, h: number, rad = 28, seed = 1, bow = 6) => {
  const r = rng(seed);
  const b = () => (r() - 0.5) * 2 * bow;
  const k = rad * 0.45;
  return [
    `M${x + rad} ${y}`,
    `Q${x + w / 2} ${y + b()} ${x + w - rad} ${y}`,
    `C${x + w - rad + k} ${y} ${x + w} ${y + rad - k} ${x + w} ${y + rad}`,
    `Q${x + w + b()} ${y + h / 2} ${x + w} ${y + h - rad}`,
    `C${x + w} ${y + h - rad + k} ${x + w - rad + k} ${y + h} ${x + w - rad} ${y + h}`,
    `Q${x + w / 2} ${y + h + b()} ${x + rad} ${y + h}`,
    `C${x + rad - k} ${y + h} ${x} ${y + h - rad + k} ${x} ${y + h - rad}`,
    `Q${x + b()} ${y + h / 2} ${x} ${y + rad}`,
    `C${x} ${y + rad - k} ${x + rad - k} ${y} ${x + rad} ${y}Z`,
  ].join(" ");
};

// Five-point star with slightly uneven arms, as if cut by hand.
export const starPath = (cx: number, cy: number, r: number, seed = 1, rot = -Math.PI / 2) => {
  const g = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2 + (g() - 0.5) * 0.12;
    const rr = (i % 2 ? r * 0.44 : r) * (1 + (g() - 0.5) * 0.14);
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
};

// The boiling-ink filter (screen-space region, so a 14× zoomed world costs the same): displacement whose noise seed steps every 4 frames (a step, never a tween), so flat shapes stay hand-drawn.
export const InkDefs: FC<{ id: string; amount?: number; freq?: number }> = ({ id, amount = 3.2, freq = 0.018 }) => {
  const { f } = useTime();
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x={-20} y={-20} width={W + 40} height={H + 40}>
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={Math.floor(f / 4) % 97} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={amount} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
};

// A safe id for SVG defs (React ids contain colons, which break url(#…)).
export const useSvgId = (prefix: string) => `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

// A full-frame SVG stage in 1920×1080 units with the boiling-ink filter on everything inside (set ink={false} to skip it).
export const Stage: FC<{ children: ReactNode; ink?: boolean; amount?: number; style?: CSSProperties }> = ({ children, ink = true, amount, style }) => {
  const id = useSvgId("ztw-ink");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <defs>
        <InkDefs id={id} amount={amount} />
      </defs>
      <g filter={ink ? `url(#${id})` : undefined}>{children}</g>
    </svg>
  );
};

// SVG ink-stroked shape: flat fill, black outline, round joins.
export const Inked: FC<{ d: string; fill?: string; w?: number; stroke?: string; opacity?: number }> = ({ d, fill = "none", w = 6, stroke = INK, opacity }) => (
  <path d={d} fill={fill} stroke={stroke} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} />
);

// Wraps children at a point with optional scale and rotation (degrees).
export const At: FC<{ x: number; y: number; s?: number; sy?: number; r?: number; children: ReactNode; opacity?: number }> = ({ x, y, s = 1, sy, r = 0, children, opacity }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s} ${sy ?? s})`} opacity={opacity}>
    {children}
  </g>
);

// Yellow inked display type in SVG; the stroke is painted under the fill so letters keep their weight.
export const SvgDisplay: FC<{ x: number; y: number; text: string; size: number; fill?: string; anchor?: "start" | "middle" | "end"; drop?: number; r?: number; spacing?: number }> = ({ x, y, text, size, fill = SUN, anchor = "middle", drop = size * 0.07, r = 0, spacing = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`} fontFamily={DISPLAY} fontSize={size} textAnchor={anchor} letterSpacing={spacing}>
    <text x={drop} y={drop} fill={INK} stroke={INK} strokeWidth={size * 0.09} strokeLinejoin="round">{text}</text>
    <text fill={fill} stroke={INK} strokeWidth={size * 0.09} strokeLinejoin="round" paintOrder="stroke">{text}</text>
  </g>
);

// Headline words drop in on back-out(1.7), 12 f each, 4 f apart; lines leave upward out of a clip, 14 f, 3 f apart. Times in seconds.
export const Headline: FC<{
  lines: string[];
  at: number;
  out?: number;
  size?: number;
  color?: string;
  // Words to paint hot pink (matched case-insensitively, punctuation ignored).
  accent?: string[];
  accentColor?: string;
  align?: "center" | "left";
  style?: CSSProperties;
  lineGap?: number;
  seed?: number;
}> = ({ lines, at, out, size = 150, color = SUN, accent = [], accentColor = HOT, align = "center", style, lineGap = 0.98, seed = 3 }) => {
  const { t } = useTime();
  const g = rng(seed);
  let k = 0;
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: 0, ...style }}>
      {lines.map((line, li) => {
        const exit = out === undefined ? 0 : ease(t, out + li * 0.1, 14 / 30, (x) => x * x * x);
        return (
          <div key={li} style={{ clipPath: "inset(-60px -80px -40px -80px)", lineHeight: lineGap, padding: "0 10px" }}>
            <div style={{ display: "flex", gap: size * 0.24, transform: `translateY(${-exit * 160}%)` }}>
              {line.split(" ").map((w, wi) => {
                const p = ease(t, at + (k++ * 4) / 30, 12 / 30, BACK);
                const tilt = (g() - 0.5) * 6;
                return (
                  <span
                    key={wi}
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: size,
                      color: accent.map(norm).includes(norm(w)) ? accentColor : color,
                      textShadow: inked(size * 0.035, size * 0.06),
                      display: "inline-block",
                      letterSpacing: size * 0.01,
                      transform: `translateY(${(1 - p) * -size * 1.3}px) rotate(${tilt * (0.4 + 0.6 * (1 - p))}deg)`,
                      opacity: p > 0 ? 1 : 0,
                    }}
                  >
                    {w}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Small handwritten aside (Patrick Hand), the "feast your eyes" voice.
export const Aside: FC<{ text: string; size?: number; color?: string; style?: CSSProperties; p?: number }> = ({ text, size = 40, color = INK, style, p = 1 }) => (
  <div style={{ fontFamily: SCRAWL, fontSize: size, color, opacity: p, transform: `translateY(${(1 - p) * 14}px)`, whiteSpace: "nowrap", ...style }}>{text}</div>
);

// Book-serif body copy.
export const Body: FC<{ children: ReactNode; size?: number; color?: string; style?: CSSProperties; italic?: boolean }> = ({ children, size = 40, color = INK, style, italic }) => (
  <div style={{ fontFamily: SERIF, fontWeight: 500, fontStyle: italic ? "italic" : "normal", fontSize: size, lineHeight: 1.3, color, ...style }}>{children}</div>
);

// Cream paper with a faint seeded ink speckle; the ground of every non-dive scene.
export const PaperGround: FC<{ color?: string; speckle?: string }> = ({ color = PAPER, speckle = "#E9DDB4" }) => {
  const g = rng(77);
  const dots = Array.from({ length: 70 }, () => [g() * W, g() * H, 1.5 + g() * 2.5] as const);
  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {dots.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={speckle} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
