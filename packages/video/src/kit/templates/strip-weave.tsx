// Strip weave: 2–4 photos or clips weave in over each other strip by strip (warp, then weft) while one word of an on-screen line swaps with each, optionally ending with every photo side by side as bands.
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, MediaFill, useT } from "../motion";

const item = z.object({
  word: z.string().min(1).max(14).describe("The word or short phrase that swaps into the line with this photo, e.g. 'cold water'"),
  cue: z.string().optional().describe("Spoken word this photo and its word land on; defaults to the last word of `word`"),
  tag: z.string().max(22).optional().describe("Tiny label for this photo in the corner pill, e.g. a place, a year or a step name"),
  zoom: z.number().min(1).max(2.5).default(1).describe("Crop tighter around the photo's focus point; 1 shows the whole frame"),
});

const schema = z.object({
  lead: z.string().max(30).optional().describe("The fixed start of the line that stays while the word under it swaps, e.g. 'A good morning needs'"),
  items: z.array(item).min(2).max(4).describe("One per photo, in order: item k uses media slot k"),
  weave: z.enum(["alternate", "columns", "rows"]).default("alternate").describe("Strip direction: alternate switches columns/rows each photo like warp and weft"),
  strips: z.number().int().min(4).max(12).default(7).describe("How many strips each photo is cut into as it weaves in"),
  finale: z
    .object({
      word: z.string().max(14).optional().describe("Word the line ends on, e.g. 'all three'"),
      cue: z.string().optional().describe("Spoken word the bands land on; defaults to the last word of `word`"),
    })
    .optional()
    .describe("Ending: every photo comes back as side-by-side bands, the line lands its last word"),
});

const lastToken = (s?: string) => s?.trim().split(/\s+/).pop();

// A tiny seeded hash so the hand temperament's thread boil is the same on every render.
const seeded = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Progress of strip j of S inside a weave starting at `start`: strips go one after another from the first edge.
const stripP = (style: Style, frame: number, fps: number, start: number, dur: number, j: number, S: number) =>
  enter(style, frame, fps, start + (j / Math.max(1, S - 1)) * dur * 0.45, dur * 0.55);

