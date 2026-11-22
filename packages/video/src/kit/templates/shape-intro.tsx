// Shape intro: one living shape morphs into a new form on each spoken trait while the trait word swaps beside it, then shrinks into a mark with every trait in orbit as the name lands.
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import type { Style } from "../contract";
import { defineTemplate } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const SHAPES = ["circle", "square", "diamond", "triangle", "hex", "star", "blob", "heart"] as const;
type ShapeName = (typeof SHAPES)[number];

const schema = z.object({
  lead: z.string().max(22).optional().describe("The sentence the traits complete, shown above each trait, e.g. 'My grandmother is'"),
  leadWord: z.string().optional().describe("Spoken word the lead line lands on"),
  traits: z
    .array(
      z.object({
        word: z.string().min(1).max(12).describe("One trait, 1–2 words, ≤ 12 characters, e.g. 'fearless'"),
        shape: z.enum(SHAPES).describe("The form the shape morphs into for this trait: pick one that feels like the word (triangle = sharp, blob = playful, circle = calm, square = solid)"),
        cue: z.string().optional().describe("Spoken word this trait lands on (defaults to the trait word itself)"),
      }),
    )
    .min(2)
    .max(5)
    .describe("2–5 traits, one morph each, in spoken order"),
  name: z.string().min(1).max(16).describe("Who or what is being introduced, landed at the end, ≤ 16 characters, e.g. 'Asha, 84'"),
  nameWord: z.string().optional().describe("Spoken word the name lands on"),
  monogram: z.string().max(2).optional().describe("1–2 letters drawn inside the final mark, e.g. 'A'"),
  markShape: z.enum(SHAPES).optional().describe("The mark's final form (defaults to the last trait's shape)"),
  tagline: z.string().max(36).optional().describe("One short line under the name, e.g. 'and she still out-walks me'"),
  taglineWord: z.string().optional().describe("Spoken word the tagline lands on"),
  seed: z.number().int().min(1).max(99).default(1).describe("Changes the blob outline and twist direction; vary between segments"),
});

type Props = z.infer<typeof schema>;

const N = 144;
const TAU = Math.PI * 2;

const hash = (a: number, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const poly = (n: number, rot: number, r: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = rot + (TAU * k) / n;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });

// Every shape becomes N radii at fixed angles from its centre (ray–outline intersection), so any two shapes morph by plain interpolation.
const radialOf = (pts: [number, number][]) =>
  Array.from({ length: N }, (_, i) => {
    const a = (TAU * i) / N;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = 0;
    for (let k = 0; k < pts.length; k++) {
      const [ax, ay] = pts[k]!;
      const [bx, by] = pts[(k + 1) % pts.length]!;
      const ex = bx - ax;
      const ey = by - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const s = (ax * ey - ay * ex) / den;
      const u = (ax * dy - ay * dx) / den;
      if (u >= -1e-6 && u <= 1 + 1e-6 && s > best) best = s;
    }
    return best;
  });

const cache = new Map<string, number[]>();
const radiiFor = (shape: ShapeName, seed: number): number[] => {
  const key = `${shape}:${shape === "blob" ? seed : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let r: number[];
  switch (shape) {
    case "square":
      r = radialOf(poly(4, Math.PI / 4, 1.18));
      break;
    case "diamond":
      r = radialOf(poly(4, -Math.PI / 2, 1.26));
      break;
    case "triangle":
      r = radialOf(poly(3, -Math.PI / 2, 1.34));
      break;
    case "hex":
      r = radialOf(poly(6, 0, 1.08));
      break;
    case "star":
      r = radialOf(
        Array.from({ length: 10 }, (_, k) => {
          const a = -Math.PI / 2 + (TAU * k) / 10;
          const rr = k % 2 === 0 ? 1.3 : 0.62;
          return [Math.cos(a) * rr, Math.sin(a) * rr] as [number, number];
        }),
      );
      break;
    case "heart":
      r = radialOf(
        Array.from({ length: 180 }, (_, k) => {
          const t = (TAU * k) / 180;
          const x = 16 * Math.sin(t) ** 3;
          const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          return [(x / 15) * 1.12, ((y - 2) / 15) * 1.12] as [number, number];
        }),
      );
      break;
    case "blob": {
      const p1 = hash(seed, 1) * TAU;
      const p2 = hash(seed, 2) * TAU;
      const p3 = hash(seed, 3) * TAU;
      r = Array.from({ length: N }, (_, i) => {
        const a = (TAU * i) / N;
        return 1.02 + 0.1 * Math.sin(3 * a + p1) + 0.06 * Math.sin(5 * a + p2) + 0.05 * Math.sin(2 * a + p3);
      });
      break;
    }
    default:
      r = Array.from({ length: N }, () => 1);
  }
  cache.set(key, r);
  return r;
};

const pathOf = (radii: number[], cx: number, cy: number, R: number, rot: number, boil?: (a: number) => number) => {
  let d = "";
  for (let i = 0; i < N; i++) {
    const a = (TAU * i) / N;
    const rr = Math.max(0, radii[i] ?? 1) * R * (boil ? 1 + boil(a) : 1);
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a + rot) * rr).toFixed(1)} ${(cy + Math.sin(a + rot) * rr).toFixed(1)}`;
  }
  return `${d}Z`;
};

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bump = (x: number) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));

