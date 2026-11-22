// Timeline path: 3–8 stops (a date or step plus a short title) along a line, curve or zigzag that draws ahead of the camera; the camera glides stop to stop on spoken words, passed stops shrink and dim, and the shot pulls back over the whole journey at the end.
import type { FC } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { defineTemplate, type Cue, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const ICONS = ["none", "person", "spark", "crown", "chip", "bulb", "chat", "book", "code", "flag", "rocket", "globe", "gear", "trophy"] as const;
type Icon = (typeof ICONS)[number];

const GLYPHS: Record<Exclude<Icon, "none">, string[]> = {
  person: ["M12 3.5a4 4 0 1 1 0 8a4 4 0 1 1 0-8z", "M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"],
  spark: ["M12 2.5l2.4 6.6l6.6 2.4l-6.6 2.4L12 20.5l-2.4-6.6L3 11.5l6.6-2.4z"],
  crown: ["M3.5 17.5L2.5 7l5.5 4.5L12 4.5l4 7L21.5 7l-1 10.5z", "M4 20.5h16"],
  chip: ["M7 7h10v10H7z", "M9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5"],
  bulb: ["M12 2.8a6.2 6.2 0 0 1 3.6 11.3c-.6.5-.9 1.1-.9 1.9v1.5H9.3V16c0-.8-.3-1.4-.9-1.9A6.2 6.2 0 0 1 12 2.8z", "M10 20.5h4"],
  chat: ["M4 4.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z", "M7.5 9h9M7.5 12.5h6"],
  book: ["M12 6.5c-2-1.6-5-2-8-1.5v13c3-.5 6-.1 8 1.5c2-1.6 5-2 8-1.5V5c-3-.5-6-.1-8 1.5z", "M12 6.5v13"],
  code: ["M8.5 7L3.5 12l5 5", "M15.5 7l5 5l-5 5", "M13.5 4.5l-3 15"],
  flag: ["M5 21V3.5", "M5 4h12.5l-2.5 4l2.5 4H5"],
  rocket: ["M12 2.5c3.5 2.5 5 6.5 4.2 11.5H7.8C7 9 8.5 5 12 2.5z", "M7.8 14L5 17.5h4M16.2 14l2.8 3.5h-4", "M10.5 17.5l1.5 3.5l1.5-3.5", "M12 7.5a1.8 1.8 0 1 1 0 3.6a1.8 1.8 0 1 1 0-3.6z"],
  globe: ["M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z", "M3 12h18", "M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"],
  gear: ["M12 8.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z", "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"],
  trophy: ["M7 3.5h10v5a5 5 0 0 1-10 0z", "M7 5.5H3.5c0 3 1.5 4.5 3.8 4.6M17 5.5h3.5c0 3-1.5 4.5-3.8 4.6", "M12 13.5v4", "M8 20.5h8M9.5 17.5h5"],
};

const Glyph: FC<{ icon: Exclude<Icon, "none">; size: number; color: string; draw: number; weight: number }> = ({ icon, size, color, draw, weight }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: -size / 2, top: -size / 2 }}>
    {GLYPHS[icon].map((d, i) => {
      const p = clamp01(draw * 1.35 - i * 0.15);
      return <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={p > 0.001 ? 1 : 0} />;
    })}
  </svg>
);

const stopSchema = z.object({
  kicker: z.string().min(1).max(12).describe("Date or step label above the title, e.g. '1956', 'Step 2', 'Week 3'"),
  title: z.string().min(1).max(28).describe("What happened at this stop, 1–4 words, e.g. 'AI gets its name'"),
  word: z.string().optional().describe("Spoken word the camera arrives on at this stop"),
  icon: z.enum(ICONS).default("none").describe("Tiny line icon in the stop's marker: person, spark, crown, chip, bulb, chat, book, code, flag, rocket, globe, gear, trophy, or none (a dot)"),
});

const schema = z.object({
  stops: z.array(stopSchema).min(3).max(8).describe("The stops in order, 3–8 (4–6 read best); each gets about 1.3 s or more of narration"),
  shape: z.enum(["line", "curve", "zigzag"]).default("curve").describe("line: a straight road; curve: a gentle wave with stops on its crests; zigzag: sharp turns at each stop"),
  showProgress: z.boolean().default(true).describe("Show a small 'stop 3 of 6' progress marker in the top-right corner"),
});

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const sine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const pull = Easing.out(Easing.cubic);

