// Frame break: a clip or image sits inside a designed frame (poster, phone, polaroid), then cracks it on a spoken word: the frame shatters into pieces that fly off while the footage grows past the edges to fill the screen, with a slow push and an optional caption strip.
import { useId } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import type { Style } from "../contract";
import { defineTemplate } from "../contract";
import { clamp01, cueAt, enter, MediaFill, useT } from "../motion";

const schema = z.object({
  frame: z.enum(["poster", "phone", "polaroid"]).default("poster").describe("The object the footage starts in: poster (taped print with a label strip), phone (portrait screen), polaroid (square photo with a handwritten margin)"),
  frameLabel: z.string().max(22).optional().describe("Words printed on the frame before it breaks: the poster's strip or the polaroid's handwritten margin. Ignored for phone"),
  breakWord: z.string().optional().describe("Spoken word the frame shatters on and the footage takes over the screen"),
  caption: z.string().max(36).optional().describe("Caption strip over the footage after the break, a few words"),
  captionWord: z.string().optional().describe("Spoken word the caption lands on"),
});

type Rect = { x: number; y: number; w: number; h: number; r: number };
type Pt = [number, number];

// Seeded randomness, so every render of the same props shatters the same way.
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

const roundRect = ({ x, y, w, h, r }: Rect) => {
  const k = Math.min(r, w / 2, h / 2);
  return `M${x + k},${y}H${x + w - k}A${k},${k} 0 0 1 ${x + w},${y + k}V${y + h - k}A${k},${k} 0 0 1 ${x + w - k},${y + h}H${x + k}A${k},${k} 0 0 1 ${x},${y + h - k}V${y + k}A${k},${k} 0 0 1 ${x + k},${y}Z`;
};

// Where a ray from (cx, cy) at angle a leaves an axis-aligned rect that contains the origin.
const rayExit = (cx: number, cy: number, a: number, b: Rect): Pt => {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const tx = dx > 0 ? (b.x + b.w - cx) / dx : dx < 0 ? (b.x - cx) / dx : Infinity;
  const ty = dy > 0 ? (b.y + b.h - cy) / dy : dy < 0 ? (b.y - cy) / dy : Infinity;
  const t = Math.min(tx, ty);
  return [cx + dx * t, cy + dy * t];
};

const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

// The rect corners whose angle from the centre lies strictly between a0 and a1 (going clockwise in screen space), in order.
const cornersBetween = (cx: number, cy: number, a0: number, a1: number, b: Rect, reverse = false) => {
  const span = norm(a1 - a0);
  const cs: Pt[] = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.h],
    [b.x, b.y + b.h],
  ];
  const hits = cs
    .map((p) => ({ p, d: norm(Math.atan2(p[1] - cy, p[0] - cx) - a0) }))
    .filter((c) => c.d > 0 && c.d < span)
    .sort((m, n) => m.d - n.d)
    .map((c) => c.p);
  return reverse ? hits.reverse() : hits;
};

// Frame geometry in local px (origin at the frame's centre), scaled from the canvas height.
const geometry = (kind: "poster" | "phone" | "polaroid", H: number, style: Style) => {
  const u = H / 1080;
  if (kind === "phone") {
    const fh = 900 * u;
    const fw = 440 * u;
    const bez = 18 * u;
    const outer: Rect = { x: -fw / 2, y: -fh / 2, w: fw, h: fh, r: 72 * u };
    const win: Rect = { x: outer.x + bez, y: outer.y + bez, w: fw - 2 * bez, h: fh - 2 * bez, r: 56 * u };
    return { outer, win, tilt: -3, pieces: 8, seed: 31 };
  }
  if (kind === "polaroid") {
    const fw = 660 * u;
    const fh = 790 * u;
    const m = 34 * u;
    const outer: Rect = { x: -fw / 2, y: -fh / 2, w: fw, h: fh, r: Math.min(style.radius, 8) * 0.5 * u };
    const win: Rect = { x: outer.x + m, y: outer.y + m, w: fw - 2 * m, h: fw - 2 * m, r: 0 };
    return { outer, win, tilt: 3, pieces: 9, seed: 17 };
  }
  const fw = 640 * u;
  const fh = 860 * u;
  const m = 34 * u;
  const outer: Rect = { x: -fw / 2, y: -fh / 2, w: fw, h: fh, r: Math.min(style.radius, 8) * 0.4 * u };
  const win: Rect = { x: outer.x + m, y: outer.y + m, w: fw - 2 * m, h: fh - m - 128 * u, r: Math.min(style.radius, 8) * 0.25 * u };
  return { outer, win, tilt: -2.5, pieces: 9, seed: 7 };
};

