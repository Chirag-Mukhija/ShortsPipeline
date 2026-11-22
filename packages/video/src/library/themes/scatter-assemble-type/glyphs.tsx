// Letter engine foundations: the stage clock (narration seconds or a music beat grid), measured letter layout, shape sampling, seeded poses and the single positioned letter every piece is made of.
import { createContext, useContext, type CSSProperties, type FC, type ReactNode } from "react";
import { random } from "remotion";
import { Track, useSong, type Cue, type TrackSpec } from "../../core/beat";
import { W, H } from "../../core/video";
import { DISPLAY, MONO, SANS, areFontsReady } from "./theme";

export type { Cue };

// ---------- clock ----------
const Music = createContext(false);

// Wrap a music-only scene in <Song>: it is core's <Track> plus a flag that switches on beat pulses, so narrated scenes never pulse to a phantom 120 BPM.
export const Song: FC<{ spec: TrackSpec; from?: number; children: ReactNode }> = ({ spec, from, children }) => (
  <Track spec={spec} from={from}>
    <Music.Provider value>{children}</Music.Provider>
  </Track>
);

// Every piece reads time here: `t` is song seconds inside <Song>, plain seconds otherwise; cues may be seconds or { bar, beat }.
export const useStage = () => {
  const s = useSong();
  const music = useContext(Music);
  return {
    t: s.t,
    music,
    cue: (c: Cue) => s.clock.cue(c),
    pulse: music ? s.pulse : 0,
    energy: music ? s.energy : 0.5,
    spb: s.clock.spb,
    pos: s.pos,
  };
};

// ---------- seeded helpers ----------
export const rnd = (key: string | number) => random(`sat-${key}`);
export const sgn = (key: string | number) => (rnd(key) < 0.5 ? -1 : 1);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------- type and measurement ----------
export type Type = { family: string; weight: number; size: number; track?: number; upper?: boolean; lh?: number };
// The three voices: the resolved word (Anton), the letters and body (Instrument Sans), counters and labels (Fragment Mono).
export const display = (size: number, track = 0.02): Type => ({ family: DISPLAY, weight: 400, size, track, upper: true, lh: 1.02 });
export const sans = (size: number, weight = 500, track = 0.02, upper = false): Type => ({ family: SANS, weight, size, track, upper, lh: 1.22 });
export const caps = (size: number, weight = 500, track = 0.12): Type => ({ family: SANS, weight, size, track, upper: true, lh: 1.3 });
export const mono = (size: number, track = 0.04, upper = true): Type => ({ family: MONO, weight: 400, size, track, upper, lh: 1.25 });