type Key = { at: number; dur: number; radii: number[]; cx: number; cy: number; R: number; c2: number; calm?: boolean; twist: number };
type ShapeState = { radii: number[]; cx: number; cy: number; R: number; c2: number; rot: number };

// Chained interpolation: each key eases the running state toward itself, so tight cues never jump even if a morph is cut short.
const stateAt = (keys: Key[], style: Style, frame: number, fps: number): ShapeState => {
  const t = frame / fps;
  const k0 = keys[0]!;
  const s: ShapeState = { radii: k0.radii.slice(), cx: k0.cx, cy: k0.cy, R: 0, c2: k0.c2, rot: 0 };
  let squash = 1;
  for (const k of keys) {
    if (t < k.at - 0.2) break;
    squash *= 1 - 0.07 * bump((t - (k.at - 0.2)) / 0.2);
    if (t < k.at) continue;
    const p = enter(k.calm ? { ...style, motion: "calm" } : style, frame, fps, k.at, k.dur);
    for (let i = 0; i < N; i++) s.radii[i] = lerp(s.radii[i] ?? 1, k.radii[i] ?? 1, p);
    s.cx = lerp(s.cx, k.cx, Math.min(p, 1));
    s.cy = lerp(s.cy, k.cy, Math.min(p, 1));
    s.R = lerp(s.R, k.R, p);
    s.c2 = lerp(s.c2, k.c2, clamp01(p));
    s.rot += k.twist * bump(clamp01(p));
  }
  s.R *= squash;
  return s;
};

// Rough width per character, as a share of font size, for fitting one line; condensed display faces (handwriting, serif) run narrower than the sans body.
const fit = (text: string, maxW: number, maxSize: number, style: Style, floor = 60) => {
  const condensed = style.display !== style.body;
  const k = condensed ? 0.5 : 0.6;
  return Math.max(floor, Math.min(maxSize * (condensed ? 1.15 : 1), maxW / (Math.max(text.length, 3) * k)));
};