type Move = { a: number; b: number; x: number; ease: (x: number) => number };

const TimelinePath: FC<{ props: z.infer<typeof schema>; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm = { ...style, motion: "calm" as const };
  const { stops, shape } = props;
  const n = stops.length;

  // Sizes at 1080p (world = screen at scale 1 on the current stop).
  const titleSize = hand ? 98 : 82;
  const kickerSize = hand ? 52 : 46;
  const labelW = Math.min(660, W * 0.36);
  const D = Math.max(W * 0.3, labelW * 0.6);
  const cy = H * 0.5;
  const A = shape === "line" ? 0 : H * (shape === "zigzag" ? 0.12 : 0.1);
  const R = 42;
  const gap = R + 36;
  const xs = stops.map((_, i) => i * D);
  const side = (i: number) => (i % 2 === 0 ? -1 : 1); // -1: label above the path, 1: below
  const yAt = (x: number) => {
    if (shape === "line") return cy;
    const u = x / D;
    if (shape === "curve") return cy - A * Math.cos(Math.PI * u);
    const i = Math.floor(u);
    const f = u - i;
    return cy + A * lerp(side(i), side(i + 1), f);
  };
  const ys = xs.map(yAt);

  // When each stop is spoken: the cue, else spread over the time left after the intro and before the closing pull-back; kept ≥ 0.75 s apart and settled 0.6 s before the end.
  const reserve = duration >= 7 ? 1.3 : 0;
  const f0 = Math.min(0.8, duration * 0.12);
  const fl = Math.max(f0 + 0.75 * (n - 1), duration - 0.6 - 1.0 - reserve);
  const words: number[] = [];
  stops.forEach((s, i) => {
    const fb = f0 + (i * (fl - f0)) / (n - 1);
    let w = Math.max(cueAt(cues, s.word, fb), i === 0 ? 0.55 : words[i - 1]! + 0.75);
    w = Math.min(w, duration - 0.6 - 0.8 - (n - 1 - i) * 0.75);
    words.push(Math.max(w, 0.35 + i * 0.6));
  });
  // Picture lands just ahead of the word: camera settles, marker pops, then kicker and title.
  const arrive = words.map((w) => w - 0.25);
  const markAt = words.map((w) => w - 0.2);

  // Camera along the path: glides stop to stop (0.5–0.9 s, sine), then pulls back over the whole journey if there is time.
  const moves: Move[] = [];
  arrive.forEach((b, i) => {
    const prev = i === 0 ? 0 : arrive[i - 1]!;
    const dur = Math.min(0.8, Math.max(0.45, (b - prev) * 0.45));
    moves.push({ a: Math.max(prev, b - dur), b, x: xs[i]!, ease: sine });
  });
  let trackX = -0.55 * D;
  for (const m of moves) {
    if (t >= m.b) {
      trackX = m.x;
      continue;
    }
    if (t > m.a) trackX = lerp(trackX, m.x, m.ease((t - m.a) / (m.b - m.a)));
    break;
  }
  const lastX = xs[n - 1]!;
  const pullA = words[n - 1]! + 0.9;
  const pullB = duration - 0.6;
  const hasPull = pullB - pullA >= 0.8;
  const span = lastX + labelW;
  // Never below 0.62, so kickers stay ≥ 28 px; stops that don't fit fade at the frame edge instead of clipping.
  const sWide = Math.min(0.92, Math.max(0.62, (W * 0.9) / span));
  // The last stop's label keeps clear of the edge fade zone.
  const wideX = Math.max(lastX / 2, lastX + labelW / 2 - (W / 2 - 180) / sWide);
  const w = hasPull ? pull(clamp01((t - pullA) / (pullB - pullA))) : 0;
  const camX = lerp(trackX, wideX, w);
  const trackY = cy + 0.2 * (yAt(trackX) - cy);
  const camY = lerp(trackY, cy, w);
  const s = lerp(1, sWide, w) * (1 + 0.006 * Math.sin((2 * Math.PI * t) / 9));
  const ox = W / 2 - camX * s + 3 * Math.sin((2 * Math.PI * t) / 7.3);
  const oy = H / 2 - camY * s + 2.5 * Math.sin((2 * Math.PI * t) / 8.7 + 1);

  // The path's drawn head leads the camera: it reaches past the next stop just before the camera glides there.
  const lead = D * 0.38;
  let headX = -0.3 * D;
  let headMoving = 0;
  for (let i = 0; i < n; i++) {
    const m = moves[i]!;
    const a = m.a - 0.15;
    const b = m.b - 0.05;
    const to = xs[i]! + (i === n - 1 ? lead * 0.6 : lead);
    if (t >= b) {
      headX = to;
      continue;
    }
    if (t > a) {
      const p = (t - a) / (b - a);
      headX = lerp(headX, to, pull(p));
      headMoving = Math.sin(Math.PI * p);
    }
    break;
  }
  const startX = -2.2 * D;
  const pts = (x0: number, x1: number) => {
    const out: string[] = [];
    const step = 14;
    for (let x = x0, k = 0; ; x += step, k++) {
      const xx = Math.min(x, x1);
      // Hand temperament boils the line only: points wobble a couple of px, redrawn 8 times a second.
      const j = hand ? (hash(k * 3.1 + Math.floor(t * 8) * 17.3) - 0.5) * 3 : 0;
      out.push(`${xx.toFixed(1)} ${(yAt(xx) + j).toFixed(1)}`);
      if (xx >= x1) break;
    }
    return `M${out.join(" L")}`;
  };
  const corner = shape === "zigzag" ? "miter" : "round";

  // Passed and closing states per stop.
  // A stop dims mid-way through the glide away from it, so it stays readable as long as possible.
  const passed = stops.map((_, i) => (i < n - 1 ? enter(calm, frame, fps, Math.max(moves[i + 1]!.a, arrive[i + 1]! - 0.4), 0.55) : 0));
  const current = (() => {
    let c = -1;
    markAt.forEach((m, i) => {
      if (t >= m) c = i;
    });
    return c;
  })();

  // Background: far ghost kicker at 0.3 parallax, a ruler at 0.65 parallax.
  const ghostSize = (k: string) => Math.min(H * 0.42, (W * 1.05) / Math.max(1, k.length * 0.62));
  const rulerOff = -((camX * s * 0.65) % 160);
  const prog = props.showProgress ? enter(style, frame, fps, Math.max(0.1, markAt[0]! - 0.2), 0.6) : 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(60% 60% at 82% 92%, ${mix(style.accent, 10)} 0%, transparent 70%), radial-gradient(120% 95% at 25% 10%, ${mix(style.surface, 80, style.bg)} 0%, ${style.bg} 70%)`,
        overflow: "hidden",
      }}
    >
      {/* Far layer (0.3 parallax): the nearby stop's kicker as ghost type. */}
      {stops.map((st, i) => {
        const d = Math.abs(xs[i]! - camX);
        const o = 0.055 * clamp01(1 - d / (D * 0.75)) * (1 - w) * enter(calm, frame, fps, markAt[i]! - 0.3, 0.8);
        if (o <= 0.002) return null;
        const gs = ghostSize(st.kicker);
        return (
          <div
            key={`g${i}`}
            style={{
              position: "absolute",
              left: W / 2 + (xs[i]! - camX) * 0.3,
              top: H * 0.5 - side(i) * H * 0.06,
              transform: "translate(-50%, -50%)",
              fontFamily: style.display,
              fontWeight: 800,
              fontSize: gs,
              lineHeight: 1,
              whiteSpace: "nowrap",
              color: style.ink,
              opacity: o,
              letterSpacing: hand ? 0 : "-0.04em",
            }}
          >
            {st.kicker}
          </div>
        );
      })}

      {/* Mid layer (0.65 parallax): a ruler along the bottom edge. */}
      <svg width={W + 320} height={60} style={{ position: "absolute", left: rulerOff - 160, top: H - 64 }}>
        {Array.from({ length: Math.ceil((W + 320) / 32) + 1 }, (_, k) => (
          <line key={k} x1={k * 32} x2={k * 32} y1={k % 5 === 0 ? 18 : 34} y2={60} stroke={style.muted} strokeWidth={k % 5 === 0 ? 3 : 2} opacity={k % 5 === 0 ? 0.4 : 0.25} />
        ))}
      </svg>

      {/* The world, inside the camera rig. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, transform: `translate(${ox}px, ${oy}px) scale(${s})`, transformOrigin: "0 0" }}>
        <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d={pts(startX, Math.max(startX + 1, headX))} fill="none" stroke={hand ? mix(style.ink, 60) : mix(style.ink, 24)} strokeWidth={hand ? 5 : 4} strokeLinecap="round" strokeLinejoin={corner} />
          <path d={pts(startX, Math.max(startX + 1, Math.min(headX, trackX)))} fill="none" stroke={style.accent} strokeWidth={hand ? 7 : 7} strokeLinecap="round" strokeLinejoin={corner} />
          {headMoving > 0.01 ? (
            <g opacity={headMoving}>
              <circle cx={headX} cy={yAt(headX)} r={22} fill={mix(style.accent, 22)} />
              <circle cx={headX} cy={yAt(headX)} r={8} fill={style.accent} />
            </g>
          ) : null}
          {/* Upcoming stops: hollow dots once the path reaches them. */}
          {stops.map((_, i) => {
            const vis = clamp01((headX - xs[i]!) / 40) * (1 - clamp01((t - markAt[i]!) / 0.15));
            if (vis <= 0.001) return null;
            return <circle key={`u${i}`} cx={xs[i]} cy={ys[i]} r={11} fill={style.bg} stroke={style.muted} strokeWidth={4} opacity={vis} />;
          })}
        </svg>

        {stops.map((st, i) => {
          const m = enter(style, frame, fps, markAt[i]!, 0.5);
          if (m <= 0.001 && t < markAt[i]!) return null;
          const p = passed[i]! * (1 - w);
          const restore = w * (i === n - 1 ? 0 : 1);
          const sc = lerp(1, 0.66, passed[i]!) * (1 - restore) + restore;
          const op = lerp(1, 0.42, passed[i]!) * (1 - restore) + 0.88 * restore;
          // Labels fade as they reach the frame edge rather than being cut off by it.
          const half = (labelW / 2) * sc * s;
          const sx = ox + xs[i]! * s;
          const edge = clamp01((sx - half - 24) / 140) * clamp01((W - 24 - (sx + half)) / 140);
          const stem = enter(calm, frame, fps, markAt[i]! + 0.06, 0.3);
          const kick = enter(style, frame, fps, words[i]! - 0.1, 0.55);
          const tit = enter(style, frame, fps, words[i]! - 0.02, 0.7);
          const draw = enter(calm, frame, fps, markAt[i]! + 0.1, 0.55);
          const ringT = (t - markAt[i]!) / 0.7;
          const dir = side(i);
          const x = xs[i]!;
          const y = ys[i]!;
          const icon = (st.icon ?? "none") as Icon;
          const fill = mix(style.surface, p * 100, style.accent);
          const iconColor = mix(style.accent, p * 100, style.bg);
          const rot = hand ? (hash(i * 7.3) - 0.5) * 3 : 0;
          return (
            <div key={`s${i}`} style={{ position: "absolute", left: x, top: y, opacity: op }}>
              {/* Marker. */}
              <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${sc * m}) rotate(${rot}deg)` }}>
                {ringT > 0 && ringT < 1 ? (
                  <div style={{ position: "absolute", left: -R, top: -R, width: R * 2, height: R * 2, borderRadius: "50%", border: `4px solid ${style.accent}`, transform: `scale(${1 + ringT * 1.2})`, opacity: (1 - ringT) * 0.8, boxSizing: "border-box" }} />
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    left: -R,
                    top: -R,
                    width: R * 2,
                    height: R * 2,
                    borderRadius: "50%",
                    background: fill,
                    border: `${hand ? 4 : 4}px solid ${hand ? style.ink : style.accent}`,
                    boxSizing: "border-box",
                    boxShadow: `0 10px 28px rgba(0,0,0,${0.18 * (1 - p)})`,
                  }}
                />
                {icon !== "none" ? (
                  <Glyph icon={icon} size={R * 1.1} color={iconColor} draw={draw} weight={hand ? 2.1 : 1.9} />
                ) : (
                  <div style={{ position: "absolute", left: -R * 0.3, top: -R * 0.3, width: R * 0.6, height: R * 0.6, borderRadius: "50%", background: iconColor }} />
                )}
              </div>
              {/* Stem from marker to label. */}
              <div style={{ position: "absolute", left: -1.5, width: 3, background: hand ? style.ink : mix(style.ink, 40), opacity: 0.8, top: dir < 0 ? -(R + 26) * sc : R * sc, height: 26 * sc * stem }} />
              {/* Label: rises out of the path above it, drops below it. */}
              <div
                style={{
                  position: "absolute",
                  left: -labelW / 2,
                  width: labelW,
                  ...(dir < 0 ? { bottom: gap * sc } : { top: gap * sc }),
                  transform: `scale(${sc})`,
                  transformOrigin: dir < 0 ? "50% 100%" : "50% 0%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  opacity: edge,
                }}
              >
                <div
                  style={{
                    fontFamily: hand ? style.display : style.mono,
                    fontWeight: hand ? 700 : 600,
                    fontSize: kickerSize,
                    letterSpacing: hand ? 0 : "0.04em",
                    color: style.accent,
                    opacity: kick,
                    transform: `translateY(${(1 - kick) * -dir * 18}px)`,
                    marginBottom: 6,
                  }}
                >
                  {st.kicker}
                </div>
                <div style={{ overflow: "hidden", padding: "0 8px 6px" }}>
                  <div
                    style={{
                      fontFamily: style.display,
                      fontWeight: hand ? 700 : 600,
                      fontSize: titleSize,
                      lineHeight: 1.04,
                      letterSpacing: hand ? 0 : "-0.02em",
                      color: style.ink,
                      transform: `translateY(${(1 - tit) * -dir * 105}%)`,
                    }}
                  >
                    {st.title}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* HUD outside the rig: progress pill in the top-right corner, then the vignette. */}
      {props.showProgress && prog > 0.001 ? (
        <div style={{ position: "absolute", right: 96, top: 64, display: "flex", alignItems: "center", gap: 18, opacity: prog, transform: `translateY(${(1 - prog) * -14}px)` }}>
          <svg width={(n - 1) * 26 + 16} height={16}>
            <line x1={8} x2={(n - 1) * 26 + 8} y1={8} y2={8} stroke={mix(style.muted, 50)} strokeWidth={3} />
            {current >= 0 ? <line x1={8} x2={8 + Math.min(n - 1, Math.max(0, (trackX / D))) * 26} y1={8} y2={8} stroke={style.accent} strokeWidth={3} /> : null}
            {stops.map((_, i) => (
              <circle key={i} cx={8 + i * 26} cy={8} r={6} fill={i <= current ? style.accent : style.bg} stroke={i <= current ? style.accent : style.muted} strokeWidth={2.5} />
            ))}
          </svg>
          <div style={{ fontFamily: style.mono, fontWeight: 600, fontSize: 30, color: style.muted, fontVariantNumeric: "tabular-nums", minWidth: 96, textAlign: "right" }}>
            {String(Math.max(1, current + 1)).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </div>
        </div>
      ) : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.16) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "timeline-path",
  title: "Timeline path",
  mode: "graphic",
  layouts: ["full"],
  useFor:
    "History and progressions: 'the history of AI', eras of a civilisation, the creator's own learning journey, the steps of a process. 3–8 stops (a date or step label plus a 1–4 word title, optional tiny icon) sit along a line, curve or zigzag that draws ahead of the camera. The camera glides to each stop on its spoken word; passed stops shrink and dim behind; at the end (segments ≥ 7 s) the camera pulls back over the whole journey. No media.",
  avoid:
    "Fewer than ~1.3 s of narration per stop (e.g. 6 stops in under 8 s), titles that need a sentence, comparisons with no order in time (use a list or comparison template), and numbers that are the point (use stat-punch).",
  schema,
  example: {
    stops: [
      { kicker: "1950", title: "Turing's imitation game", word: "Turing", icon: "person" },
      { kicker: "1956", title: "AI gets its name", word: "Dartmouth", icon: "spark" },
      { kicker: "1997", title: "Deep Blue beats Kasparov", word: "chess", icon: "crown" },
      { kicker: "2012", title: "AlexNet wins ImageNet", word: "AlexNet", icon: "chip" },
      { kicker: "2017", title: "Attention is all you need", word: "attention", icon: "bulb" },
      { kicker: "2022", title: "ChatGPT goes public", word: "ChatGPT", icon: "chat" },
    ],
    shape: "curve",
    showProgress: true,
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.8, end: 1.2, word: "Turing" },
    { at: 2.6, end: 3.2, word: "Dartmouth" },
    { at: 4.4, end: 4.8, word: "chess" },
    { at: 6.1, end: 6.6, word: "AlexNet" },
    { at: 7.7, end: 8.2, word: "attention" },
    { at: 9.2, end: 9.7, word: "ChatGPT" },
  ],
  seconds: { min: 5, max: 15, demo: 12 },
  mediaSlots: 0,
  credit: { name: "'History of AI timeline' by @kloss_xyz and 'Indian civilisation history film' by @BuildFastWithAI (prompt-motion.com)", url: "https://prompt-motion.com/kloss-xyz-fe0c31" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <TimelinePath props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