const fontStr = (ty: Type) => `${ty.weight} ${ty.size}px "${ty.family}"`;
let ctx2d: CanvasRenderingContext2D | null = null;
const canvas = () => {
  if (!ctx2d && typeof document !== "undefined") ctx2d = document.createElement("canvas").getContext("2d");
  return ctx2d;
};
const cache = new Map<string, number>();
export const measure = (str: string, ty: Type) => {
  const key = `${fontStr(ty)}|${str}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const c = canvas();
  let w = str.length * ty.size * 0.55;
  if (c) {
    c.font = fontStr(ty);
    w = c.measureText(str).width;
  }
  if (areFontsReady()) cache.set(key, w);
  return w;
};

// One letter at its rest place: x, y is the top-left of its line box; `group` is its word index.
export type Item = { ch: string; x: number; y: number; w: number; ty: Type; group: number; line: number; r?: number; s?: number };
export type Layout = { items: Item[]; lines: { x: number; y: number; w: number }[]; box: { x: number; y: number; w: number; h: number }; words: string[] };
export type LayoutOpts = { x: number; y: number; maxW?: number; align?: "left" | "center" | "right"; anchor?: "top" | "middle" | "bottom"; breaks?: boolean };

// Greedy word wrap at maxW, then per-letter x from prefix widths so kerning survives the split. "\n" forces a line.
export const layout = (raw: string, ty: Type, o: LayoutOpts): Layout => {
  const text = ty.upper ? raw.toUpperCase() : raw;
  const track = (ty.track ?? 0) * ty.size;
  const lh = (ty.lh ?? 1.2) * ty.size;
  const wOf = (s: string) => measure(s, ty) + Math.max(0, s.length - 1) * track;
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(/ +/).filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && o.maxW && wOf(next) > o.maxW) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    lines.push(cur);
  }
  const h = lines.length * lh;
  const top = o.anchor === "middle" ? o.y - h / 2 : o.anchor === "bottom" ? o.y - h : o.y;
  const items: Item[] = [];
  const outLines: Layout["lines"] = [];
  const words: string[] = [];
  let group = -1;
  let maxW = 0;
  let minX = Infinity;
  lines.forEach((line, li) => {
    const lw = wOf(line);
    maxW = Math.max(maxW, lw);
    const x0 = o.align === "center" ? o.x - lw / 2 : o.align === "right" ? o.x - lw : o.x;
    minX = Math.min(minX, x0);
    const y = top + li * lh;
    outLines.push({ x: x0, y, w: lw });
    let prevSpace = true;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === " ") {
        prevSpace = true;
        continue;
      }
      if (prevSpace) {
        group++;
        words.push("");
      }
      prevSpace = false;
      words[group] += ch;
      items.push({ ch, x: x0 + measure(line.slice(0, i), ty) + i * track, y, w: measure(ch, ty), ty, group, line: li });
    }
  });
  return { items, lines: outLines, box: { x: minX, y: top, w: maxW, h }, words };
};

// ---------- shapes made of letters ----------
export type Pt = { x: number; y: number; a?: number };

// Filled shape of a word or number: draw it on a canvas, keep grid cells that are mostly ink, centred on cx, cy.
const sampleCache = new Map<string, Pt[]>();
export const sampleText = (text: string, ty: Type, cx: number, cy: number, step: number): Pt[] => {
  const key = `${fontStr(ty)}|${text}|${step}`;
  let pts = sampleCache.get(key);
  if (!pts) {
    pts = [];
    const c = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d", { willReadFrequently: true }) : null;
    if (c) {
      const track = (ty.track ?? 0) * ty.size;
      const w = Math.ceil(measure(text, ty) + text.length * track + ty.size * 0.4);
      const h = Math.ceil(ty.size * 1.4);
      c.canvas.width = w;
      c.canvas.height = h;
      c.font = fontStr(ty);
      c.letterSpacing = `${track}px`;
      c.textBaseline = "middle";
      c.fillStyle = "#000";
      c.fillText(text, ty.size * 0.2, h / 2);
      const data = c.getImageData(0, 0, w, h).data;
      const half = Math.floor(step / 2);
      for (let y = half; y < h; y += step) {
        for (let x = half; x < w; x += step) {
          if ((data[(y * w + x) * 4 + 3] ?? 0) > 150) pts.push({ x, y });
        }
      }
    }
    if (areFontsReady()) sampleCache.set(key, pts);
  }
  if (!pts.length) return [];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const ox = (Math.min(...xs) + Math.max(...xs)) / 2;
  const oy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map((p) => ({ x: p.x - ox + cx, y: p.y - oy + cy }));
};

// n points spaced evenly along one or more polylines, each with its tangent angle (degrees) so letters can ride the stroke.
export const alongPaths = (paths: Pt[][], n: number): Pt[] => {
  const segs: { a: Pt; b: Pt; len: number }[] = [];
  for (const p of paths) for (let i = 1; i < p.length; i++) segs.push({ a: p[i - 1]!, b: p[i]!, len: Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y) });
  const total = segs.reduce((s, g) => s + g.len, 0);
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    let d = ((k + 0.5) / n) * total;
    for (const g of segs) {
      if (d <= g.len) {
        const u = d / g.len;
        out.push({ x: lerp(g.a.x, g.b.x, u), y: lerp(g.a.y, g.b.y, u), a: (Math.atan2(g.b.y - g.a.y, g.b.x - g.a.x) * 180) / Math.PI });
        break;
      }
      d -= g.len;
    }
  }
  return out;
};

export const circlePath = (cx: number, cy: number, r: number, from = -90, sweep = 360, steps = 96): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + (sweep * i) / steps) * Math.PI) / 180;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

// ---------- poses ----------
export type Pose = { x: number; y: number; r: number; s: number; o: number };
export const pose = (x: number, y: number, r = 0, s = 1, o = 1): Pose => ({ x, y, r, s, o });

// Travel along a closing spiral: the remaining offset shrinks and rotates by `swirl` radians as e runs 0 → 1, so no letter flies in a dull straight line.
export const travel = (a: Pose, b: Pose, e: number, swirl: number, pivot?: { x: number; y: number }): Pose => {
  const k = 1 - e;
  const ang = swirl * k;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const px = pivot?.x ?? b.x;
  const py = pivot?.y ?? b.y;
  const ax = a.x - px;
  const ay = a.y - py;
  const bx = b.x - px;
  const by = b.y - py;
  // Rotate the start about the pivot, then blend towards the rest place.
  const rx = ax * c - ay * s;
  const ry = ax * s + ay * c;
  return { x: px + lerp(rx, bx, e), y: py + lerp(ry, by, e), r: lerp(a.r, b.r, e), s: lerp(a.s, b.s, e), o: lerp(a.o, b.o, e) };
};

export const CENTRE = { x: W / 2, y: H / 2 };

// ---------- the letter ----------
export type GlyphProps = { ch: string; ty: Type; p: Pose; w: number; color: string; blur?: number; style?: CSSProperties };

// One absolutely placed letter; rotation and scale pivot on the letter's own centre.
export const Glyph: FC<GlyphProps> = ({ ch, ty, p, w, color, blur, style }) => {
  if (p.o <= 0.003) return null;
  return (
    <span
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        fontFamily: ty.family,
        fontWeight: ty.weight,
        fontSize: ty.size,
        lineHeight: `${(ty.lh ?? 1.2) * ty.size}px`,
        whiteSpace: "pre",
        color,
        opacity: Math.min(1, p.o),
        transformOrigin: `${w / 2}px ${((ty.lh ?? 1.2) * ty.size) / 2}px`,
        transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})`,
        filter: blur ? `blur(${blur}px)` : undefined,
        ...style,
      }}
    >
      {ch}
    </span>
  );
};

// A plain, still line of text in one of the voices (labels, numerals, captions).
export const Label: FC<{ text: string; x: number; y: number; ty: Type; color: string; o?: number; align?: "left" | "center" | "right"; style?: CSSProperties }> = ({ text, x, y, ty, color, o = 1, align = "left", style }) => (
  <div
    style={{
      position: "absolute",
      left: align === "left" ? x : undefined,
      right: align === "right" ? W - x : undefined,
      top: y,
      width: align === "center" ? 1600 : undefined,
      marginLeft: align === "center" ? x - 800 : undefined,
      textAlign: align,
      fontFamily: ty.family,
      fontWeight: ty.weight,
      fontSize: ty.size,
      letterSpacing: `${ty.track ?? 0}em`,
      textTransform: ty.upper ? "uppercase" : undefined,
      lineHeight: ty.lh ?? 1.2,
      whiteSpace: "pre",
      color,
      opacity: o,
      fontVariantNumeric: "tabular-nums",
      ...style,
    }}
  >
    {text}
  </div>
);
