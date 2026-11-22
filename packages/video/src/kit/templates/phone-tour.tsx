// Phone tour: an app walkthrough on a drawn phone. It swings up into frame, its screens swipe from one to the next on spoken words, and on each screen a callout rings one detail and draws a leader out to a label beside the phone while the camera pushes in on that detail.
import type { CSSProperties, FC, ReactElement } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Media, type Style } from "../contract";
import { clamp01, cueAt, enter, MediaFill, useT } from "../motion";

const calloutSchema = z.object({
  text: z.string().min(1).max(30).describe("The label beside the phone, sentence case, ≤ 30 characters: what this detail does for the viewer"),
  word: z.string().optional().describe("Spoken word the callout lands on (the ring draws just before it)"),
  row: z.number().int().min(0).max(3).optional().describe("list screens: which row (0-based) the callout rings; default 0"),
  point: z.tuple([z.number().min(0.1).max(0.9), z.number().min(0.1).max(0.9)]).optional().describe("media screens: the spot to ring, 0–1 of the screen (x, y); default the centre. Text screens ring their highlight instead"),
});

const screenSchema = z.object({
  kind: z
    .enum(["list", "text", "media"])
    .describe("list: an app screen with a title and 2–4 rows (each with a letter tile); text: a title and a short paragraph with one phrase that gets marker-highlighted (an article, a note, a message, a recipe step); media: slot N fills the screen (a real screenshot or a portrait clip)"),
  title: z.string().max(18).optional().describe("list and text: the screen's header, ≤ 18 characters"),
  rows: z.array(z.string().min(1).max(22)).min(2).max(4).optional().describe("list: 2–4 row labels, ≤ 22 characters each"),
  body: z.string().max(110).optional().describe("text: the paragraph shown on screen, ≤ 110 characters"),
  highlight: z.string().max(30).optional().describe("text: a phrase copied exactly from body; it is marker-highlighted (with the callout, if any)"),
  media: z.number().int().min(0).max(3).optional().describe("media: which media slot fills the screen; default 0"),
  swipeWord: z.string().optional().describe("Spoken word this screen swipes in on. Ignored for the first screen, which is there as the phone arrives"),
  callout: calloutSchema.optional().describe("One detail on this screen, ringed and labelled beside the phone"),
});

const schema = z
  .object({
    headline: z.string().max(34).optional().describe("One line beside the phone, above the callouts, ≤ 34 characters (e.g. the app's promise). Optional"),
    headlineWord: z.string().optional().describe("Spoken word the headline lands on; default just after the phone arrives"),
    screens: z.array(screenSchema).min(1).max(4).describe("The screens in order, 1–4; each swipes in from the right. Give each about 2.5 s or more if it has a callout"),
  })
  .superRefine((p, ctx) => {
    p.screens.forEach((s, i) => {
      if (s.kind === "list" && !s.rows?.length) ctx.addIssue({ code: "custom", message: "a list screen needs 2–4 rows", path: ["screens", i, "rows"] });
      if (s.kind === "list" && s.callout?.row !== undefined && s.callout.row >= (s.rows?.length ?? 0)) ctx.addIssue({ code: "custom", message: "callout.row must point at one of the rows", path: ["screens", i, "callout", "row"] });
      if (s.kind === "text" && !s.body?.trim()) ctx.addIssue({ code: "custom", message: "a text screen needs a body", path: ["screens", i, "body"] });
      if (s.kind === "text" && s.highlight && !s.body?.includes(s.highlight)) ctx.addIssue({ code: "custom", message: "highlight must be copied exactly from body", path: ["screens", i, "highlight"] });
      if (s.kind === "text" && s.callout && !s.highlight) ctx.addIssue({ code: "custom", message: "a text screen's callout rings its highlight: add one", path: ["screens", i, "highlight"] });
    });
  });

