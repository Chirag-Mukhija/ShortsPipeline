// List tick: a running checklist beside the presenter or full frame; a highlight card travels to the current item and expands it, finished items get a drawn tick and dim, a progress rail fills and a counter rolls.
import type { FC } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const MAX = 20;

const itemSchema = z.object({
  text: z.string().min(1).max(32).describe("The item, sentence case, ≤ 32 characters, e.g. 'Keep functions small'"),
  detail: z.string().max(44).optional().describe("One supporting line shown under the item only while it is the current one, e.g. 'If it scrolls, split it'"),
  word: z.string().optional().describe("Spoken word on which this item becomes the current one (the highlight lands a few frames before it)"),
});

const schema = z
  .object({
    title: z.string().max(28).optional().describe("Headline for the list, e.g. '8 habits of clean code'"),
    titleWord: z.string().optional().describe("Spoken word the headline lands on"),
    items: z.array(itemSchema).min(2).max(MAX).describe("The whole list in order. Up to 20; about 8 fit on screen (6 in split), longer lists scroll to keep the current item in view"),
    doneThrough: z.number().int().min(-1).max(MAX - 1).default(-1).describe("Items up to this index are already ticked when the segment opens (-1 = none), so a list can continue across segments"),
    current: z
      .number()
      .int()
      .min(0)
      .max(MAX)
      .describe("Index of the item that is current at the end. Every item after doneThrough up to this one becomes current in turn (each ticking as the next arrives). Set it to the number of items to tick the last one and finish the list"),
    finishWord: z.string().optional().describe("When current = number of items: spoken word the last tick and the 'complete' flourish land on"),
    showCounter: z.boolean().default(true).describe("Show a rolling '03 / 08' counter of the current item"),
  })
  .superRefine((p, ctx) => {
    const n = p.items.length;
    if (p.doneThrough > n - 1) ctx.addIssue({ code: "custom", message: `doneThrough ${p.doneThrough} is past the last item`, path: ["doneThrough"] });
    if (p.current > n) ctx.addIssue({ code: "custom", message: `current ${p.current} is past the end (max ${n})`, path: ["current"] });
    if (p.current <= p.doneThrough) ctx.addIssue({ code: "custom", message: "current must come after doneThrough, or nothing happens", path: ["current"] });
    if (p.current === n && p.doneThrough >= n - 1) ctx.addIssue({ code: "custom", message: "Everything is already done; lower doneThrough", path: ["doneThrough"] });
  });

type Props = z.infer<typeof schema>;

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const pad2 = (v: number) => String(v).padStart(2, "0");

// Highlight travel time; it lands on the item's word minus LEAD so the picture settles as the word is spoken.
const TRAVEL = 0.5;
const LEAD = 0.1;
// The tick of the outgoing item fires this long before the highlight lands on the next one: tick first, then travel.
const TICK_BEFORE = 0.8;
const GAP_MIN = 1.1;