export default defineTemplate({
  id: "strip-weave",
  title: "Strip weave",
  mode: "stock",
  layouts: ["full", "split"],
  useFor:
    "Walking through 2–4 photos or clips that complete one sentence: a brand or place explained to a first-time visitor, the steps of a craft, what a routine is made of. Each photo weaves in over the last as strips (columns, then rows) on its spoken word while one word of the line swaps ('A good morning needs' → sunlight / cold water / a slow walk). Slots 0–3: the photos, in item order. Finale brings them all back side by side as bands.",
  avoid: "A single photo (use parallax-still or footage-reveal), photos whose subject sits in a corner (strips cut it up), or swap words longer than two short words. Not twice in a row; at most once or twice per video.",
  schema,
  example: {
    lead: "A good morning needs",
    items: [
      { word: "sunlight", tag: "06:40", zoom: 1 },
      { word: "cold water", tag: "06:45", zoom: 1 },
      { word: "a slow walk", tag: "07:00", zoom: 2.2 },
    ],
    weave: "alternate",
    strips: 7,
    finale: { word: "all three", cue: "three" },
  },
  exampleMedia: [
    { src: "media/still.jpg", kind: "image", focus: [0.5, 0.45] },
    { src: "media/screen.mp4", kind: "video", focus: [0.4, 0.4] },
    { src: "media/still.jpg", kind: "image", focus: [0.85, 0.2] },
  ],
  exampleCues: [
    { at: 1.0, end: 1.5, word: "sunlight" },
    { at: 3.2, end: 3.6, word: "water" },
    { at: 5.4, end: 5.8, word: "walk" },
    { at: 7.3, end: 7.7, word: "three" },
  ],
  seconds: { min: 4, max: 16, demo: 9 },
  mediaSlots: 4,
  credit: { name: "Handwoven textiles brand explainer (prompt-motion.com)", url: "https://prompt-motion.com/amitsingha89-150378" },
  status: "draft",
  Component: ({ props, style, width: W, height: H, duration, media, cues }) => {
    const { t, frame, fps } = useT();
    const items = props.items;
    const n = items.length;
    const fin = props.finale;
    const slots = n + (fin ? 1 : 0);

    // Event times: each photo (and the finale) lands on its word; fallbacks spread evenly, leaving the weave plus 0.6 s settled at the end.
    const first = Math.min(0.9, duration * 0.12);
    const lastAt = Math.max(first, duration - 1.7);
    const ev: number[] = [];
    for (let k = 0; k < slots; k++) {
      const fallback = first + (slots > 1 ? (k * (lastAt - first)) / (slots - 1) : 0);
      const it = items[k];
      const word = it ? (it.cue ?? lastToken(it.word)) : (fin?.cue ?? lastToken(fin?.word));
      const at = cueAt(cues, word, fallback);
      const prev = ev[k - 1];
      ev.push(Math.min(lastAt, Math.max(at, prev !== undefined ? prev + 0.7 : 0.35)));
    }
    const E = (k: number) => ev[k] ?? Infinity;
    const gap = slots > 1 ? Math.min(...ev.slice(1).map((e, k) => e - E(k))) : 1.2;
    const WD = Math.max(0.55, Math.min(1.0, gap * 0.75));
    // The picture lands just before its word: most strips are in when it is spoken.
    const start = ev.map((e) => Math.max(0, e - WD * 0.6));
    const St = (k: number) => start[k] ?? Infinity;
    const done = (k: number) => St(k) + WD;
    const finAt = fin ? E(n) : Infinity;
    const finStart = fin ? St(n) : Infinity;

    const S = props.strips;
    const dirOf = (k: number) => (props.weave === "columns" ? "col" : props.weave === "rows" ? "row" : k % 2 === 0 ? "col" : "row");
    const slot = (k: number) => media[k] ?? media[k % Math.max(1, media.length)];

    // The strips of photo k as one clip path, plus their leading edges for the accent threads.
    const weaveOf = (k: number) => {
      const dir = dirOf(k);
      const rects: string[] = [];
      const edges: { x: number; y: number; w: number; h: number }[] = [];
      let all = true;
      for (let j = 0; j < S; j++) {
        const p = Math.max(0, stripP(style, frame, fps, St(k), WD, j, S));
        if (p < 1) all = false;
        if (p <= 0) continue;
        const fromStart = j % 2 === 0;
        if (dir === "col") {
          const x0 = (j * W) / S;
          const x1 = ((j + 1) * W) / S + 1;
          const len = p * H;
          const y0 = fromStart ? 0 : H - len;
          rects.push(`M${x0} ${y0}H${x1}V${y0 + len}H${x0}Z`);
          if (p < 0.995) edges.push({ x: x0, y: fromStart ? len - 3 : H - len - 3, w: x1 - x0 - 1, h: 6 });
        } else {
          const y0 = (j * H) / S;
          const y1 = ((j + 1) * H) / S + 1;
          const len = p * W;
          const x0 = fromStart ? 0 : W - len;
          rects.push(`M${x0} ${y0}H${x0 + len}V${y1}H${x0}Z`);
          if (p < 0.995) edges.push({ x: fromStart ? len - 3 : W - len - 3, y: y0, w: 6, h: y1 - y0 - 1 });
        }
      }
      return { clip: all ? undefined : `path('${rects.join("") || "M0 0Z"}')`, edges, any: rects.length > 0 };
    };

    // Which item the line and the pill show now.
    let cur = 0;
    for (let k = 0; k < n; k++) if (t >= E(k) - 0.15) cur = k;

    const boil = style.motion === "hand" ? (seeded(Math.floor(t * 8)) - 0.5) * 4 : 0;
    const threads: { x: number; y: number; w: number; h: number }[] = [];

    const photos = items.map((it, k) => {
      const m = slot(k);
      // Hidden before its weave, and once the next photo has fully covered it (until the finale).
      if (!m || t < St(k) ||(k + 1 < n && t > done(k + 1) + 0.05) || (fin && t > finStart + WD + 0.05)) return null;
      const w = weaveOf(k);
      if (!w.any) return null;
      threads.push(...w.edges);
      const inP = clamp01((t - St(k)) / WD);
      const settle = 1.07 - 0.07 * Easing.out(Easing.cubic)(inP);
      const drift = 1 + 0.025 * clamp01((t - E(k)) / 7);
      // The outgoing photo dims as the next one weaves over it, so the new strips read in front.
      const next = k + 1 < n ? clamp01((t - St(k + 1)) / WD) : fin ? clamp01((t - finStart) / WD) : 0;
      return (
        <AbsoluteFill key={k} style={{ clipPath: w.clip, filter: next > 0 ? `brightness(${1 - 0.35 * next})` : undefined }}>
          <MediaFill media={m} zoom={it.zoom * settle * drift} />
        </AbsoluteFill>
      );
    });

    // Finale: each photo returns in its own band, bands alternating from top and bottom.
    const bw = W / n;
    const bands = fin
      ? items.map((it, i) => {
          const m = slot(i);
          if (!m || t < finStart) return null;
          const p = Math.max(0, enter(style, frame, fps, finStart + (i / Math.max(1, n - 1)) * WD * 0.4, WD * 0.6));
          if (p <= 0) return null;
          const fromTop = i % 2 === 0;
          const cut = `${(1 - Math.min(1, p)) * 100}%`;
          if (p < 0.995) threads.push({ x: i * bw, y: fromTop ? p * H - 3 : H - p * H - 3, w: bw, h: 6 });
          const drift = 1 + 0.02 * clamp01((t - finAt) / 4);
          return (
            <div key={i} style={{ position: "absolute", left: i * bw, top: 0, width: bw + 1, height: H, overflow: "hidden", clipPath: fromTop ? `inset(0 0 ${cut} 0)` : `inset(${cut} 0 0 0)` }}>
              <MediaFill media={m} zoom={Math.max(1, it.zoom * 0.9) * drift} />
            </div>
          );
        })
      : [];
    const seams = fin ? enter({ ...style, motion: "calm" }, frame, fps, finStart + WD * 0.7, 0.5) : 0;

    // Type sizes from the canvas: a wide frame gets the ladder's md/xl, a panel scales down; the swap word fits its longest option.
    const wide = W >= 1400;
    const margin = wide ? 110 : 72;
    const leadSize = wide ? 74 : 58;
    const words = [...items.map((i) => i.word), ...(fin?.word ? [fin.word] : [])];
    const longest = Math.max(...words.map((w) => w.length));
    const wordSize = Math.round(Math.min(wide ? 150 : 112, (W - margin * 2) / (longest * 0.58)));

    const leadAt = St(0) + WD * 0.75;
    const leadWords = (props.lead ?? "").split(/\s+/).filter(Boolean);

    // The swap word for slot k is on screen from its word until just before the next one.
    const swapSlots = [...items.map((i, k) => ({ word: i.word, at: E(k) })), ...(fin?.word ? [{ word: fin.word, at: E(n) }] : [])];
    const pocket = enter({ ...style, motion: "calm" }, frame, fps, St(0) + WD * 0.5, 0.7);
    const textPocket = `linear-gradient(to top, color-mix(in srgb, ${style.bg} 94%, transparent) 0%, color-mix(in srgb, ${style.bg} 78%, transparent) 42%, color-mix(in srgb, ${style.bg} 0%, transparent) 100%)`;

    const pillIn = enter(style, frame, fps, E(0) + 0.2, 0.5);
    const pillTag = fin && t >= finAt - 0.1 ? null : items[cur]?.tag;
    const pillChange = clamp01((t - (E(cur) - 0.15)) / 0.3);
    const mono: CSSProperties = { fontFamily: style.mono, fontSize: 30, fontWeight: 600, letterSpacing: 1 };

    return (
      <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
        {/* Base surface under the weave: never a flat or black frame while the first strips come in. */}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 70%, color-mix(in srgb, ${style.accent} 16%, transparent), transparent 60%), linear-gradient(160deg, ${style.surface}, ${style.bg})` }} />

        {photos}
        {bands}

        {/* Grade: a soft tint toward the accent and a vignette, outside the moving photos. */}
        <AbsoluteFill style={{ background: style.accent, mixBlendMode: "soft-light", opacity: 0.16 }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.32) 100%)" }} />

        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {threads.map((e, i) => (
            <rect key={i} x={e.x + (e.w > e.h ? 0 : boil)} y={e.y + (e.w > e.h ? boil : 0)} width={e.w} height={e.h} fill={style.accent} />
          ))}
          {fin
            ? items.slice(1).map((_, i) => (
                <rect key={`s${i}`} x={(i + 1) * bw - 3} y={(i % 2 === 0 ? 0 : 1 - seams) * H} width={6} height={seams * H} fill={style.bg} />
              ))
            : null}
        </svg>

        {/* Text pocket and the line: lead stays, the word under it swaps per photo. */}
        <AbsoluteFill style={{ justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.5, background: textPocket, opacity: pocket }} />
          <div style={{ position: "relative", padding: `0 ${margin}px ${wide ? 92 : 80}px` }}>
            {leadWords.length ? (
              <div style={{ fontFamily: style.display, fontWeight: 600, fontSize: leadSize, lineHeight: 1.12, color: style.ink, marginBottom: 6 }}>
                {leadWords.map((w, i) => {
                  const p = enter(style, frame, fps, leadAt + i * 0.08, 0.6);
                  return (
                    <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", marginRight: "0.1em", marginLeft: "-0.16em", padding: "0.18em 0.16em 4px", marginTop: "-0.18em" }}>
                      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{w}</span>
                    </span>
                  );
                })}
              </div>
            ) : null}
            <div style={{ position: "relative", height: wordSize * 1.22, overflow: "hidden" }}>
              {swapSlots.map((s, k) => {
                const nextAt = swapSlots[k + 1]?.at ?? Infinity;
                if (t < s.at - 0.4 || t > nextAt) return null;
                const inP = enter(style, frame, fps, s.at - 0.12, 0.6);
                const out = !Number.isFinite(nextAt) ? 0 : interpolate(t, [nextAt - 0.28, nextAt - 0.02], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
                const line = enter({ ...style, motion: "calm" }, frame, fps, s.at + 0.45, 0.5);
                return (
                  <div key={k} style={{ position: "absolute", left: 0, bottom: wordSize * 0.14, transform: `translateY(${(1 - inP) * 110 - out * 115}%)`, whiteSpace: "nowrap" }}>
                    <span style={{ position: "relative", display: "inline-block", fontFamily: style.display, fontWeight: 700, fontSize: wordSize, lineHeight: 1, color: style.ink }}>
                      {s.word}
                      <span style={{ position: "absolute", left: 0, right: 0, bottom: -wordSize * 0.06, height: Math.max(6, wordSize * 0.07), borderRadius: style.radius ? 999 : 0, background: style.accent, transform: `scaleX(${line})`, transformOrigin: "left center" }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>

        {/* Metadata pill: which photo of how many, plus its tag. */}
        <div
          style={{
            position: "absolute",
            left: margin,
            top: wide ? 72 : 60,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 22px",
            borderRadius: style.radius ? 999 : 0,
            background: style.surface,
            border: `2px solid color-mix(in srgb, ${style.ink} 22%, transparent)`,
            color: style.ink,
            opacity: pillIn,
            transform: `translateY(${(1 - pillIn) * -30}px)`,
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          }}
        >
          <span style={{ ...mono, color: style.accent }}>{`${String(fin && t >= finAt - 0.1 ? n : cur + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`}</span>
          {pillTag ? <span style={{ ...mono, fontWeight: 400, opacity: cur === 0 ? 1 : pillChange, transform: `translateY(${(1 - (cur === 0 ? 1 : pillChange)) * 14}px)` }}>{pillTag}</span> : null}
        </div>
      </AbsoluteFill>
    );
  },
});