type Props = z.infer<typeof schema>;
type Screen = Props["screens"][number];

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
const range = (t: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

// A rounded rectangle as perimeter points, so the hand style can boil the phone's outline (a line, never the frame).
const boilRect = (x0: number, y0: number, w: number, h: number, r: number, t: number, amp: number) => {
  const N = 72;
  const tick = Math.floor(t * 8);
  const per = 2 * (w + h - 4 * r) + 2 * Math.PI * r;
  const at = (d: number): [number, number] => {
    const L = [w - 2 * r, (Math.PI / 2) * r, h - 2 * r, (Math.PI / 2) * r, w - 2 * r, (Math.PI / 2) * r, h - 2 * r, (Math.PI / 2) * r];
    let i = 0;
    while (i < 7 && d > L[i]!) d -= L[i++]!;
    const u = L[i]! > 0 ? d / L[i]! : 0;
    const arc = (cx: number, cy: number, a0: number): [number, number] => [cx + r * Math.cos(a0 + (u * Math.PI) / 2), cy + r * Math.sin(a0 + (u * Math.PI) / 2)];
    switch (i) {
      case 0: return [r + u * (w - 2 * r), 0];
      case 1: return arc(w - r, r, -Math.PI / 2);
      case 2: return [w, r + u * (h - 2 * r)];
      case 3: return arc(w - r, h - r, 0);
      case 4: return [w - r - u * (w - 2 * r), h];
      case 5: return arc(r, h - r, Math.PI / 2);
      case 6: return [0, h - r - u * (h - 2 * r)];
      default: return arc(r, r, Math.PI);
    }
  };
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const [x, y] = at((i / N) * per);
    pts.push(`${(x0 + x + (hash(i * 7.1 + tick * 13.7) - 0.5) * amp).toFixed(1)},${(y0 + y + (hash(i * 3.3 + tick * 5.9 + 50) - 0.5) * amp).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

// Greedy word wrap by estimated glyph width: which line a phrase starts on, so the leader meets the highlight.
const lineOfPhrase = (body: string, phrase: string, cap: number) => {
  const start = body.indexOf(phrase);
  let line = 0;
  let len = 0;
  let pos = 0;
  for (const word of body.split(" ")) {
    const add = len === 0 ? word.length : len + 1 + word.length;
    if (len > 0 && add > cap) {
      line++;
      len = word.length;
    } else len = add;
    if (start >= 0 && pos + word.length > start) return line;
    pos += word.length + 1;
  }
  return line;
};

type Geo = {
  u: number;
  cx: number;
  cy: number;
  pw: number;
  ph: number;
  bez: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  col0: number;
  col1: number;
  split: boolean;
};

const ROW_TOP = 180;
const ROW_H = 116;
const ROW_GAP = 16;
const BODY_TOP = 206;
const BODY_FS = 34;
const BODY_LH = 1.45;

type Colors = { body: string; screen: string; row: string; island: string; light: boolean; hand: boolean };

// Where a screen's callout points, in canvas px.
const targetOf = (s: Screen, g: Geo): [number, number] => {
  const { u } = g;
  if (s.kind === "list") {
    const k = s.callout?.row ?? 0;
    return [g.sx + g.sw - 24 * u, g.sy + (ROW_TOP + k * (ROW_H + ROW_GAP) + ROW_H / 2) * u];
  }
  if (s.kind === "text") {
    const cap = Math.floor((g.sw - 52 * u) / (BODY_FS * u * 0.53));
    const line = lineOfPhrase(s.body ?? "", s.highlight ?? "", cap);
    return [g.sx + g.sw - 18 * u, g.sy + BODY_TOP * u + (line + 0.5) * BODY_FS * BODY_LH * u];
  }
  const [px, py] = s.callout?.point ?? [0.5, 0.5];
  return [g.sx + px * g.sw + 64 * u, g.sy + py * g.sh];
};

type ScreenCtx = { style: Style; c: Colors; g: Geo; t: number; frame: number; fps: number; arrive: number; call: number; media: Media[] };

// One screen's content, laid out in screen px (origin at the screen's top-left).
const ScreenView = ({ s, x: ctx }: { s: Screen; x: ScreenCtx }): ReactElement => {
  const { style, c, g, t, frame, fps, arrive, call } = ctx;
  const { u } = g;
  const callP = call >= 0 ? enter(style, frame, fps, call, 0.45) : 0;
  const titleFs = (c.hand ? 54 : 46) * u;
  const title = s.title ? (
    <div style={{ position: "absolute", left: 26 * u, top: 92 * u, right: 26 * u, fontFamily: style.display, fontWeight: 700, fontSize: titleFs, lineHeight: 1.15, color: style.ink, whiteSpace: "nowrap", letterSpacing: c.hand ? 0 : "-0.02em", opacity: clamp01(enter(style, frame, fps, arrive + 0.05, 0.5)), transform: `translateY(${(1 - clamp01(enter(style, frame, fps, arrive + 0.05, 0.5))) * 18 * u}px)` }}>
      {s.title}
    </div>
  ) : null;

  // A generic tab bar along the bottom of drawn screens: four plain glyphs, the first one active.
  const bar = (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 112 * u, borderTop: `${1.5 * u}px solid ${mix(style.ink, c.hand ? 50 : 10)}`, background: mix(style.ink, 3, c.screen), display: "flex", justifyContent: "space-around", alignItems: "flex-start", paddingTop: 26 * u, boxSizing: "border-box", opacity: clamp01(enter(style, frame, fps, arrive + 0.1, 0.5)) }}>
      {[0, 1, 2, 3].map((k) => {
        const col = k === 0 ? style.accent : mix(style.ink, 35);
        const sz = 40 * u;
        return k % 2 === 0 ? (
          <div key={k} style={{ width: sz, height: sz, borderRadius: Math.min(style.radius, 12) * u, border: `${5 * u}px solid ${col}`, boxSizing: "border-box" }} />
        ) : (
          <div key={k} style={{ width: sz, height: sz, borderRadius: "50%", border: `${5 * u}px solid ${col}`, boxSizing: "border-box" }} />
        );
      })}
    </div>
  );

  if (s.kind === "list") {
    const rows = s.rows ?? [];
    const hit = s.callout ? (s.callout.row ?? 0) : -1;
    return (
      <>
        {title}
        {rows.map((r, k) => {
          const a = enter(style, frame, fps, arrive + 0.15 + k * 0.08, 0.55);
          const on = k === hit ? callP : 0;
          const tile = k % 2 === 0 ? style.accent : style.accent2;
          const tileOn = onColor(tile, style);
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 24 * u,
                top: (ROW_TOP + k * (ROW_H + ROW_GAP)) * u,
                width: g.sw - 48 * u,
                height: ROW_H * u,
                borderRadius: Math.min(style.radius, 20) * u,
                background: on > 0 ? mix(style.accent, 10 * on, c.row) : c.row,
                boxShadow: `inset 0 0 0 ${(c.hand ? 2.5 : 1.5) * u + 3 * on * u}px ${on > 0.02 ? mix(style.accent, 100 * on, mix(style.ink, c.hand ? 70 : 8)) : mix(style.ink, c.hand ? 70 : 8)}`,
                display: "flex",
                alignItems: "center",
                gap: 20 * u,
                padding: `0 ${20 * u}px`,
                boxSizing: "border-box",
                opacity: clamp01(a * 1.4),
                transform: `translateY(${(1 - a) * 44 * u}px) scale(${1 + 0.03 * on})`,
              }}
            >
              <div style={{ width: 62 * u, height: 62 * u, flexShrink: 0, borderRadius: Math.min(style.radius, 16) * u, background: tile, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.display, fontWeight: 700, fontSize: (c.hand ? 38 : 32) * u, color: tileOn }}>
                {r.trim().charAt(0).toUpperCase()}
              </div>
              <div style={{ fontFamily: style.body, fontWeight: 600, fontSize: 32 * u, lineHeight: 1.18, color: style.ink }}>{r}</div>
            </div>
          );
        })}
        {bar}
      </>
    );
  }

  if (s.kind === "text") {
    const body = s.body ?? "";
    const hl = s.highlight ?? "";
    const i = hl ? body.indexOf(hl) : -1;
    const markAt = call >= 0 ? call : arrive + 0.9;
    const mp = range(t, markAt, markAt + 0.5, Easing.out(Easing.cubic));
    const a = enter(style, frame, fps, arrive + 0.2, 0.6);
    const mark: CSSProperties = {
      backgroundImage: `linear-gradient(${mix(style.accent, 42)}, ${mix(style.accent, 42)})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${mp * 100}% 78%`,
      backgroundPosition: "0 75%",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
      borderRadius: 4 * u,
    };
    return (
      <>
        {title}
        {[0.62, 0.34].map((w, k) => (
          <div key={k} style={{ position: "absolute", left: 26 * u + k * (g.sw - 52 * u) * 0.66, top: 166 * u, width: (g.sw - 52 * u) * w * (k ? 0.9 : 0.95), height: 12 * u, borderRadius: 6 * u, background: mix(style.ink, 12), opacity: clamp01(a) }} />
        ))}
        <div style={{ position: "absolute", left: 26 * u, top: BODY_TOP * u, width: g.sw - 52 * u, fontFamily: style.body, fontWeight: 500, fontSize: BODY_FS * u, lineHeight: BODY_LH, color: style.ink, opacity: clamp01(a * 1.3), transform: `translateY(${(1 - a) * 30 * u}px)` }}>
          {i >= 0 ? (
            <>
              {body.slice(0, i)}
              <span style={mark}>{hl}</span>
              {body.slice(i + hl.length)}
            </>
          ) : (
            body
          )}
        </div>
        {/* Reading progress just above the tab bar. */}
        <div style={{ position: "absolute", left: 26 * u, right: 26 * u, bottom: 146 * u, height: 8 * u, borderRadius: 4 * u, background: mix(style.ink, 10), opacity: clamp01(a) }}>
          <div style={{ width: `${(18 + 22 * range(t, arrive + 0.3, arrive + 1.6)).toFixed(1)}%`, height: "100%", borderRadius: 4 * u, background: style.accent }} />
        </div>
        {bar}
      </>
    );
  }

  const m = ctx.media[s.media ?? 0];
  const [px, py] = s.callout?.point ?? [0.5, 0.5];
  const zoom = 1.04 + 0.05 * range(t, arrive, arrive + 6, Easing.inOut(Easing.sin));
  const ring = call >= 0 ? range(t, call, call + 0.5, Easing.out(Easing.cubic)) : 0;
  const pulse = call >= 0 ? range(t, call + 0.1, call + 0.8, Easing.out(Easing.cubic)) : 0;
  return (
    <>
      {m ? (
        <AbsoluteFill>
          <MediaFill media={m} zoom={zoom} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `repeating-linear-gradient(135deg, ${mix(style.ink, 6)} 0 ${18 * u}px, transparent ${18 * u}px ${36 * u}px)` }} />
      )}
      {/* Grade toward the style: a soft accent wash and a darkened top so the status bar reads. */}
      <AbsoluteFill style={{ background: style.accent, mixBlendMode: "soft-light", opacity: 0.22 }} />
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 18%)` }} />
      {call >= 0 ? (
        <svg width={g.sw} height={g.sh} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <circle cx={px * g.sw} cy={py * g.sh} r={64 * u} fill="none" stroke={style.accent} strokeWidth={6 * u} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} transform={`rotate(-90 ${px * g.sw} ${py * g.sh})`} />
          <circle cx={px * g.sw} cy={py * g.sh} r={64 * u + 50 * u * pulse} fill="none" stroke={style.accent} strokeWidth={4 * u} opacity={0.7 * (1 - pulse) * (pulse > 0 ? 1 : 0)} />
        </svg>
      ) : null}
    </>
  );
};