const Scene = ({ props, style, width: W, height: H, duration, cues }: { props: Props; style: Style; width: number; height: number; duration: number; cues: { at: number; end: number; word: string }[] }) => {
  const { t, frame, fps } = useT();
  const wide = W / H >= 1.3;
  const traits = props.traits;
  const n = traits.length;
  const first = traits[0]!;
  const last = traits[n - 1]!;
  const seed = props.seed ?? 1;
  const dir = seed % 2 === 0 ? -1 : 1;

  // Layout: shape left + text column right on the full frame; shape above, text below in the split panel.
  const C = wide ? { x: W * 0.31, y: H * 0.5 } : { x: W * 0.5, y: H * 0.33 };
  const R = wide ? H * 0.24 : H * 0.19;
  const M = wide ? { x: W * 0.33, y: H * 0.5 } : { x: W * 0.5, y: H * 0.31 };
  const Rm = wide ? H * 0.175 : H * 0.13;
  const textLeft = wide ? W * 0.54 : W * 0.06;
  const textW = wide ? W * 0.4 : W * 0.88;
  const align = wide ? "left" : "center";
  const wordY = wide ? H * 0.5 : H * 0.72;

  // Timing: traits spread between the lead and the name; the name leaves ≥ 2 s to land and settle.
  const nameAt = Math.min(cueAt(cues, props.nameWord, duration * 0.66), duration - 2.2);
  const leadAt = props.lead ? cueAt(cues, props.leadWord, 0.3) : 0.3;
  const start = props.lead ? Math.max(leadAt + 0.6, 0.9) : 0.6;
  const traitTimes = traits.map((tr, i) => cueAt(cues, tr.cue ?? tr.word.split(" ")[0], start + (i * (nameAt - 0.6 - start)) / Math.max(n - 1, 1)));
  const traitAt = (i: number) => traitTimes[i] ?? nameAt;
  const tagAt = Math.min(cueAt(cues, props.taglineWord, nameAt + 0.9), duration - 1.3);

  const markShape = props.markShape ?? last.shape;
  const circle = radiiFor("circle", seed);
  const keys: Key[] = [
    { at: 0, dur: 0.1, radii: circle, cx: C.x, cy: C.y, R: 0, c2: 0, twist: 0 },
    { at: 0.05, dur: 0.5, radii: circle, cx: C.x, cy: C.y, R: R * 0.16, c2: 0, twist: 0 },
    ...traits.map((tr, i) => ({ at: traitAt(i) - 0.12, dur: 0.55, radii: radiiFor(tr.shape, seed), cx: C.x, cy: C.y, R, c2: i % 2, twist: dir * (i % 2 === 0 ? 0.42 : -0.42) })),
    { at: nameAt - 0.15, dur: 0.85, radii: radiiFor(markShape, seed), cx: M.x, cy: M.y, R: Rm, c2: 1, calm: true, twist: dir * 0.3 },
  ];
  const s = stateAt(keys, style, frame, fps);
  const ghost = stateAt(keys, style, frame - Math.round(0.18 * fps), fps);

  // Camera: born close on the seed dot, pulled back by the first trait; a small settle-in on the name group at the end.
  const born = interpolate(t, [0, Math.max(traitAt(0) - 0.05, 0.4)], [1.22, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const push = interpolate(t, [nameAt + 0.3, nameAt + 1.7], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const camOrigin = t < nameAt ? `${C.x}px ${C.y}px` : wide ? `${W * 0.6}px ${H * 0.5}px` : `${W * 0.5}px ${H * 0.5}px`;
  const cam = t < nameAt ? born : push;

  const hand = style.motion === "hand";
  const step = Math.floor(t * 8);
  const boil = hand ? (a: number) => 0.012 * Math.sin(3 * a + hash(step, 7) * TAU) + 0.008 * Math.sin(5 * a + hash(step, 9) * TAU) : undefined;
  const fillPath = pathOf(s.radii, s.cx, s.cy, s.R, s.rot);
  const roundW = Math.min(style.radius, 24) * 1.1;
  const off = hand ? 10 : 0;

  // The two ghost outlines are the life layer: the shape's echo, slowly turning, following its morph a beat late.
  const g1 = pathOf(ghost.radii, ghost.cx, ghost.cy, ghost.R * 1.85, ghost.rot);
  const g2 = pathOf(ghost.radii, ghost.cx, ghost.cy, ghost.R * 2.55, ghost.rot);
  const spin = t * 11;

  // Glyph history: one small shape per trait under the word; at the name they fly into orbit around the mark.
  const gR = wide ? 24 : 22;
  const gGap = gR * 2 + 26;
  const glyphRowY = wide ? wordY + fit(first.word, textW, 150, style) * 0.62 + 64 : H * 0.85;
  const orbitSpin = 1.1 * Easing.out(Easing.cubic)(clamp01((t - nameAt) / Math.max(duration - 0.6 - nameAt, 0.5)));
  const glyphs = traits.map((tr, k) => {
    const rowX = wide ? textLeft + gR + k * gGap : W / 2 + (k - (n - 1) / 2) * gGap;
    const pop = enter(style, frame, fps, traitAt(k) + 0.18, 0.45);
    const fly = enter({ ...style, motion: "calm" }, frame, fps, nameAt + 0.05 + 0.07 * k, 0.85);
    const a = -Math.PI / 2 + (TAU * k) / n + orbitSpin;
    const ox = M.x + Math.cos(a) * Rm * 1.62;
    const oy = M.y + Math.sin(a) * Rm * 1.62;
    const x = lerp(rowX, ox, fly);
    const y = lerp(glyphRowY, oy, fly) - Math.sin(Math.PI * fly) * 60;
    const r = gR * (1 + 0.2 * fly) * pop;
    return { k, x, y, r, shape: tr.shape, colour: k % 2 === 0 ? style.accent : style.accent2, on: t >= traitAt(k) + 0.18 };
  });

  const exitOf = (end: number) => interpolate(t, [end, end + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const textOut = nameAt - 0.25;
  const leadIn = enter(style, frame, fps, leadAt - 0.08, 0.6);
  const leadOut = exitOf(textOut);
  const leadSize = wide ? 52 : 48;

  const nameSize = fit(props.name, textW, wide ? 150 : 140, style, 72);
  const nameY = wide ? H * 0.5 - 30 : H * 0.66;
  const tag = enter(style, frame, fps, tagAt - 0.08, 0.6);
  const mono = enter(style, frame, fps, nameAt + 0.5, 0.5);

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${(C.x / W) * 100}% ${(C.y / H) * 100}%, ${style.surface} 0%, ${style.bg} 62%)` }} />

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: camOrigin }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <g transform={`rotate(${spin} ${ghost.cx} ${ghost.cy})`}>
            <path d={g1} fill="none" stroke={style.muted} strokeOpacity={0.35} strokeWidth={4} strokeDasharray="2 16" strokeLinecap="round" />
          </g>
          <g transform={`rotate(${-spin * 0.6} ${ghost.cx} ${ghost.cy})`}>
            <path d={g2} fill="none" stroke={style.muted} strokeOpacity={0.14} strokeWidth={2} />
          </g>

          <g transform={`translate(${off} ${off * 0.8})`}>
            <path d={fillPath} fill={style.accent} stroke={style.accent} strokeWidth={roundW} strokeLinejoin="round" />
            <path d={fillPath} fill={style.accent2} stroke={style.accent2} strokeWidth={roundW} strokeLinejoin="round" opacity={s.c2} />
          </g>
          {hand ? <path d={pathOf(s.radii, s.cx, s.cy, s.R, s.rot, boil)} fill="none" stroke={style.ink} strokeWidth={5} strokeLinejoin="round" /> : null}

          {glyphs.map((g) =>
            g.on && g.r > 0.5 ? (
              <g key={g.k}>
                <path d={pathOf(radiiFor(g.shape, seed), g.x, g.y, g.r, 0)} fill={g.colour} stroke={g.colour} strokeWidth={Math.min(style.radius, 24) * 0.25} strokeLinejoin="round" />
                {hand ? <path d={pathOf(radiiFor(g.shape, seed), g.x, g.y, g.r, 0, boil)} fill="none" stroke={style.ink} strokeWidth={3} /> : null}
              </g>
            ) : null,
          )}
        </svg>

        {props.monogram ? (
          <div
            style={{
              position: "absolute",
              left: M.x - Rm,
              top: M.y - Rm,
              width: Rm * 2,
              height: Rm * 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: style.display,
              fontWeight: 700,
              fontSize: Rm * 1.05,
              lineHeight: 1,
              color: style.bg,
              opacity: mono,
              transform: `translate(${off}px, ${off * 0.8}px) scale(${0.6 + 0.4 * mono})`,
            }}
          >
            {props.monogram}
          </div>
        ) : null}

        {props.lead ? (
          <div
            style={{
              position: "absolute",
              left: textLeft,
              width: textW,
              top: wide ? wordY - fit(first.word, textW, 150, style) * 0.62 - leadSize * 1.5 : H * 0.56,
              textAlign: align,
              overflow: "hidden",
              height: leadSize * 1.35,
            }}
          >
            <div
              style={{
                fontFamily: style.body,
                fontWeight: 600,
                fontSize: leadSize,
                lineHeight: 1.3,
                color: style.muted,
                whiteSpace: "nowrap",
                opacity: leadIn * (1 - leadOut),
                transform: `translateX(${(1 - leadIn) * (wide ? -60 : 0)}px) translateY(${(wide ? 0 : (1 - leadIn) * 40) - leadOut * 70}px)`,
              }}
            >
              {props.lead}
            </div>
          </div>
        ) : null}

        {traits.map((tr, i) => {
          const at = traitAt(i) - 0.1;
          const end = i < n - 1 ? traitAt(i + 1) - 0.18 : textOut;
          if (t < at - 0.05 || t > end + 0.3) return null;
          const size = fit(tr.word, textW, wide ? 150 : 140, style);
          const lh = size * 1.25;
          const p = enter(style, frame, fps, at, 0.55);
          const x = exitOf(end);
          // Entry doors alternate: odd traits drop in from above, even ones rise from below; each exits the way it was travelling.
          const from = i % 2 === 0 ? 1 : -1;
          return (
            <div key={i} style={{ position: "absolute", left: textLeft, width: textW, top: wordY - lh / 2, height: lh, overflow: "hidden", textAlign: align }}>
              <div
                style={{
                  fontFamily: style.display,
                  fontWeight: 700,
                  fontSize: size,
                  lineHeight: 1.25,
                  color: style.ink,
                  whiteSpace: "nowrap",
                  transform: `translateY(${(1 - p) * from * 105 - x * from * 105}%)`,
                }}
              >
                {tr.word}
              </div>
            </div>
          );
        })}

        <div style={{ position: "absolute", left: textLeft, width: textW, top: nameY - nameSize * 0.65, height: nameSize * 1.3, overflow: "hidden", textAlign: align, whiteSpace: "nowrap" }}>
          {props.name.split("").map((ch, i) => {
            const p = enter(style, frame, fps, nameAt + 0.35 + i * 0.035, 0.5);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: style.display,
                  fontWeight: 700,
                  fontSize: nameSize,
                  lineHeight: 1.3,
                  color: style.ink,
                  whiteSpace: "pre",
                  transform: `translateY(${(1 - p) * 110}%)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {props.tagline ? (
          <div
            style={{
              position: "absolute",
              left: textLeft,
              width: textW,
              top: nameY + nameSize * 0.6 + 8,
              textAlign: align,
              fontFamily: style.body,
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1.25,
              color: style.muted,
              opacity: tag,
              transform: `translateY(${(1 - tag) * 30}px)`,
            }}
          >
            {props.tagline}
          </div>
        ) : null}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,${hand ? 0.1 : 0.18}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "shape-intro",
  title: "Shape intro",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Introducing who or what a video is about (a person, a place, a product, a habit, the creator themselves): 2–5 one-word traits land on their spoken words while one bold shape morphs into a form that fits each (triangle sharp, blob playful, circle calm…), the word swapping beside it under an optional lead line ('My grandmother is'). On the name, the shape shrinks into a mark (optional monogram) with every trait's glyph in orbit, the name rises letter by letter and an optional tagline lands. Good for cold opens, channel or guest intros and 'meet the…' moments. No media.",
  avoid:
    "More than once per video, traits longer than two short words, lists that need explanation (use list-tick), or when the subject has real footage or a face to show (cut to it instead). Not for numbers (stat-punch) or a hook line (title-card).",
  schema,
  example: {
    lead: "My grandmother is",
    leadWord: "My",
    traits: [
      { word: "fearless", shape: "triangle" },
      { word: "funny", shape: "blob" },
      { word: "patient", shape: "circle" },
      { word: "stubborn", shape: "square" },
    ],
    name: "Asha, 84",
    nameWord: "Asha",
    monogram: "A",
    markShape: "heart",
    tagline: "and she still out-walks me",
    taglineWord: "still",
    seed: 3,
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.3, end: 0.5, word: "My" },
    { at: 0.5, end: 1.0, word: "grandmother" },
    { at: 1.0, end: 1.15, word: "is" },
    { at: 1.3, end: 1.9, word: "fearless" },
    { at: 2.6, end: 3.0, word: "funny" },
    { at: 3.8, end: 4.3, word: "patient" },
    { at: 4.5, end: 4.7, word: "and" },
    { at: 4.9, end: 5.5, word: "stubborn" },
    { at: 6.4, end: 6.6, word: "This" },
    { at: 6.6, end: 6.75, word: "is" },
    { at: 6.8, end: 7.3, word: "Asha" },
    { at: 7.4, end: 7.8, word: "84" },
    { at: 8.0, end: 8.15, word: "and" },
    { at: 8.15, end: 8.3, word: "she" },
    { at: 8.3, end: 8.6, word: "still" },
  ],
  seconds: { min: 5, max: 14, demo: 10 },
  mediaSlots: 0,
  credit: { name: "\"Claude self-intro motion graphic\" on prompt-motion.com", url: "https://prompt-motion.com/1littlecoder-9fef89" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Scene props={props} style={style} width={width} height={height} duration={duration} cues={cues} />,
});
