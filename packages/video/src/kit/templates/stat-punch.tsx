// Stat punch: one research number counts up on the object that carries it (a bar filling, a ring closing, a pile of dots growing) and lands with weight on its spoken word; the label follows, the source sits small and quiet.
import type { FC, ReactElement } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const schema = z
  .object({
    value: z.number().min(0).max(999_999_999).describe("The number itself, as a plain number: 76 for '76%', 4.2 for '4.2x', 88 for '88 studies'"),
    prefix: z.string().max(2).optional().describe("Shown before the number, e.g. '$' or '~'"),
    suffix: z.string().max(3).optional().describe("Shown right after the number, smaller and in the accent: '%', 'x', 'k', 'M', 'ms'"),
    decimals: z.number().int().min(0).max(2).default(0).describe("Decimal places shown while counting and at the end (1 for '4.2x')"),
    outOf: z
      .number()
      .positive()
      .optional()
      .describe("What a full bar/ring/grid is worth, so the object shows the share (value 4.2, outOf 5). Defaults to 100 when the suffix is '%'; without it the object fills completely (dots: one dot per unit, up to 100)"),
    label: z.string().min(1).max(36).describe("What the number counts, sentence case, read right after it: 'of developers use or plan to use AI'"),
    labelWord: z.string().optional().describe("Spoken word the label lands on (default: just after the number lands)"),
    source: z.string().min(1).max(48).describe("Where the number comes from, shown small as 'Source: …', e.g. 'Stack Overflow Developer Survey 2024'"),
    visual: z.enum(["bar", "ring", "dots"]).default("bar").describe("bar: a meter fills and pushes the number along; ring: a dial closes around the number; dots: a grid of dots fills up from the bottom (good for counts of things)"),
    landWord: z.string().optional().describe("Spoken word the number lands on: the count finishes a few frames before it (usually the number itself, e.g. '76%')"),
  })
  .superRefine((p, ctx) => {
    if (p.outOf !== undefined && p.value > p.outOf) ctx.addIssue({ code: "custom", message: "value is larger than outOf; the object can't be more than full", path: ["outOf"] });
    const scaled = p.outOf !== undefined || p.suffix?.trim() === "%";
    if (p.visual === "dots" && !scaled && (p.value < 3 || (p.value <= 100 && !Number.isInteger(p.value))))
      ctx.addIssue({ code: "custom", message: "dots without outOf draw one dot per unit, so the value must be a whole number of at least 3; set outOf or use bar/ring", path: ["visual"] });
  });

type Props = z.infer<typeof schema>;

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// Relative lightness of a #rrggbb token (0.5 if it isn't one), so a highlight can be the lighter of surface and ink in any preset.
const lum = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1]!, 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
// Rough glyph widths in em for the display face; enough to size the number so it never clips.
const em = (s: string) => [...s].reduce((a, c) => a + (/[0-9]/.test(c) ? 0.6 : /[.,]/.test(c) ? 0.3 : c === "%" ? 0.9 : /[mwMW]/.test(c) ? 0.9 : 0.62), 0);

// The count lands this long before its word, so the picture is settling as the word is said.
const LEAD = 0.1;