const PhoneTour: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[]; media: Media[] }> = ({ props, style, W, H, duration, cues, media }) => {
  const { t, frame, fps } = useT();
  const u = H / 1080;
  const split = W < 1400;
  const hand = style.motion === "hand";
  const light = lum(style.bg) > 0.5;
  const c: Colors = {
    hand,
    light,
    body: hand ? style.surface : light ? style.ink : mix(style.ink, 16, style.surface),
    screen: hand ? style.bg : light ? style.surface : style.bg,
    row: light || hand ? (hand ? style.surface : mix(style.ink, 5, style.surface)) : style.surface,
    island: hand ? style.ink : light ? style.ink : mix(style.ink, 10, style.bg),
  };

  // Geometry: the phone sits left of centre, the label column fills the space to its right.
  const ph = (split ? 860 : 900) * u;
  const pw = ph * 0.49;
  const cx = split ? W * 0.27 : W * 0.33;
  const cy = H / 2;
  const bez = 16 * u;
  const g: Geo = { u, cx, cy, pw, ph, bez, sx: cx - pw / 2 + bez, sy: cy - ph / 2 + bez, sw: pw - 2 * bez, sh: ph - 2 * bez, col0: cx + pw / 2 + (split ? 70 : 120) * u, col1: W - (split ? 48 : 96) * u, split };
  const colW = g.col1 - g.col0;

  // Timing: the phone arrives over ~0.9 s; each later screen swipes in on its word; each callout lands on its word; the last event has settled 0.6 s before the end.
  const screens = props.screens;
  const n = screens.length;
  const end = duration - 0.6;
  const INTRO = 0.9;
  const need = (s: Screen) => (s.callout ? 1.75 : 0.9);
  const seg = Math.max(1, (end - INTRO) / n);
  const S: number[] = [];
  const C: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = screens[i]!;
    if (i === 0) S.push(0.45);
    else {
      const lo = C[i - 1]! >= 0 ? C[i - 1]! + 1.15 : S[i - 1]! + 0.95;
      const hi = end - screens.slice(i).reduce((a, x) => a + need(x), 0) + 0.15;
      const want = cueAt(cues, s.swipeWord, INTRO + i * seg + 0.1) - 0.1;
      S.push(Math.max(lo, Math.min(hi, want)));
      if (C[i - 1]! >= 0) C[i - 1] = Math.min(C[i - 1]!, S[i]! - 1.0);
    }
    if (s.callout) {
      const lo = Math.max(S[i]! + 0.6, i === 0 ? 1.1 : 0);
      const hi = end - 0.95;
      const want = cueAt(cues, s.callout.word, Math.max(lo, S[i]! + seg * 0.35) + 0.1) - 0.1;
      C.push(Math.max(lo, Math.min(hi, want)));
    } else C.push(-1);
  }
  const arriveOf = (i: number) => (i === 0 ? 0.45 : S[i]! + 0.05);

  let cur = 0;
  for (let i = 1; i < n; i++) if (t >= S[i]! - 0.12) cur = i;
  const swipeQ = cur === 0 ? 1 : Math.min(1, enter(style, frame, fps, S[cur]! - 0.12, 0.55));

  // Phone entry: rises and swings flat with the style's temperament.
  const rise = enter(style, frame, fps, 0, INTRO);
  const riseC = Math.min(1, rise);
  const phoneTf = `translateY(${(1 - rise) * 190 * u}px) rotateY(${(1 - riseC) * -26}deg) rotateZ(${(1 - riseC) * -6}deg)`;

  // Callout state: in on its word, out fast just before the next swipe.
  const callState = (i: number) => {
    if (C[i]! < 0) return { inP: 0, out: 0, lead: 0, lab: 0, push: 0 };
    const nextS = i < n - 1 ? S[i + 1]! : duration + 10;
    const out = range(t, nextS - 0.55, nextS - 0.25, Easing.in(Easing.cubic));
    return {
      inP: range(t, C[i]!, C[i]! + 0.45),
      out,
      lead: range(t, C[i]! + 0.1, C[i]! + 0.5, Easing.out(Easing.cubic)),
      lab: enter(style, frame, fps, C[i]! + 0.3, 0.55),
      push: range(t, C[i]! - 0.35, C[i]! + 0.35, Easing.inOut(Easing.sin)) * (1 - range(t, nextS - 0.6, nextS - 0.05, Easing.inOut(Easing.sin))),
    };
  };

  // Camera: one push per callout, scaled around the ringed detail so the leader's start stays put.
  let camK = 1;
  let camO: [number, number] = [cx, cy];
  for (let i = 0; i < n; i++) {
    const cs = callState(i);
    if (cs.push > 0.0005) {
      camK = 1 + 0.05 * cs.push;
      camO = targetOf(screens[i]!, g);
    }
  }

  // Headline: in the label column's top, mask-revealed upward.
  const headFs = (split ? 60 : 84) * u * (hand ? 1.12 : 1);
  const headLines = props.headline ? Math.min(3, Math.ceil((props.headline.length * headFs * (hand ? 0.45 : 0.55)) / colW)) : 0;
  const headTop = 120 * u;
  const headBottom = headTop + headLines * headFs * 1.08;
  const headAt = cueAt(cues, props.headlineWord, 0.7);
  const headWords = (props.headline ?? "").split(" ");

  const ctxOf = (i: number): ScreenCtx => ({ style, c, g, t, frame, fps, arrive: arriveOf(i), call: C[i]!, media });

  // Touch dot before each swipe: appears, presses, drags left with the new screen.
  const touch = (() => {
    for (let i = 1; i < n; i++) {
      const s = S[i]!;
      if (t >= s - 0.5 && t <= s + 0.55) {
        const show = range(t, s - 0.5, s - 0.3) * (1 - range(t, s + 0.3, s + 0.55));
        const press = range(t, s - 0.28, s - 0.18) * (1 - range(t, s + 0.25, s + 0.4));
        const drag = range(t, s - 0.12, s + 0.38, Easing.inOut(Easing.cubic));
        return { x: g.sw * (0.8 - 0.55 * drag), y: g.sh * 0.6, show, press };
      }
    }
    return null;
  })();

  const lab = (i: number) => {
    const s = screens[i]!;
    const cs = callState(i);
    if (!s.callout || cs.inP <= 0 || cs.out >= 1) return null;
    const [tx, ty] = targetOf(s, g);
    const yMin = props.headline ? headBottom + 70 * u : 140 * u;
    const ly = Math.max(yMin, Math.min(H - 130 * u, ty));
    const ex = g.col0 - 28 * u;
    const mx = cx + pw / 2 + 36 * u;
    const pts = `${tx},${ty} ${mx},${ty} ${Math.max(mx + 1, ex - Math.abs(ly - ty) * 0.25)},${ly} ${ex},${ly}`;
    const fade = 1 - cs.out;
    const fs = (split ? 42 : 52) * u * (hand ? 1.14 : 1);
    return (
      <div key={`c${i}`} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: fade, transform: `translateX(${-cs.out * 30 * u}px)` }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <polyline points={pts} fill="none" stroke={style.accent} strokeWidth={4.5 * u} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cs.lead} />
          <circle cx={tx} cy={ty} r={10 * u * clamp01(cs.inP * 1.5)} fill={style.accent} stroke={c.screen} strokeWidth={4 * u} />
          <circle cx={ex} cy={ly} r={8 * u * (cs.lead > 0.95 ? 1 : 0)} fill={style.accent} />
        </svg>
        <div style={{ position: "absolute", left: g.col0, top: ly, width: colW, transform: "translateY(-50%)", overflow: "hidden", padding: `${8 * u}px 0` }}>
          <div style={{ fontFamily: hand ? style.display : style.body, fontWeight: hand ? 700 : 600, fontSize: fs, lineHeight: 1.15, color: style.ink, letterSpacing: hand ? 0 : "-0.01em", transform: `translateY(${(1 - Math.min(1, cs.lab)) * 110}%)`, opacity: clamp01(cs.lab * 2) }}>{s.callout.text}</div>
        </div>
      </div>
    );
  };

  // The accent blob behind the phone steps sideways on each swipe, so the background change has a visible cause.
  const blobX = cx + (cur % 2 === 0 ? -1 : 1) * 60 * u * swipeQ + (cur % 2 === 0 ? 1 : -1) * 60 * u * (1 - swipeQ) * (cur === 0 ? 0 : 1);
  const blobA = (light ? 0.16 : 0.2) * clamp01(rise);

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: a light from the upper left, the accent bloom behind the phone and a slow dashed ring (the life layer). */}
      <AbsoluteFill style={{ background: `radial-gradient(70% 90% at 30% 35%, ${style.surface} 0%, transparent 70%)`, opacity: light ? 0.9 : 0.6 }} />
      <div style={{ position: "absolute", left: blobX - 520 * u, top: cy - 520 * u, width: 1040 * u, height: 1040 * u, borderRadius: "50%", background: `radial-gradient(circle, ${style.accent} 0%, transparent 62%)`, opacity: blobA }} />
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx={cx} cy={cy} r={560 * u} fill="none" stroke={mix(style.ink, light ? 10 : 14)} strokeWidth={2 * u} strokeDasharray={`${3 * u} ${22 * u}`} strokeLinecap="round" transform={`rotate(${t * 9} ${cx} ${cy})`} opacity={clamp01(rise)} />
        <circle cx={cx} cy={cy} r={430 * u} fill="none" stroke={mix(style.ink, light ? 6 : 9)} strokeWidth={1.5 * u} />
      </svg>

      {/* Camera rig. */}
      <AbsoluteFill style={{ transform: `scale(${camK})`, transformOrigin: `${camO[0]}px ${camO[1]}px` }}>
        {/* Contact shadow. */}
        <div style={{ position: "absolute", left: cx - pw * 0.55, top: cy + ph / 2 - 30 * u, width: pw * 1.1, height: 70 * u, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(0,0,0,${light ? 0.22 : 0.55}) 0%, transparent 70%)`, opacity: clamp01(rise) }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, perspective: 2200 * u }}>
          <div
            style={{
              position: "absolute",
              left: cx - pw / 2,
              top: cy - ph / 2,
              width: pw,
              height: ph,
              borderRadius: 70 * u,
              background: c.body,
              opacity: clamp01(rise * 2.5),
              transform: phoneTf,
              transformOrigin: "50% 80%",
              boxShadow: hand ? undefined : `0 ${30 * u}px ${70 * u}px rgba(0,0,0,${light ? 0.22 : 0.5}), inset 0 0 0 ${2 * u}px ${mix(style.ink, light ? 30 : 22, c.body)}`,
            }}
          >
            {/* Screen: swipes between screens inside the glass. */}
            <div style={{ position: "absolute", left: bez, top: bez, width: g.sw, height: g.sh, borderRadius: 54 * u, overflow: "hidden", background: c.screen, boxShadow: hand ? `inset 0 0 0 ${2.5 * u}px ${mix(style.ink, 70)}` : undefined }}>
              {cur > 0 && swipeQ < 1 ? (
                <div key={`p${cur - 1}`} style={{ position: "absolute", left: 0, top: 0, width: g.sw, height: g.sh, transform: `translateX(${-swipeQ * g.sw * 0.32}px)`, opacity: 1 - 0.5 * swipeQ }}>
                  {ScreenView({ s: screens[cur - 1]!, x: ctxOf(cur - 1) })}
                </div>
              ) : null}
              <div key={`p${cur}`} style={{ position: "absolute", left: 0, top: 0, width: g.sw, height: g.sh, background: c.screen, transform: `translateX(${(1 - swipeQ) * g.sw}px)`, boxShadow: cur > 0 && swipeQ < 1 ? `${-20 * u}px 0 ${40 * u}px rgba(0,0,0,0.25)` : undefined }}>
                {ScreenView({ s: screens[cur]!, x: ctxOf(cur) })}
              </div>
              {/* Status bar and home bar sit on the glass, above every screen. */}
              <div style={{ position: "absolute", left: g.sw / 2 - 62 * u, top: 20 * u, width: 124 * u, height: 36 * u, borderRadius: 18 * u, background: c.island }} />
              {[0, 1, 2].map((k) => (
                <div key={k} style={{ position: "absolute", left: g.sw - 80 * u + k * 15 * u, top: 44 * u - (8 + k * 6) * u, width: 9 * u, height: (8 + k * 6) * u, borderRadius: 2 * u, background: screens[cur]!.kind === "media" ? "rgba(255,255,255,0.9)" : mix(style.ink, 70) }} />
              ))}
              <div style={{ position: "absolute", left: 34 * u, top: 30 * u, width: 50 * u, height: 14 * u, borderRadius: 7 * u, background: screens[cur]!.kind === "media" ? "rgba(255,255,255,0.9)" : mix(style.ink, 70) }} />
              <div style={{ position: "absolute", left: g.sw / 2 - 70 * u, top: g.sh - 24 * u, width: 140 * u, height: 8 * u, borderRadius: 4 * u, background: screens[cur]!.kind === "media" ? "rgba(255,255,255,0.8)" : mix(style.ink, 45) }} />
              {touch ? (
                <div style={{ position: "absolute", left: touch.x - 42 * u, top: touch.y - 42 * u, width: 84 * u, height: 84 * u, borderRadius: "50%", background: mix(style.ink, 22), border: `${4 * u}px solid ${mix(style.surface, 85)}`, boxSizing: "border-box", opacity: touch.show, transform: `scale(${1 - 0.18 * touch.press})` }} />
              ) : null}
            </div>
          </div>
        </div>
        {hand ? (
          <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp01(rise * 2.5), transform: phoneTf, transformOrigin: `${cx}px ${cy + ph * 0.3}px` }}>
            <path d={boilRect(cx - pw / 2, cy - ph / 2, pw, ph, 70 * u, t, 4 * u)} fill="none" stroke={style.ink} strokeWidth={4 * u} strokeLinejoin="round" />
          </svg>
        ) : null}
      </AbsoluteFill>

      {/* HUD: headline and callout labels never zoom. */}
      {props.headline ? (
        <div style={{ position: "absolute", left: g.col0, top: headTop, width: colW, fontFamily: style.display, fontWeight: 700, fontSize: headFs, lineHeight: 1.08, color: style.ink, letterSpacing: hand ? 0 : "-0.025em" }}>
          {headWords.map((w, k) => {
            const a = enter(style, frame, fps, headAt + k * 0.08, 0.7);
            return (
              // The mask is padded past the line box so tall script ascenders and descenders are not cut.
              <span key={k} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.16em 0.08em 0.14em", margin: "-0.16em 0.16em -0.14em -0.08em" }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - Math.min(1, a)) * 105}%)` }}>{w}</span>
              </span>
            );
          })}
        </div>
      ) : null}
      {screens.map((_, i) => lab(i))}

      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 50%, transparent 55%, rgba(0,0,0,${light ? 0.1 : 0.4}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "phone-tour",
  title: "Phone tour",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Walking through an app or a phone experience: a drawn phone swings into frame, its screens swipe in on spoken words, and on each screen one detail is ringed and labelled beside the phone while the camera pushes in on it. Screens are drawn (a list with letter tiles, or a paragraph with a highlighted phrase: an article, a note, a message, a recipe step) or real: a media screen fills the glass with slot N (a portrait screenshot or clip, focus on its subject). Good for app explainers, 'here's how I use it', tool reviews, a message or article someone sent. 1–4 screens, one callout each. No media needed unless a screen is kind 'media'.",
  avoid:
    "Desktop or web UI (use ui-morph or a screen recording), landscape footage in a media screen (it is cropped to a portrait strip), more than one detail per screen, screens shorter than ~2.5 s with a callout, and branded screens or logos of a real product.",
  schema,
  example: {
    headline: "Dinner, planned in a minute",
    headlineWord: "dinner",
    screens: [
      { kind: "list", title: "This week", rows: ["Lemon pasta", "Chickpea curry", "Tomato soup", "Fish tacos"], callout: { text: "Plans the whole week", word: "week", row: 1 } },
      { kind: "text", title: "Chickpea curry", body: "Fry the onions slowly until golden, then add the spices and let them bloom for a minute.", highlight: "let them bloom", swipeWord: "recipe", callout: { text: "Every step in plain words", word: "plain" } },
      { kind: "media", media: 0, swipeWord: "photo", callout: { text: "A photo of each stage", word: "stage", point: [0.5, 0.45] } },
    ],
  },
  exampleMedia: [{ src: "media/still.jpg", kind: "image", focus: [0.5, 0.5] }],
  exampleCues: [
    { at: 0.6, end: 1.0, word: "Dinner" },
    { at: 1.05, end: 1.3, word: "for" },
    { at: 1.35, end: 1.5, word: "the" },
    { at: 1.55, end: 1.95, word: "week" },
    { at: 2.4, end: 2.7, word: "in" },
    { at: 2.75, end: 3.0, word: "one" },
    { at: 3.05, end: 3.4, word: "list" },
    { at: 4.2, end: 4.6, word: "recipe" },
    { at: 5.2, end: 5.5, word: "in" },
    { at: 5.6, end: 6.0, word: "plain" },
    { at: 6.05, end: 6.4, word: "words" },
    { at: 7.6, end: 8.0, word: "photo" },
    { at: 8.1, end: 8.3, word: "of" },
    { at: 8.35, end: 8.5, word: "each" },
    { at: 9.2, end: 9.7, word: "stage" },
  ],
  seconds: { min: 4, max: 14, demo: 12 },
  mediaSlots: 0,
  credit: { name: "'Sotto reading app explainer' (prompt-motion.com)", url: "https://prompt-motion.com/1stnoel-c20a89" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues, media }) => <PhoneTour props={props} style={style} W={width} H={height} duration={duration} cues={cues} media={media} />,
});