export default defineTemplate({
  id: "frame-break",
  title: "Frame break",
  mode: "stock",
  layouts: ["full"],
  useFor:
    "Bringing in a clip or image with an event: it starts inside a frame (a taped poster, a phone, a polaroid) and on the break word the frame shatters and the footage spills past its edges to fill the screen. Good for 'look at this', a reveal, the first time real material appears, a story photo coming alive. Slot 0: the clip or image (its focus point is kept in the frame window). If slot 0 has a matte (subject cut out), the subject stands in front of the frame before the break.",
  avoid: "More than once per video (the break is a special moment), clips under 3 s, or footage whose key detail is at the edge (the frame window shows the focus area first). Use footage-reveal for a calm entrance.",
  schema,
  example: { frame: "polaroid", frameLabel: "subset sum, page 1", breakWord: "open", caption: "From brute force to a DP table", captionWord: "table" },
  exampleMedia: [{ src: "media/screen.mp4", kind: "video", focus: [0.45, 0.4] }],
  exampleCues: [
    { at: 0.7, end: 1.0, word: "These" },
    { at: 1.05, end: 1.3, word: "are" },
    { at: 1.35, end: 1.5, word: "my" },
    { at: 1.55, end: 1.95, word: "notes" },
    { at: 2.15, end: 2.5, word: "open" },
    { at: 2.55, end: 2.7, word: "them" },
    { at: 2.75, end: 2.95, word: "up" },
    { at: 3.3, end: 3.45, word: "and" },
    { at: 3.5, end: 3.7, word: "it's" },
    { at: 3.75, end: 3.85, word: "a" },
    { at: 3.9, end: 4.3, word: "table" },
  ],
  seconds: { min: 3, max: 8, demo: 6 },
  mediaSlots: 1,
  credit: { name: "\"Poster breaking its frame\" by @pankajkumar_dev", url: "https://prompt-motion.com/pankajkumar-dev-0bee87" },
  status: "draft",
  Component: ({ props, style, width: W, height: H, duration, media, cues }) => {
    const { t, frame, fps } = useT();
    const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
    const clip = media[0];
    const kind = props.frame ?? "poster";
    const u = H / 1080;
    const G = geometry(kind, H, style);

    // Timing: the frame lands, the break waits for its word, the shards are gone and the caption settled 0.6 s before the end.
    const breakAt = Math.min(Math.max(cueAt(cues, props.breakWord, duration * 0.3), 0.85), Math.max(0.85, duration - 2.0));
    const breakDur = style.motion === "calm" ? 0.8 : 0.6;
    // The caption waits until the shards have cleared and the window has all but landed, so the break and the caption read as two events, not one long churn.
    const captionAt = Math.min(Math.max(cueAt(cues, props.captionWord, breakAt + 1.4), breakAt + breakDur + 0.6), duration - 1.2);
    const crackAt = breakAt - 0.32;

    // Frame arrives from depth: drops, unrotates and sharpens onto its rest pose.
    const land = enter(style, frame, fps, 0.05, 0.75);
    const inhale = interpolate(t, [crackAt, breakAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
    const s = (1.18 - 0.18 * land) * (1 - 0.035 * inhale);
    const rot = G.tilt + 5 * (1 - land);
    const cx = W / 2;
    const cy = H / 2 + 70 * u * (1 - land);

    // The break: one expo-out expansion of the window to full bleed; calm styles take it a touch slower.
    const g = interpolate(t, [breakAt, breakAt + breakDur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    const broken = t >= breakAt;
    // The slow push starts only once the window has landed, so the break settles before the camera moves again.
    const pushFrom = breakAt + breakDur;
    const push = 1 + 0.035 * interpolate(t, [pushFrom, Math.max(pushFrom + 0.5, duration)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });

    // Window in screen space: from the frame's hole (rotated, scaled) to the whole canvas.
    const rad = (rot * Math.PI) / 180;
    const wcx = G.win.x + G.win.w / 2;
    const wcy = G.win.y + G.win.h / 2;
    const startCx = cx + s * (wcx * Math.cos(rad) - wcy * Math.sin(rad));
    const startCy = cy + s * (wcx * Math.sin(rad) + wcy * Math.cos(rad));
    const bleed = 6;
    const ww = interpolate(g, [0, 1], [G.win.w * s + 2, W + bleed]);
    const wh = interpolate(g, [0, 1], [G.win.h * s + 2, H + bleed]);
    const wx = interpolate(g, [0, 1], [startCx, W / 2]);
    const wy = interpolate(g, [0, 1], [startCy, H / 2]);
    const wrot = rot * (1 - g);
    const wr = G.win.r * s * (1 - g);

    // Footage inside the window: canvas-sized, its focus point centred in the hole, then centred on the canvas after the break.
    const [fx, fy] = clip?.focus ?? [0.5, 0.5];
    const clampO = (o: number, room: number) => Math.max(-room, Math.min(room, o));
    const o0x = clampO((0.5 - fx) * W, (W - G.win.w) / 2) * s;
    const o0y = clampO((0.5 - fy) * H, (H - G.win.h) / 2) * s;
    const m = interpolate(g, [0, 1], [s, push]);
    const ox = o0x * (1 - g);
    const oy = o0y * (1 - g);
    const innerStyle = { position: "absolute" as const, left: ww / 2 + ox - (W * m) / 2, top: wh / 2 + oy - (H * m) / 2, width: W * m, height: H * m };
    const windowBox = { position: "absolute" as const, left: wx - ww / 2, top: wy - wh / 2, width: ww, height: wh, transform: `rotate(${wrot}deg)` };

    // Shards: wedges of the frame cut by rays from the window centre, out to a bound that includes tape and overhangs.
    const rand = rng(G.seed);
    const bound: Rect = { x: G.outer.x - 110 * u, y: G.outer.y - 110 * u, w: G.outer.w + 220 * u, h: G.outer.h + 220 * u, r: 0 };
    const step = (2 * Math.PI) / G.pieces;
    const angles = Array.from({ length: G.pieces }, (_, i) => -Math.PI / 2 + 0.3 + i * step + (rand() - 0.5) * step * 0.5);
    const winBox: Rect = { ...G.win, r: 0 };
    const shards = angles.map((a0, i) => {
      const a1 = (angles[(i + 1) % G.pieces] ?? a0 + step) + (i === G.pieces - 1 ? 2 * Math.PI : 0);
      const P0 = rayExit(wcx, wcy, a0, winBox);
      const P1 = rayExit(wcx, wcy, a1, winBox);
      const Q0 = rayExit(wcx, wcy, a0, bound);
      const Q1 = rayExit(wcx, wcy, a1, bound);
      const poly: Pt[] = [P0, ...cornersBetween(wcx, wcy, a0, a1, winBox), P1, Q1, ...cornersBetween(wcx, wcy, a0, a1, bound, true), Q0];
      const mid = (a0 + a1) / 2;
      const ins = poly.filter((p) => Math.abs(p[0]) <= G.outer.w / 2 + 1 && Math.abs(p[1]) <= G.outer.h / 2 + 1);
      const pv = (ins.length ? ins : poly).reduce<Pt>((acc, p, _, arr) => [acc[0] + p[0] / arr.length, acc[1] + p[1] / arr.length], [0, 0]);
      return {
        poly,
        crack: [P0, rayExit(wcx, wcy, a0, { ...G.outer, r: 0 })] as [Pt, Pt],
        pivot: pv,
        dir: [Math.cos(mid), Math.sin(mid)] as Pt,
        speed: (2300 + rand() * 900) * u,
        spin: (rand() < 0.5 ? -1 : 1) * (140 + rand() * 200),
        delay: rand() * 0.06,
      };
    });

    const crack = clamp01((t - crackAt) / 0.3);
    const boil = style.motion === "hand" ? Math.floor(t * 8) : 0;

    // The frame as a designed object, drawn once per shard and clipped to it, so every piece carries its part of the print.
    const FrameArt = () => {
      const body = `${roundRect(G.outer)}${roundRect(G.win)}`;
      const jit = (k: number) => (style.motion === "hand" ? (rng(boil * 13 + k)() - 0.5) * 3 * u : 0);
      const outline: Rect = { x: G.outer.x + jit(1), y: G.outer.y + jit(2), w: G.outer.w + jit(3), h: G.outer.h + jit(4), r: G.outer.r };
      if (kind === "phone") {
        return (
          <g>
            <rect x={G.outer.w / 2 - 6 * u} y={G.outer.y + 190 * u} width={12 * u} height={110 * u} rx={5 * u} fill={style.ink} />
            <rect x={G.outer.x - 6 * u} y={G.outer.y + 160 * u} width={12 * u} height={70 * u} rx={5 * u} fill={style.ink} />
            <rect x={G.outer.x - 6 * u} y={G.outer.y + 250 * u} width={12 * u} height={70 * u} rx={5 * u} fill={style.ink} />
            <path d={body} fillRule="evenodd" fill={style.ink} />
            <path d={roundRect({ ...G.outer, x: G.outer.x + 4 * u, y: G.outer.y + 4 * u, w: G.outer.w - 8 * u, h: G.outer.h - 8 * u, r: G.outer.r - 4 * u })} fill="none" stroke={style.muted} strokeOpacity={0.45} strokeWidth={3 * u} />
            <rect x={-60 * u} y={G.win.y + 18 * u} width={120 * u} height={34 * u} rx={17 * u} fill={style.ink} />
            {style.motion === "hand" ? <path d={roundRect(outline)} fill="none" stroke={style.ink} strokeWidth={4 * u} /> : null}
          </g>
        );
      }
      const label = props.frameLabel;
      const marginTop = G.win.y + G.win.h;
      const marginH = G.outer.y + G.outer.h - marginTop;
      // Handwriting faces run small, so they get a larger size; an estimated width past the strip is squeezed to fit rather than clipped.
      const labelSize = (kind === "poster" ? 44 : 48) * (style.motion === "hand" ? 1.25 : 1) * u;
      const labelRoom = kind === "poster" ? G.win.w - 80 * u : G.win.w - 40 * u;
      const fit = label && label.length * labelSize * 0.56 > labelRoom ? { textLength: labelRoom, lengthAdjust: "spacingAndGlyphs" as const } : {};
      return (
        <g>
          <path d={body} fillRule="evenodd" fill={style.surface} />
          <path d={roundRect(G.win)} fill="none" stroke={style.ink} strokeOpacity={0.18} strokeWidth={2 * u} />
          <path d={roundRect(outline)} fill="none" stroke={style.motion === "hand" ? style.ink : style.muted} strokeOpacity={style.motion === "hand" ? 0.85 : 0.35} strokeWidth={(style.motion === "hand" ? 4 : 2) * u} />
          {kind === "poster" ? (
            <>
              <rect x={G.win.x} y={marginTop + marginH / 2 - 5 * u} width={56 * u} height={10 * u} rx={2 * u} fill={style.accent} />
              {label ? (
                <text x={G.win.x + 80 * u} y={marginTop + marginH / 2} dominantBaseline="central" fontFamily={style.display} fontWeight={700} fontSize={labelSize} fill={style.ink} {...fit}>
                  {label}
                </text>
              ) : null}
              <rect x={G.outer.x - 52 * u} y={G.outer.y - 6 * u} width={150 * u} height={46 * u} fill={style.accent2} opacity={0.6} transform={`rotate(-38 ${G.outer.x + 23 * u} ${G.outer.y + 17 * u})`} />
              <rect x={G.outer.x + G.outer.w - 98 * u} y={G.outer.y - 6 * u} width={150 * u} height={46 * u} fill={style.accent2} opacity={0.6} transform={`rotate(38 ${G.outer.x + G.outer.w - 23 * u} ${G.outer.y + 17 * u})`} />
            </>
          ) : (
            <>
              {label ? (
                <text x={0} y={marginTop + marginH / 2 + 4 * u} textAnchor="middle" dominantBaseline="central" fontFamily={style.display} fontWeight={600} fontSize={labelSize} fill={style.ink} {...fit}>
                  {label}
                </text>
              ) : null}
              <rect x={-85 * u} y={G.outer.y - 26 * u} width={170 * u} height={52 * u} fill={style.accent} opacity={0.5} transform={`rotate(-4 0 ${G.outer.y})`} />
            </>
          )}
        </g>
      );
    };

    const after = t - breakAt;
    const captionIn = enter(style, frame, fps, captionAt, 0.6);
    const captionText = enter(style, frame, fps, captionAt + 0.15, 0.55);
    const blob = (p: number, ph: number) => Math.sin((2 * Math.PI * t) / p + ph) * 40 * u;
    const surfaceFade = 1 - g;

    return (
      <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
        {/* Surface: base light, still dot grid, two slow colour fields. Covered by the footage after the break. */}
        {surfaceFade > 0 ? (
          <AbsoluteFill style={{ opacity: surfaceFade }}>
            <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 80% at 50% 46%, ${style.surface} 0%, ${style.bg} 72%)` }} />
            <AbsoluteFill style={{ backgroundImage: `radial-gradient(${style.muted} ${2 * u}px, transparent ${2.4 * u}px)`, backgroundSize: `${48 * u}px ${48 * u}px`, opacity: 0.22 }} />
            <div style={{ position: "absolute", left: W * 0.12 + blob(9, 0), top: H * 0.1 + blob(11, 1), width: 620 * u, height: 620 * u, borderRadius: "50%", background: style.accent, opacity: 0.13, filter: `blur(${120 * u}px)` }} />
            <div style={{ position: "absolute", left: W * 0.62 + blob(10, 2), top: H * 0.45 + blob(8, 3), width: 680 * u, height: 680 * u, borderRadius: "50%", background: style.accent2, opacity: 0.12, filter: `blur(${130 * u}px)` }} />
            {/* Contact shadow under the frame. */}
            <div style={{ position: "absolute", left: cx - G.outer.w * 0.55 * s, top: cy + (G.outer.h / 2) * s - 30 * u, width: G.outer.w * 1.1 * s, height: 70 * u, borderRadius: "50%", background: "rgba(0,0,0,0.35)", filter: `blur(${30 * u}px)`, opacity: land * (1 - inhale * 0.3) }} />
          </AbsoluteFill>
        ) : null}

        {/* The footage window: the frame's hole before the break, the whole canvas after it. */}
        <div style={{ ...windowBox, overflow: "hidden", borderRadius: wr, background: style.surface, opacity: broken ? 1 : land }}>
          <div style={innerStyle}>{clip ? <MediaFill media={clip} /> : null}</div>
        </div>

        {/* The breaking edge: an accent rim on the growing window, gone as it lands. */}
        {broken && g < 1 ? (
          <div style={{ ...windowBox, borderRadius: wr, border: `${7 * u}px solid ${style.accent}`, opacity: (1 - g) * 0.9, boxSizing: "border-box" }} />
        ) : null}

        {/* The frame and its shards. */}
        {after < 1.0 ? (
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: land }}>
            <defs>
              {shards.map((sh, i) => (
                <clipPath key={i} id={`fb${uid}-${i}`}>
                  <polygon points={sh.poly.map((p) => p.join(",")).join(" ")} />
                </clipPath>
              ))}
              <filter id={`fb${uid}-sh`} x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx={0} dy={14 * u} stdDeviation={16 * u} floodColor="black" floodOpacity={0.3} />
              </filter>
            </defs>
            <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`}>
              {shards.map((sh, i) => {
                const k = Math.max(0, after - sh.delay);
                const dx = broken ? sh.dir[0] * sh.speed * k : 0;
                const dy = broken ? sh.dir[1] * sh.speed * k + 0.5 * 3400 * u * k * k : 0;
                const a = broken ? sh.spin * k : 0;
                const depth = broken ? 1 + 0.9 * k : 1;
                return (
                  <g key={i} filter={broken ? `url(#fb${uid}-sh)` : undefined} transform={`translate(${dx} ${dy}) translate(${sh.pivot[0]} ${sh.pivot[1]}) rotate(${a}) scale(${depth}) translate(${-sh.pivot[0]} ${-sh.pivot[1]})`}>
                    <g clipPath={`url(#fb${uid}-${i})`}>
                      <FrameArt />
                    </g>
                  </g>
                );
              })}
              {!broken && crack > 0
                ? shards.map((sh, i) => {
                    const [[x0, y0], [x1, y1]] = sh.crack;
                    return <line key={i} x1={x0} y1={y0} x2={x0 + (x1 - x0) * crack} y2={y0 + (y1 - y0) * crack} stroke={style.bg} strokeWidth={5 * u} strokeLinecap="round" />;
                  })
                : null}
            </g>
          </svg>
        ) : null}

        {/* Optional cut-out subject: stands in front of the frame, so it already looks like it is stepping out. */}
        {clip?.matte ? (
          <div style={{ ...windowBox, opacity: broken ? 1 : land }}>
            <div style={innerStyle}>
              <MediaFill media={{ ...clip, src: clip.matte }} />
            </div>
          </div>
        ) : null}

        {/* Vignette in front of the lens. */}
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.32) 100%)", pointerEvents: "none" }} />

        {props.caption && t >= captionAt ? (
          <div
            style={{
              position: "absolute",
              left: 96 * u,
              bottom: 104 * u,
              display: "flex",
              alignItems: "stretch",
              background: style.surface,
              borderRadius: style.radius * 0.5 * u,
              boxShadow: `0 ${18 * u}px ${50 * u}px rgba(0,0,0,0.35)`,
              clipPath: `inset(-40% ${(1 - captionIn) * 100}% -40% -10%)`,
              overflow: "hidden",
            }}
          >
            <div style={{ width: 16 * u, background: style.accent }} />
            <div style={{ padding: `${20 * u}px ${40 * u}px ${22 * u}px ${30 * u}px`, overflow: "hidden" }}>
              <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: (style.motion === "hand" ? 72 : 64) * u, lineHeight: 1.12, color: style.ink, whiteSpace: "nowrap", transform: `translateY(${(1 - captionText) * 110}%)` }}>
                {props.caption}
              </div>
            </div>
          </div>
        ) : null}
      </AbsoluteFill>
    );
  },
});