const StatPunch: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const narrow = W < 1400;
  const { value, decimals, visual } = props;
  const shine = lum(style.surface) >= lum(style.ink) ? style.surface : style.ink;

  // Timing: object arrives, the count runs into the land word, the label follows, the source last; all settled 0.6 s before the end.
  const land = Math.min(Math.max(cueAt(cues, props.landWord, duration * 0.4 + LEAD) - LEAD, 0.9), Math.max(0.9, duration - 1.7));
  const countDur = Math.min(1.4, Math.max(0.5, land - 0.45));
  const countStart = land - countDur;
  const p = interpolate(t, [countStart, land], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const labelAt = Math.min(Math.max(cueAt(cues, props.labelWord, land + 0.45 + LEAD) - LEAD, land + 0.3), duration - 1.25);
  const sourceAt = Math.min(Math.max(labelAt + 0.35, land + 0.6), duration - 1.15);
  const objIn = enter(style, frame, fps, 0.05, 0.6);
  const numIn = enter(style, frame, fps, Math.max(0.12, countStart - 0.3), 0.45);
  const labIn = enter(style, frame, fps, labelAt, 0.65);
  const srcIn = enter(calm, frame, fps, sourceAt, 0.5);
  const hit = bump(t - land, 0.32);
  const since = t - land;

  // What a full object is worth.
  const pct = props.suffix?.trim() === "%";
  const scaleMax = props.outOf ?? (pct ? 100 : undefined);
  const fill = scaleMax ? clamp01(value / scaleMax) : 1;

  // The number: final string sizes the box, digits count up right-aligned inside it so nothing jumps.
  const finalStr = fmt(value, decimals);
  const shown = fmt(Math.round(value * p * 10 ** decimals) / 10 ** decimals, decimals);
  const numEm = (em(finalStr) + (props.prefix ? em(props.prefix) * 0.6 + 0.04 : 0) + (props.suffix ? em(props.suffix) * 0.5 + 0.05 : 0)) * (hand ? 0.8 : 1);
  const labelFs = (narrow ? 54 : 72) * (hand ? 1.2 : 1);
  const labelEm = hand ? 0.42 : 0.52;
  const lines = (w: number) => Math.max(1, Math.ceil((props.label.length * labelFs * labelEm) / w));
  const side = narrow ? 72 : 150;
  const boil = (k: number, amp: number) => (hand ? (hash(k * 17.3 + Math.floor(t * 8) * 3.1) - 0.5) * amp : 0);

  const Num = ({ fs, w, align }: { fs: number; w: number; align: "flex-end" | "center" }) => (
    <div
      style={{
        width: w,
        height: fs,
        display: "flex",
        alignItems: "baseline",
        justifyContent: align,
        whiteSpace: "nowrap",
        fontFamily: style.display,
        fontWeight: 700,
        lineHeight: 1,
        color: style.ink,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: hand ? 0 : "-0.035em",
        opacity: numIn,
        transform: `translateY(${(1 - numIn) * 40}px) scale(${(0.94 + 0.06 * p) * (1 + 0.075 * hit)})`,
        transformOrigin: align === "center" ? "50% 60%" : "100% 80%",
      }}
    >
      {props.prefix ? <span style={{ fontSize: fs * 0.6, marginRight: fs * 0.04, color: style.muted }}>{props.prefix}</span> : null}
      <span style={{ fontSize: fs }}>{shown}</span>
      {props.suffix ? <span style={{ fontSize: fs * 0.5, marginLeft: fs * 0.05, color: style.accent }}>{props.suffix}</span> : null}
    </div>
  );

  const Label = ({ w, align }: { w: number; align: "left" | "center" }) => (
    <div style={{ overflow: "hidden", width: w, paddingBottom: 8 }}>
      <div
        style={{
          fontFamily: hand ? style.display : style.body,
          fontWeight: 600,
          fontSize: labelFs,
          lineHeight: 1.12,
          letterSpacing: hand ? 0 : "-0.015em",
          color: style.ink,
          textAlign: align,
          textWrap: "balance",
          transform: `translateY(${(1 - labIn) * 110}%)`,
        }}
      >
        {props.label}
      </div>
    </div>
  );

  // Dots: cells and what one dot is worth.
  let cells = 100;
  let lit = Math.round(fill * 100);
  let unit = 1;
  if (scaleMax && scaleMax <= 100) {
    cells = Math.max(1, Math.round(scaleMax));
    lit = Math.round(fill * cells);
  } else if (scaleMax) {
    unit = scaleMax / 100;
  } else {
    cells = value <= 100 ? Math.max(1, Math.round(value)) : 100;
    lit = cells;
    unit = value > 100 ? value / 100 : 1;
  }
  const unitNote = visual === "dots" && unit !== 1 ? `1 dot ${Number.isInteger(unit) ? "=" : "≈"} ${fmt(unit, Number.isInteger(unit) ? 0 : unit < 10 ? 1 : 0)}` : "";

  const Source = ({ align }: { align: "left" | "center" }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: 14,
        fontFamily: style.body,
        fontWeight: 500,
        fontSize: 28,
        color: style.muted,
        whiteSpace: "nowrap",
        opacity: srcIn,
        transform: `translateY(${(1 - srcIn) * 14}px)`,
      }}
    >
      <div style={{ width: 28 * srcIn, height: 2, background: style.muted }} />
      <span>Source: {props.source.replace(/^\s*source\s*:\s*/i, "")}</span>
      {unitNote ? <span style={{ fontFamily: style.mono, fontSize: 28, color: style.muted }}>· {unitNote}</span> : null}
    </div>
  );

  // Camera: born a little close and settles back as the object arrives, a short impact on the land, then a slow push.
  const arrive = enter(calm, frame, fps, 0, 0.9);
  const impact = since >= 0 ? 0.022 * Math.exp(-since * 7) : 0;
  const cam = (1.07 - 0.07 * arrive) * (1 + impact) * (1 + 0.007 * Math.max(0, t - 0.9));

  let content: ReactElement;
  let focus: [number, number] = [W / 2, H / 2];
  let sourcePos: { left: number; top: number; width: number; align: "left" | "center" };

  if (visual === "bar") {
    const trackX = side;
    const trackW = W - side * 2;
    const trackH = narrow ? 80 : 100;
    const fs = Math.min(narrow ? 230 : 300, (trackW * 0.8) / numEm);
    const numW = numEm * fs;
    const lab = lines(trackW * 0.85);
    const stack = fs + 40 + trackH + 18 + 26 + 50 + lab * labelFs * 1.12;
    const top = (H - stack) / 2 - 24;
    const trackTop = top + fs + 40;
    const ticksTop = trackTop + trackH + 18;
    const labelTop = ticksTop + 26 + 50;
    const r = Math.min(style.radius, trackH / 2);
    const fw = trackW * fill * p;
    const tipX = trackX + fw;
    const numRight = Math.min(trackX + trackW, Math.max(trackX + numW, tipX));
    const sweep = interpolate(since, [0, 0.6], [-0.25, 1.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
    const outline = (() => {
      const pts: string[] = [];
      const x0 = trackX - 5;
      const y0 = trackTop - 5;
      const x1 = trackX + trackW + 5;
      const y1 = trackTop + trackH + 5;
      const seg = 8;
      for (let i = 0; i <= seg; i++) pts.push(`${x0 + ((x1 - x0) * i) / seg + boil(i, 4)},${y0 + boil(i + 40, 4)}`);
      for (let i = 1; i <= 2; i++) pts.push(`${x1 + boil(i + 80, 4)},${y0 + ((y1 - y0) * i) / 2}`);
      for (let i = seg - 1; i >= 0; i--) pts.push(`${x0 + ((x1 - x0) * i) / seg + boil(i + 120, 4)},${y1 + boil(i + 160, 4)}`);
      pts.push(`${x0 + boil(200, 4)},${(y0 + y1) / 2}`);
      return `M${pts.join(" L")} Z`;
    })();
    focus = [tipX, trackTop];
    sourcePos = { left: side, top: H - (narrow ? 64 : 76) - 28, width: W - side * 2, align: "left" };
    content = (
      <>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <clipPath id="sp-bar">
              <rect x={trackX} y={trackTop} width={Math.max(0, fw)} height={trackH} rx={r} />
            </clipPath>
            <linearGradient id="sp-sweep" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={shine} stopOpacity={0} />
              <stop offset="0.5" stopColor={shine} stopOpacity={0.55} />
              <stop offset="1" stopColor={shine} stopOpacity={0} />
            </linearGradient>
          </defs>
          <g opacity={objIn} transform={`translate(0 ${(1 - objIn) * 30})`}>
            <rect x={trackX} y={trackTop} width={trackW * clamp01(objIn)} height={trackH} rx={r} fill={mix(style.ink, 8)} />
            {hand ? <path d={outline} fill="none" stroke={style.ink} strokeWidth={3.5} strokeLinejoin="round" opacity={clamp01(objIn)} /> : <rect x={trackX + 0.75} y={trackTop + 0.75} width={trackW * clamp01(objIn) - 1.5} height={trackH - 1.5} rx={r} fill="none" stroke={mix(style.ink, 10)} strokeWidth={1.5} />}
            {Array.from({ length: 11 }, (_, i) => {
              const a = enter(calm, frame, fps, 0.2 + i * 0.03, 0.35);
              const major = i % 5 === 0;
              const x = trackX + (trackW * i) / 10;
              return <rect key={i} x={x - 1.5} y={ticksTop} width={3} height={(major ? 26 : 14) * a} rx={1.5} fill={i / 10 <= fill * p + 1e-6 && p > 0 ? style.accent : mix(style.ink, major ? 30 : 18)} />;
            })}
          </g>
          {fw > 0.5 ? (
            <g clipPath="url(#sp-bar)">
              <rect x={trackX} y={trackTop} width={fw} height={trackH} fill={style.accent} />
              <rect x={trackX} y={trackTop} width={fw} height={trackH * 0.32} fill={mix(shine, 22)} />
              {since >= 0 && since <= 0.6 ? <rect x={trackX + trackW * fill * sweep - trackW * 0.15} y={trackTop} width={trackW * 0.3} height={trackH} fill="url(#sp-sweep)" /> : null}
            </g>
          ) : null}
          {p > 0 ? <rect x={tipX - 3} y={trackTop - 26} width={6} height={trackH + 52} rx={3} fill={style.ink} opacity={numIn} transform={`translate(0 ${-6 * hit})`} /> : null}
        </svg>
        <div style={{ position: "absolute", left: numRight - numW, top }}>
          <Num fs={fs} w={numW} align="flex-end" />
        </div>
        <div style={{ position: "absolute", left: side, top: labelTop }}>
          <Label w={trackW * 0.85} align="left" />
        </div>
      </>
    );
  } else if (visual === "ring") {
    const D = narrow ? Math.min(W - side * 2 - 40, H * 0.58) : Math.min(H * 0.74, W * 0.42);
    const cx = narrow ? W / 2 : side + D / 2;
    const cy = narrow ? H * 0.08 + D / 2 : H / 2 - 10;
    const sw = D * 0.085;
    const tickLen = D * 0.03;
    const r = D / 2 - tickLen - D * 0.035 - sw / 2;
    const inner = (r - sw / 2) * 2 * 0.7;
    const fs = Math.min(narrow ? 210 : 250, inner / numEm);
    const ang = fill * p;
    const a = ang * Math.PI * 2 - Math.PI / 2;
    const cap = style.radius >= 8 ? "round" : "butt";
    const burst = clamp01(since / 0.6);
    const trackPath = hand
      ? (() => {
          const pts: string[] = [];
          const R0 = r + sw / 2 + 4;
          for (let k = 0; k < 48; k++) {
            const th = (k / 48) * Math.PI * 2;
            const rr = R0 + boil(k, 5);
            pts.push(`${cx + rr * Math.cos(th)},${cy + rr * Math.sin(th)}`);
          }
          return `M${pts.join(" L")} Z`;
        })()
      : "";
    focus = [cx, cy];
    const colX = cx + D / 2 + 110;
    const colW = W - side - colX;
    const labH = lines(narrow ? W - side * 2 : colW) * labelFs * 1.12;
    sourcePos = narrow ? { left: side, top: H - 64 - 28, width: W - side * 2, align: "center" } : { left: colX, top: cy + labH / 2 + 30, width: colW, align: "left" };
    content = (
      <>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g opacity={clamp01(objIn)} transform={`translate(${cx} ${cy}) scale(${0.9 + 0.1 * objIn}) translate(${-cx} ${-cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={mix(style.ink, 9)} strokeWidth={sw} />
            {hand ? <path d={trackPath} fill="none" stroke={style.ink} strokeWidth={3} strokeLinejoin="round" /> : null}
            {Array.from({ length: 60 }, (_, k) => {
              const th = (k / 60) * Math.PI * 2 - Math.PI / 2;
              const on = p > 0 && k / 60 <= ang + 1e-6;
              const r0 = r + sw / 2 + D * 0.025;
              const len = k % 5 === 0 ? tickLen * 1.5 : tickLen;
              const show = enter(calm, frame, fps, 0.1 + (k / 60) * 0.45, 0.3);
              return (
                <line
                  key={k}
                  x1={cx + r0 * Math.cos(th)}
                  y1={cy + r0 * Math.sin(th)}
                  x2={cx + (r0 + len * show) * Math.cos(th)}
                  y2={cy + (r0 + len * show) * Math.sin(th)}
                  stroke={on ? style.accent : mix(style.ink, k % 5 === 0 ? 30 : 16)}
                  strokeWidth={k % 5 === 0 ? 4 : 3}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          {ang > 0.002 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={style.accent} strokeWidth={sw * (1 + 0.12 * hit)} strokeLinecap={cap} pathLength={1} strokeDasharray={`${ang} 2`} transform={`rotate(-90 ${cx} ${cy})`} />
          ) : null}
          {ang > 0.01 ? <circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={sw * 0.36 * (1 + 0.3 * hit)} fill={style.bg} stroke={style.ink} strokeWidth={hand ? 4 : 3} opacity={numIn} /> : null}
          {since >= 0 && since <= 0.6 ? <circle cx={cx} cy={cy} r={r + sw / 2 + D * 0.12 * Easing.out(Easing.cubic)(burst)} fill="none" stroke={style.accent} strokeWidth={6 * (1 - burst) + 1} opacity={1 - burst} /> : null}
        </svg>
        <div style={{ position: "absolute", left: cx - inner / 2, top: cy - fs * 0.52 }}>
          <Num fs={fs} w={inner} align="center" />
        </div>
        {narrow ? (
          <div style={{ position: "absolute", left: side, top: cy + D / 2 + 56 }}>
            <Label w={W - side * 2} align="center" />
          </div>
        ) : (
          <div style={{ position: "absolute", left: colX, top: cy - labH / 2 - 20 }}>
            <Label w={colW} align="left" />
          </div>
        )}
      </>
    );
  } else {
    // Dots: a column with the number and label, and a grid that fills from the bottom like a pile.
    const colW = narrow ? W - side * 2 : W * 0.42 - side;
    const fs = Math.min(narrow ? 200 : 280, colW / numEm);
    const labH = lines(colW) * labelFs * 1.12;
    const textH = fs + 18 + labH;
    const textTop = narrow ? 90 : (H - textH - 70) / 2;
    const bx = narrow ? side : W * 0.48;
    const by = narrow ? textTop + textH + 50 : 110;
    const bw = narrow ? W - side * 2 : W - side - bx;
    const bh = narrow ? H - 140 - by : H - 220;
    // Biggest dots that fit; a column count that fills the grid evenly wins unless it costs more than 10% of the dot size.
    let cols = 1;
    let best = 0;
    for (let c = 1; c <= cells; c++) {
      const score = Math.min(bw / c, bh / Math.ceil(cells / c)) * (cells % c === 0 ? 1 : 0.9);
      if (score > best) {
        best = score;
        cols = c;
      }
    }
    const rows = Math.ceil(cells / cols);
    const cell = Math.min(bw / cols, bh / rows, 120);
    const gx = bx + (bw - cols * cell) / 2;
    const gy = by + (bh - rows * cell) / 2;
    const dr = cell * 0.33;
    const pos = (i: number) => ({ c: i % cols, r: rows - 1 - Math.floor(i / cols) });
    const last = pos(Math.max(0, lit - 1));
    const count = p * lit;
    focus = [bx + bw / 2, by + bh / 2];
    sourcePos = narrow ? { left: side, top: H - 64 - 28, width: W - side * 2, align: "left" } : { left: side, top: textTop + textH + 40, width: colW, align: "left" };
    content = (
      <>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {Array.from({ length: cells }, (_, i) => {
            const { c, r } = pos(i);
            const x = gx + (c + 0.5) * cell;
            const y = gy + (r + 0.5) * cell;
            const slot = enter(calm, frame, fps, 0.05 + ((c + (rows - 1 - r)) / (cols + rows)) * 0.5, 0.35);
            const q = clamp01((count - i) / 3);
            const pop = q > 0 ? Easing.out(Easing.back(2.2))(q) : 0;
            const dist = Math.hypot(c - last.c, r - last.r);
            const ripple = i < lit ? bump(since - dist * 0.03, 0.3) : 0;
            const rr = dr * (hand ? 0.92 + hash(i) * 0.16 : 1);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={rr * slot} fill="none" stroke={mix(style.ink, 18)} strokeWidth={2.5} />
                {pop > 0 ? <circle cx={x} cy={y} r={rr * pop * (1 + 0.28 * ripple)} fill={style.accent} stroke={hand ? style.ink : "none"} strokeWidth={hand ? 2.5 : 0} /> : null}
              </g>
            );
          })}
        </svg>
        <div style={{ position: "absolute", left: side, top: textTop }}>
          <Num fs={fs} w={Math.min(colW, numEm * fs)} align="flex-end" />
          <div style={{ height: 18 }} />
          <Label w={colW} align="left" />
        </div>
      </>
    );
  }

  const [fx, fy] = focus;
  const glowX = fx - H * 0.55 + 60 * Math.sin((2 * Math.PI * t) / 13);
  const glowY = fy - H * 0.55 + 40 * Math.cos((2 * Math.PI * t) / 17);

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: base light, a faint measuring grid, and one drifting accent glow behind the object (the drift also keeps every frame repainting). */}
      <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 30% 15%, ${style.surface} 0%, transparent 70%)`, opacity: 0.75 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${mix(style.ink, 4)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${mix(style.ink, 4)} 1.5px, transparent 1.5px)`,
          backgroundSize: "72px 72px",
          backgroundPosition: `${W / 2}px ${H / 2}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      <div style={{ position: "absolute", left: glowX, top: glowY, width: H * 1.1, height: H * 1.1, borderRadius: "50%", background: `radial-gradient(circle, ${style.accent} 0%, transparent 65%)`, opacity: 0.08 + 0.04 * hit }} />

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${fx}px ${fy}px` }}>{content}</AbsoluteFill>

      {/* The source is metadata: it lives outside the camera so it never zooms. */}
      <div style={{ position: "absolute", left: sourcePos.left, top: sourcePos.top, width: sourcePos.width }}>
        <Source align={sourcePos.align} />
      </div>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.14) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "stat-punch",
  title: "Stat punch",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "One striking number from the research ('76%', '4.2x', '88 studies') that should hit hard: it counts up on an object (a bar filling, a ring closing, or a pile of dots for counts of things) and lands on the spoken word, then a short label says what it counts and a quiet source line cites it. Set outOf so the object shows the share (76 of 100, 4.2 of 5). As a split panel it sits beside face cam. No media.",
  avoid:
    "Two or more numbers to compare (use a comparison template), numbers that aren't in research/sources.md, a label longer than one short phrase, and using it back to back (vary the visual if it must repeat). Under 3 s the count feels rushed.",
  schema,
  example: {
    value: 76,
    suffix: "%",
    decimals: 0,
    label: "of developers use or plan to use AI",
    labelWord: "developers",
    source: "Stack Overflow Developer Survey 2024",
    visual: "ring",
    landWord: "76%",
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.25, end: 0.5, word: "Last" },
    { at: 0.5, end: 0.8, word: "year" },
    { at: 1.9, end: 2.5, word: "76%" },
    { at: 2.6, end: 2.9, word: "of" },
    { at: 2.9, end: 3.5, word: "developers" },
  ],
  seconds: { min: 3, max: 7, demo: 5 },
  mediaSlots: 0,
  credit: { name: "'Backlink audit data promo' and 'Flexprice motion showreel' (prompt-motion.com)", url: "https://prompt-motion.com" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <StatPunch props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