const ListTick: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  // "Never" and "always" are ±Infinity in the timing below; interpolate needs finite inputs.
  const guard = (at: number, f: () => number) => (at === Infinity ? 0 : at === -Infinity ? 1 : f());
  const smooth = (at: number, dur: number) => guard(at, () => enter(calm, frame, fps, at, dur));
  const settle = (at: number, dur: number) => guard(at, () => enter(style, frame, fps, at, dur));
  const narrow = W < 1400;
  const { items, doneThrough, current, showCounter } = props;
  const n = items.length;
  const finish = current >= n;
  const lastActive = Math.min(current, n - 1);
  const active: number[] = [];
  for (let i = doneThrough + 1; i <= lastActive; i++) active.push(i);
  const K = active.length;

  // Intro: rows rise in quickly while the rail draws down; the real events are the ticks and the travelling highlight.
  const stagger = Math.min(0.06, 0.55 / n);
  const rowAt = (i: number) => 0.12 + i * stagger;
  const buildEnd = rowAt(n - 1) + 0.5;

  // Event times: each activation lands on its word, else spread over the free time; the finish tick lands on finishWord.
  const E = K + (finish ? 1 : 0);
  const first = buildEnd + TRAVEL - 0.1;
  const latestAct = duration - 0.6 - 0.5;
  const latestFinish = duration - 0.6 - 0.75 - 0.04 * Math.min(n, 10);
  const lastSlot = finish ? latestFinish : latestAct;
  const words = [...active.map((i) => items[i]!.word), ...(finish ? [props.finishWord] : [])];
  const lands: number[] = [];
  let prev = -Infinity;
  words.forEach((w, j) => {
    const fb = E === 1 ? lerp(first, lastSlot, 0.15) : lerp(first, lastSlot, j / (E - 1));
    const isFinish = finish && j === E - 1;
    const hi = isFinish ? latestFinish : latestAct;
    const at = cueAt(cues, w, fb + LEAD) - LEAD;
    const land = Math.min(Math.max(at, first, prev + GAP_MIN), hi);
    lands.push(land);
    prev = land;
  });
  const L = lands.slice(0, K);
  const A = L.map((l) => l - TRAVEL);
  const F = finish ? lands[K]! : Infinity;

  // Per-row timings.
  const kOf = new Map(active.map((i, k) => [i, k]));
  const actIn = (i: number) => {
    const k = kOf.get(i);
    return k === undefined ? Infinity : A[k]! + 0.05;
  };
  const actOut = (i: number) => {
    const k = kOf.get(i);
    if (k === undefined) return Infinity;
    if (k < K - 1) return A[k + 1]!;
    return finish ? F + 0.15 : Infinity;
  };
  const tickAt = (i: number) => {
    if (i <= doneThrough) return -Infinity;
    const k = kOf.get(i);
    if (k === undefined) return Infinity;
    if (k < K - 1) return L[k + 1]! - TICK_BEFORE;
    return finish ? F : Infinity;
  };

  // Layout. Full frame: title and big counter in a left column, the list on the right. Split: a header row, the list below.
  const side = narrow ? 64 : 110;
  const hasHead = Boolean(props.title) || showCounter;
  const titleSize = narrow ? (hand ? 72 : 60) : hand ? 104 : 88;
  const counterSize = narrow ? 76 : 220;
  const counterW = showCounter ? (narrow ? counterSize * 1.25 + 120 : 0) : 0;
  const titleW = narrow ? W - side * 2 - counterW - (showCounter ? 24 : 0) : W * 0.33;
  const charW = hand ? 0.42 : 0.5;
  const titleLines = props.title ? Math.max(1, Math.ceil((props.title.length * titleSize * charW) / titleW)) : 0;
  const titleH = titleLines * titleSize * 1.06;

  const listX = narrow || !hasHead ? (narrow ? side + 16 : Math.max(side, (W - 1150) / 2)) : W * 0.43;
  const listW = narrow ? W - side * 2 - 16 : !hasHead ? Math.min(1150, W - side * 2) : W - listX - side;
  const headBottom = narrow && hasHead ? H * 0.075 + Math.max(titleH, showCounter ? counterSize * 1.05 : 0) : 0;
  const viewTop = narrow ? (hasHead ? headBottom + 44 : 72) : 84;
  const viewH = H - viewTop - (narrow ? 64 : 84);

  const circ0 = 60;
  const textX = circ0 + 34;
  const textW = listW - textX - 40;
  const df = hand ? 46 : 40;
  const dLines = (s?: string) => (s ? Math.min(2, Math.ceil((s.length * df * (hand ? 0.4 : 0.47)) / textW)) : 0);
  const D = items.map((it) => (it.detail ? dLines(it.detail) * df * 1.22 + 18 : 0));
  const Dmax = Math.max(0, ...active.map((i) => D[i]!));
  const fitR = (viewH - Dmax) / n;
  const R = Math.min(narrow ? 104 : 116, Math.max(82, fitR));
  const circ = Math.min(circ0, R * 0.66);
  const fsBase = Math.min(narrow ? 46 : 50, Math.max(40, R * 0.44));
  const fsOf = (s: string) => Math.max(40, Math.min(fsBase, textW / (s.length * (hand ? 0.45 : 0.56))));
  const blockH = n * R + Dmax;
  const overflow = blockH > viewH + 2;
  const listY0 = overflow ? viewTop : viewTop + (viewH - blockH) / 2;

  // Row expansion drives the vertical layout: the current row opens to show its detail, the others stay one line.
  const ex = items.map((_, i) => smooth(actIn(i), 0.5) * (1 - smooth(actOut(i), 0.4)));
  const tops: number[] = [];
  let acc = 0;
  items.forEach((_, i) => {
    tops.push(acc);
    acc += R + D[i]! * ex[i]!;
  });
  const total = acc;
  const hOf = (i: number) => R + D[i]! * ex[i]!;

  // The highlight card travels row to row; its position follows the rows as they open and close.
  let hlTop = K ? tops[active[0]!]! : 0;
  let hlH = K ? hOf(active[0]!) : R;
  for (let k = 1; k < K; k++) {
    const p = settle(A[k]!, TRAVEL);
    hlTop += (tops[active[k]!]! - tops[active[k - 1]!]!) * p;
    hlH += (hOf(active[k]!) - hOf(active[k - 1]!)) * p;
  }
  const hlIn = K ? settle(A[0]!, TRAVEL) : 0;
  const hlOut = finish ? smooth(F + 0.15, 0.35) : 0;
  const hlOn = clamp01(hlIn) * (1 - hlOut);

  // Scroll keeps the current item about 40% down the view on long lists.
  const frontier0 = Math.min(Math.max(doneThrough + 1, 0), n - 1);
  const focus = lerp(tops[frontier0]!, hlTop, clamp01(smooth(K ? A[0]! : 0, TRAVEL)));
  const scroll = overflow ? Math.min(Math.max(focus + R / 2 - viewH * 0.4, 0), Math.max(0, total - viewH)) : 0;
  const yOf = (top: number) => listY0 + top - scroll;

  // Rail: through the circle centres; the accent fill follows the highlight, so progress is always visible.
  const cx = listX + circ0 / 2;
  const railTop = yOf(tops[0]!) + R / 2;
  const railBot = yOf(tops[n - 1]!) + R / 2;
  const railDraw = smooth(0.1, buildEnd);
  const initFill = doneThrough >= 0 ? yOf(tops[doneThrough]!) + R / 2 : railTop;
  const fillTarget = K ? yOf(hlTop) + R / 2 : initFill;
  const fillY = Math.min(lerp(initFill, fillTarget, clamp01(hlIn)), lerp(railTop, railBot, railDraw));
  const boil = (k: number) => (hand ? (hash(k * 13 + Math.floor(t * 8)) - 0.5) * 5 : 0);

  // Counter: the current item's number rolls in; at the finish it turns accent with one slam.
  const counts: { at: number; v: number }[] = [{ at: -1, v: Math.max(0, doneThrough + 1) }];
  active.forEach((i, k) => counts.push({ at: A[k]! + 0.2, v: i + 1 }));
  const curC = [...counts].reverse().find((c) => c.at <= t)!;
  const prevC = counts[counts.indexOf(curC) - 1];
  const roll = curC.at < 0 ? 1 : settle(curC.at, 0.5);
  const counterIn = settle(counts[0]!.v === 0 && K ? A[0]! : 0.25, 0.7);
  const fin = finish ? clamp01(smooth(F + 0.1, 0.4)) : 0;
  const slam = finish ? bump(t - F - 0.1, 0.35) : 0;
  const flourishAt = F + 0.3;

  const titleIn = settle(Math.max(0, cueAt(cues, props.titleWord, 0.15) - LEAD), 0.8);

  const radius = Math.min(style.radius, 28);
  const textFont = hand ? style.display : style.body;

  const Counter = ({ size }: { size: number }) => {
    const numStyle = { fontFamily: style.display, fontWeight: hand ? 700 : 600, fontSize: size, lineHeight: `${size * 1.05}px`, fontVariantNumeric: "tabular-nums" as const, letterSpacing: hand ? 0 : "-0.04em" };
    const numColour = mix(style.accent, fin * 100, style.ink);
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: size * 0.12, opacity: counterIn, transform: `translateY(${(1 - counterIn) * 40}px)` }}>
        <div style={{ position: "relative", height: size * 1.05, overflow: "hidden", transform: `scale(${1 + 0.1 * slam})`, transformOrigin: "50% 80%" }}>
          <div style={{ ...numStyle, visibility: "hidden" }}>{pad2(n)}</div>
          {prevC && roll < 1 ? <div style={{ ...numStyle, position: "absolute", left: 0, top: 0, color: numColour, transform: `translateY(${-roll * 100}%)`, opacity: 1 - roll }}>{pad2(prevC.v)}</div> : null}
          <div style={{ ...numStyle, position: "absolute", left: 0, top: 0, color: numColour, transform: `translateY(${(1 - roll) * 100}%)` }}>{pad2(curC.v)}</div>
        </div>
        <div style={{ fontFamily: style.display, fontWeight: hand ? 700 : 500, fontSize: Math.max(40, size * 0.32), color: style.muted, fontVariantNumeric: "tabular-nums" }}>/ {pad2(n)}</div>
      </div>
    );
  };

  const Title = () =>
    props.title ? (
      <div style={{ overflow: "hidden", paddingBottom: 10 }}>
        <div
          style={{
            fontFamily: style.display,
            fontWeight: hand ? 700 : 600,
            fontSize: titleSize,
            lineHeight: 1.06,
            letterSpacing: hand ? 0 : "-0.02em",
            color: style.ink,
            transform: `translateY(${(1 - titleIn) * 115}%)`,
          }}
        >
          {props.title}
        </div>
      </div>
    ) : null;

  // Long lists fade at the view's edges with background-coloured bands, not a CSS mask: a full-frame mask composited differently per render tab (single-frame flashes).
  const fadeBand = (top: number, dir: "to bottom" | "to top") => (
    <div style={{ position: "absolute", left: listX - 40, width: listW + 80, top, height: 90, background: `linear-gradient(${dir}, ${style.bg} 15%, transparent)`, pointerEvents: "none" }} />
  );

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Base light and a slowly drifting glow as plain tokens under opacity. The drift also keeps Chrome repainting every frame: when the frame went fully static, some frames came back re-rastered differently (single-frame flashes in the motion check). */}
      <AbsoluteFill style={{ background: `radial-gradient(120% 95% at ${narrow ? 50 : 20}% 10%, ${style.surface} 0%, transparent 72%)`, opacity: 0.7 }} />
      <div
        style={{
          position: "absolute",
          width: H * 1.1,
          height: H * 1.1,
          left: listX + listW * 0.4 - H * 0.55 + 70 * Math.sin((2 * Math.PI * t) / 13),
          top: H * 0.1 - H * 0.2 + 50 * Math.cos((2 * Math.PI * t) / 16),
          borderRadius: "50%",
          background: `radial-gradient(circle, ${style.accent} 0%, transparent 65%)`,
          opacity: 0.09,
        }}
      />

      {/* Header: left column (full) or top row (split). */}
      {hasHead && !narrow ? (
        <div style={{ position: "absolute", left: side, top: 0, width: titleW, height: H, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
          <Title />
          {showCounter ? <Counter size={counterSize} /> : null}
        </div>
      ) : null}
      {hasHead && narrow ? (
        <div style={{ position: "absolute", left: side, top: H * 0.075, width: W - side * 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ width: titleW }}>
            <Title />
          </div>
          {showCounter ? <Counter size={counterSize} /> : null}
        </div>
      ) : null}

      {/* The list. */}
      <AbsoluteFill>
        {/* Highlight card. */}
        {hlOn > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: listX - 24,
              top: yOf(hlTop) + 5,
              width: listW + 48,
              height: hlH - 10,
              borderRadius: radius,
              background: style.surface,
              border: hand ? `3px solid ${style.ink}` : `1.5px solid ${mix(style.ink, 10)}`,
              boxSizing: "border-box",
              boxShadow: `0 18px 44px ${mix(style.ink, 12)}, 0 2px 6px ${mix(style.ink, 6)}`,
              opacity: hlOn,
              transform: `scaleX(${0.82 + 0.18 * hlOn})`,
              transformOrigin: "0 50%",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: style.accent }} />
          </div>
        ) : null}

        {/* Rail. */}
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
          <path d={`M${cx} ${railTop} Q${cx + boil(1)} ${(railTop + railBot) / 2} ${cx} ${lerp(railTop, railBot, railDraw)}`} stroke={mix(style.ink, 14)} strokeWidth={4} strokeLinecap="round" fill="none" />
          {fillY > railTop + 1 ? <path d={`M${cx} ${railTop} Q${cx + boil(2)} ${(railTop + fillY) / 2} ${cx} ${fillY}`} stroke={style.accent} strokeWidth={6} strokeLinecap="round" fill="none" /> : null}
        </svg>

        {items.map((it, i) => {
          const y = yOf(tops[i]!);
          if (y > H + 40 || y + R + D[i]! < -40) return null;
          const inA = settle(rowAt(i), 0.5);
          const e = ex[i]!;
          const ta = tickAt(i);
          const pre = ta === -Infinity;
          const fill = pre ? smooth(rowAt(i) + 0.15, 0.4) : ta === Infinity ? 0 : clamp01(settle(ta, 0.42));
          const draw = pre ? smooth(rowAt(i) + 0.3, 0.35) : ta === Infinity ? 0 : smooth(ta + 0.12, 0.3);
          const dim = pre ? 1 : ta === Infinity ? 0 : smooth(ta + 0.3, 0.45);
          const burstQ = pre || ta === Infinity ? -1 : (t - ta - 0.06) / 0.55;
          const flo = finish ? bump(t - flourishAt - i * 0.04, 0.32) : 0;
          const bright = Math.max(e, dim);
          const ink = mix(style.muted, dim * 100, mix(style.ink, 40 + 60 * bright, style.bg));
          const cy = y + R / 2;
          const r = circ / 2;
          const detIn = it.detail ? clamp01(smooth(L[kOf.get(i) ?? 0]! - 0.05, 0.45)) * (1 - smooth(actOut(i), 0.25)) : 0;
          const shift = 16 * e;
          const fs = fsOf(it.text);
          // The current item grows a little, never past its column.
          const grow = Math.max(1, Math.min(1.08, (textW - 20) / (it.text.length * fs * (hand ? 0.5 : 0.54))));
          const j = boil(i * 3 + 7);
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: inA, transform: `translateY(${(1 - inA) * 28}px)` }}>
              {/* Marker: hollow numbered ring → accent ring while current → filled disc with a drawn tick. */}
              <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                <g transform={`translate(${cx} ${cy}) scale(${1 + 0.14 * flo + 0.06 * e})`}>
                  <circle r={r - 2} fill={style.bg} stroke={mix(style.accent, e * 100, mix(style.ink, 26))} strokeWidth={hand ? 3.5 : 3} />
                  <circle r={(r + 1) * fill} fill={style.accent} />
                  <path
                    d={`M${-r * 0.32} ${r * 0.02 + j * 0.3} L${-r * 0.08} ${r * 0.27} L${r * 0.36 + j * 0.3} ${-r * 0.26}`}
                    stroke={style.bg}
                    strokeWidth={hand ? 6 : 5.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - draw}
                  />
                </g>
                {burstQ >= 0 && burstQ <= 1 ? (
                  <circle cx={cx} cy={cy} r={r * (1 + 0.9 * Easing.out(Easing.cubic)(burstQ))} fill="none" stroke={style.accent} strokeWidth={4 * (1 - burstQ) + 1} opacity={1 - burstQ} />
                ) : null}
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: cx - r,
                  top: cy - r,
                  width: circ,
                  height: circ,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: style.mono,
                  fontWeight: 600,
                  fontSize: 30,
                  color: mix(style.accent, e * 100, style.muted),
                  opacity: 1 - clamp01(fill * 1.6),
                  transform: `scale(${1 - 0.4 * fill})`,
                }}
              >
                {i + 1}
              </div>
              {/* Text. */}
              <div
                style={{
                  position: "absolute",
                  left: listX + textX + shift,
                  top: y,
                  height: R,
                  width: textW,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: textFont,
                  fontWeight: hand ? 700 : 600,
                  fontSize: hand ? fs * 1.12 : fs,
                  letterSpacing: hand ? 0 : "-0.01em",
                  color: ink,
                  whiteSpace: "nowrap",
                  transform: `scale(${1 + (grow - 1) * e})`,
                  transformOrigin: "0 50%",
                }}
              >
                {it.text}
              </div>
              {it.detail && D[i]! * e > 1 ? (
                <div style={{ position: "absolute", left: listX + textX + shift, top: y + R - 14, width: textW, height: D[i]! * e, overflow: "hidden" }}>
                  <div
                    style={{
                      fontFamily: hand ? style.display : style.body,
                      fontWeight: hand ? 600 : 400,
                      fontSize: df,
                      lineHeight: 1.22,
                      color: mix(style.ink, 72, style.bg),
                      transform: `translateY(${(1 - detIn) * 60}px)`,
                      opacity: detIn,
                    }}
                  >
                    {it.detail}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {overflow ? fadeBand(viewTop - 50, "to bottom") : null}
        {overflow ? fadeBand(viewTop + viewH - 40, "to top") : null}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.14) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "list-tick",
  title: "List tick",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "A numbered list the video works through ('8 habits', '5 mistakes', '19 principles'): shows the whole list, the current item highlighted and opened with an optional one-line detail, finished items ticked and dimmed, upcoming ones faint, with a progress rail and a rolling '03 / 08' counter. Each item after doneThrough becomes current on its spoken word and ticks as the next one arrives; set current to the item count to tick the last one and finish. Reuse it across segments with doneThrough moving forward so viewers feel progress. Up to 20 items (long lists scroll). As a split panel it sits beside face cam. No media.",
  avoid:
    "Lists of 1–2 items (use a text card), more than ~5 activations in one segment (each needs ~1.1 s; split the walk across segments), items longer than one short line (put the rest in detail), and explaining an item at length (cut to a graphic for that item, then come back to the list).",
  schema,
  example: {
    title: "8 habits of clean code",
    titleWord: "habits",
    items: [
      { text: "Name things for what they do" },
      { text: "Keep functions small" },
      { text: "One job per function" },
      { text: "Delete dead code" },
      { text: "Fail loudly and early", detail: "A crash beats a wrong answer", word: "fail" },
      { text: "Write the test first", detail: "It tells you when you're done", word: "test" },
      { text: "Comment why, not what", word: "comment" },
      { text: "Leave it cleaner than you found", detail: "The boy scout rule", word: "cleaner" },
    ],
    doneThrough: 3,
    current: 8,
    finishWord: "done",
    showCounter: true,
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.3, end: 0.6, word: "Eight" },
    { at: 0.6, end: 1.0, word: "habits" },
    { at: 1.9, end: 2.2, word: "fail" },
    { at: 3.6, end: 3.9, word: "test" },
    { at: 5.3, end: 5.7, word: "comment" },
    { at: 6.6, end: 7.0, word: "cleaner" },
    { at: 8.3, end: 8.6, word: "done" },
  ],
  seconds: { min: 3, max: 10, demo: 10 },
  mediaSlots: 0,
  credit: { name: "The creator's reference reel '19 Principles of UX & Animation' and 'Motion principles showreel' (prompt-motion.com)", url: "https://prompt-motion.com" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <ListTick props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
