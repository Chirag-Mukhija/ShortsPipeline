// Chart bars: a bar or line chart that draws itself from data (bars grow with a stagger and settle, a line draws behind a leading dot), then dims the rest, pushes in on one highlighted bar or point and pins a short note to it; optional title and source line.
import type { FC, ReactElement } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const schema = z
  .object({
    kind: z.enum(["bar", "line"]).default("bar").describe("bar: one bar per item (comparisons between things); line: a line through the points in order (change over time)"),
    data: z
      .array(
        z.object({
          label: z.string().min(1).max(10).describe("Category or time label under the bar/point, e.g. 'Redis', '2021', 'Mon'"),
          value: z.number().min(-999_999).max(999_999).describe("The number, plain: 62 for '62 ms'. Bars must be 0 or more; lines may go negative"),
        }),
      )
      .min(2)
      .max(8)
      .describe("2–8 items in display order; every value must come from research/sources.md"),
    prefix: z.string().max(2).optional().describe("Shown before each value, e.g. '$'"),
    unit: z.string().max(4).optional().describe("Shown after each value, smaller: '%', 'ms', 'k', 'x'"),
    decimals: z.number().int().min(0).max(2).default(0).describe("Decimal places on the value labels"),
    orient: z.enum(["auto", "columns", "rows"]).default("auto").describe("Bars only. auto picks columns when the labels fit side by side, else horizontal rows (leave on auto)"),
    title: z.string().max(32).optional().describe("What the chart measures, sentence case, e.g. 'API response time by setup'"),
    drawWord: z.string().optional().describe("Spoken word the chart starts drawing on (default: right away)"),
    highlight: z
      .object({
        index: z.number().int().min(0).max(7).describe("Which item (0-based) is the insight"),
        note: z.string().min(1).max(32).describe("The insight in a few words, pinned beside it: 'Redis alone cut it by 74%'"),
        word: z.string().optional().describe("Spoken word the highlight lands on"),
      })
      .optional()
      .describe("Dim the rest, push in on one item and pin a note to it"),
    source: z.string().max(48).optional().describe("Where the numbers come from, shown small as 'Source: …'"),
  })
  .superRefine((p, ctx) => {
    if (p.highlight && p.highlight.index >= p.data.length) ctx.addIssue({ code: "custom", message: `highlight.index ${p.highlight.index} is past the last item (${p.data.length - 1})`, path: ["highlight", "index"] });
    if (p.kind === "bar" && p.data.some((d) => d.value < 0)) ctx.addIssue({ code: "custom", message: "bars can't show negative values; use kind 'line'", path: ["data"] });
    if (p.kind === "bar" && !p.data.some((d) => d.value > 0)) ctx.addIssue({ code: "custom", message: "at least one bar must be above 0", path: ["data"] });
    p.data.forEach((d, i) => {
      const s = `${p.prefix ?? ""}${fmt(d.value, p.decimals ?? 0)}${p.unit ?? ""}`;
      if (s.length > 9) ctx.addIssue({ code: "custom", message: `value label '${s}' is over 9 characters; scale it (e.g. 12.4 with unit 'k')`, path: ["data", i, "value"] });
    });
  });

type Props = z.infer<typeof schema>;
type Rect = { l: number; t: number; r: number; b: number };
type Side = "right" | "left" | "above" | "below";

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clampN = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// Value labels land this long before their word, so the picture is settling as it is said.
const LEAD = 0.1;
// Rough average glyph width in em for the body face at weight 600, used to size labels so nothing clips.
const LABEL_EM = 0.56;
const PUSH = 0.1;

const colPath = (x: number, y: number, w: number, h: number, r0: number) => {
  const r = Math.max(0, Math.min(r0, w / 2, h));
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
};
const rowPath = (x: number, y: number, w: number, h: number, r0: number) => {
  const r = Math.max(0, Math.min(r0, h / 2, w));
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
};

const ChartBars: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const calm: Style = { ...style, motion: "calm" };
  const hand = style.motion === "hand";
  const narrow = W < 1400;
  const side = narrow ? 72 : 140;
  const { data } = props;
  const n = data.length;
  const isLine = props.kind === "line";
  const hl = props.highlight && props.highlight.index < n ? props.highlight : undefined;
  const boil = (k: number, amp: number) => (hand ? (hash(k * 17.3 + Math.floor(t * 8) * 3.1) - 0.5) * amp : 0);

  const unit = props.unit ?? "";
  const valStr = (v: number) => `${props.prefix ?? ""}${fmt(v, props.decimals)}`;
  const valEm = (v: number) => valStr(v).length * 0.6 + unit.length * 0.6 * 0.7 + (unit ? 0.08 : 0);
  const maxValEm = Math.max(...data.map((d) => valEm(d.value)));
  const maxLab = Math.max(...data.map((d) => d.label.length));
  const vals = data.map((d) => d.value);

  // Layout: title band, plot area, source band.
  const titleFs = (narrow ? 54 : 68) * (hand ? 1.2 : 1);
  const titleEm = hand ? 0.42 : 0.55;
  const titleTop = narrow ? 70 : 76;
  const titleLines = props.title ? Math.max(1, Math.ceil((props.title.length * titleEm * titleFs) / (W - side * 2))) : 0;
  const titleBottom = props.title ? titleTop + titleLines * titleFs * 1.12 : 40;
  const plotTop = props.title ? titleBottom + (narrow ? 64 : 56) : narrow ? 110 : 100;
  const plotBottom = H - (props.source ? (narrow ? 150 : 160) : narrow ? 90 : 100);
  const plotL = side;
  const plotR = W - side;
  const plotW = plotR - plotL;
  const slot = plotW / n;
  const catFit = (slot * 0.9) / (maxLab * LABEL_EM);
  const valFit = (slot * 0.94) / maxValEm;
  const orient = isLine ? "line" : props.orient === "auto" ? (catFit >= 30 && valFit >= 30 ? "columns" : "rows") : props.orient;

  // Timing: axis, then the data draws in, the highlight lands on its word, the note follows once the camera has arrived; all settled 0.6 s before the end.
  const drawAt = Math.min(Math.max(cueAt(cues, props.drawWord, Math.min(0.45, duration * 0.08) + LEAD) - LEAD, 0.2), duration * 0.3);
  const budget = Math.min(isLine ? 1.8 : 1.5, Math.max(0.9, duration * 0.3));
  const growDur = Math.min(0.75, budget * 0.6);
  const stagger = n > 1 ? Math.min(0.14, (budget - growDur) / (n - 1)) : 0;
  const drawEnd = drawAt + (isLine ? budget : growDur + stagger * (n - 1));
  const hlAt = hl ? clampN(cueAt(cues, hl.word, Math.max(drawEnd + 0.6, duration * 0.55) + LEAD) - LEAD, drawEnd + 0.2, Math.max(drawEnd + 0.2, duration - 1.75)) : 1e6;
  const dim = hl ? enter(calm, frame, fps, hlAt, 0.5) : 0;
  const push = hl ? interpolate(t, [hlAt, hlAt + 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) }) : 0;
  const outlineIn = hl ? enter(calm, frame, fps, hlAt + 0.15, 0.6) : 0;
  const noteIn = hl ? enter(style, frame, fps, hlAt + 0.45, 0.55) : 0;
  const sweep = interpolate(t - hlAt, [0.05, 0.75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const srcIn = props.source ? enter(calm, frame, fps, Math.min(drawEnd + 0.25, duration - 1.2), 0.5) : 0;
  const titleIn = props.title ? enter(style, frame, fps, 0.08, 0.7) : 0;
  const axisIn = enter(calm, frame, fps, Math.max(0, drawAt - 0.3), 0.6);

  const dimInk = mix(style.ink, 16, style.bg);
  const dataCol = (isHl: boolean) => (isHl ? style.accent : `color-mix(in srgb, ${style.accent} ${Math.round((1 - dim) * 100)}%, ${dimInk})`);
  const r0 = style.radius * 0.5;

  const roughRect = (x: number, y: number, w: number, h: number, seed: number) => {
    const pts: string[] = [];
    const sx = Math.max(2, Math.round(w / 60));
    const sy = Math.max(2, Math.round(h / 60));
    for (let i = 0; i <= sx; i++) pts.push(`${x + (w * i) / sx + boil(seed + i, 3)},${y + boil(seed + i + 50, 3)}`);
    for (let i = 1; i <= sy; i++) pts.push(`${x + w + boil(seed + i + 100, 3)},${y + (h * i) / sy}`);
    for (let i = sx - 1; i >= 0; i--) pts.push(`${x + (w * i) / sx + boil(seed + i + 150, 3)},${y + h + boil(seed + i + 200, 2)}`);
    for (let i = sy - 1; i >= 1; i--) pts.push(`${x + boil(seed + i + 250, 3)},${y + (h * i) / sy}`);
    return `M${pts.join(" L")} Z`;
  };
  const roughLine = (x0: number, y0: number, x1: number, y1: number, seed: number) => {
    const seg = 10;
    const pts: string[] = [];
    for (let i = 0; i <= seg; i++) pts.push(`${lerp(x0, x1, i / seg) + (x0 === x1 ? boil(seed + i, 3) : 0)},${lerp(y0, y1, i / seg) + (y0 === y1 ? boil(seed + i, 3) : 0)}`);
    return `M${pts.join(" L")}`;
  };

  const Value = ({ x, y, v, fs, anchor, isHl, show, p }: { x: number; y: number; v: number; fs: number; anchor: "middle" | "start"; isHl: boolean; show: number; p: number }) => (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={style.mono}
      fontWeight={600}
      fontSize={fs * (isHl ? 1 + 0.14 * dim : 1)}
      fill={isHl ? `color-mix(in srgb, ${style.accent} ${Math.round(dim * 100)}%, ${style.ink})` : style.ink}
      opacity={show * (isHl ? 1 : 1 - 0.55 * dim)}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {valStr(Math.round(v * clamp01(p) * 10 ** props.decimals) / 10 ** props.decimals)}
      {unit ? <tspan fontSize={fs * 0.7 * (isHl ? 1 + 0.14 * dim : 1)} dx={fs * 0.08} fill={isHl ? style.accent : style.muted}>{unit}</tspan> : null}
    </text>
  );

  let marks: ReactElement;
  let focusRect: Rect = { l: plotL, t: plotTop, r: plotR, b: plotBottom };
  // Where the note card should try to sit around the highlight, in order.
  let sides: Side[] = ["right", "left", "above", "below"];
  let anchorBias = 0.5;
  // The other bars and their value labels, which the note must not cover.
  let obstacles: Rect[] = [];

  if (orient === "columns") {
    const catFs = clampN(Math.min(narrow ? 34 : 38, catFit), 26, 38);
    const valFs = clampN(Math.min(narrow ? 38 : 44, valFit), 26, 44);
    const baseline = plotBottom - catFs - 22;
    const maxH = baseline - plotTop - valFs * 1.2 - 18;
    const barW = Math.min(slot * 0.62, narrow ? 120 : 170);
    const maxV = Math.max(...vals);
    const bars = data.map((d, i) => {
      const g = enter(style, frame, fps, drawAt + i * stagger, growDur);
      const x = plotL + slot * (i + 0.5);
      const full = (d.value / maxV) * maxH;
      const h = Math.max(0, full * g);
      return { d, i, g, x, full, h, y: baseline - h, isHl: hl?.index === i };
    });
    if (hl) {
      const b = bars[hl.index]!;
      focusRect = { l: b.x - barW / 2, r: b.x + barW / 2, t: baseline - b.full - 14 - valFs, b: baseline };
      // A short bar leaves open sky above it; a tall one doesn't, so the note goes beside it.
      sides = ["above", "right", "left"];
      anchorBias = 0;
      obstacles = bars.filter((o) => !o.isHl).map((o) => ({ l: o.x - Math.max(barW, valEm(o.d.value) * valFs) / 2, r: o.x + Math.max(barW, valEm(o.d.value) * valFs) / 2, t: baseline - o.full - 14 - valFs, b: baseline }));
    }
    marks = (
      <>
        <defs>
          {bars.filter((b) => b.isHl && b.h > 0.5).map((b) => (
            <clipPath key={b.i} id="cb-hl">
              <path d={colPath(b.x - barW / 2, b.y, barW, b.h, r0)} />
            </clipPath>
          ))}
        </defs>
        {[1 / 3, 2 / 3, 1].map((k, j) => (
          <line key={j} x1={plotL} x2={plotL + plotW * axisIn} y1={baseline - maxH * k} y2={baseline - maxH * k} stroke={mix(style.ink, 8)} strokeWidth={2} strokeDasharray="4 12" strokeLinecap="round" />
        ))}
        {bars.map((b) =>
          b.h > 0.5 ? (
            <g key={b.i}>
              <path d={colPath(b.x - barW / 2, b.y, barW, b.h, r0)} fill={dataCol(b.isHl)} />
              {!hand ? <path d={colPath(b.x - barW / 2, b.y, barW, Math.min(b.h, 10), r0)} fill={mix("#ffffff", 14 * (1 - (b.isHl ? 0 : dim)))} /> : null}
              {hand && b.h > 6 ? <path d={roughRect(b.x - barW / 2, b.y, barW, b.h, b.i * 300)} fill="none" stroke={style.ink} strokeWidth={3} strokeLinejoin="round" opacity={b.isHl ? 1 : 1 - 0.6 * dim} /> : null}
            </g>
          ) : null,
        )}
        {bars.filter((b) => b.isHl && b.h > 0.5 && sweep > 0 && sweep < 1).map((b) => (
          <rect key={b.i} clipPath="url(#cb-hl)" x={b.x - barW / 2} y={baseline - b.full * sweep * 1.3 + b.full * 0.15} width={barW} height={b.full * 0.3} fill={mix("#ffffff", 30)} />
        ))}
        {bars.map((b) => (
          <Value key={b.i} x={b.x} y={b.y - 14} v={b.d.value} fs={valFs} anchor="middle" isHl={b.isHl} show={clamp01(b.g * 2)} p={b.g} />
        ))}
        {bars.map((b) => (
          <text
            key={b.i}
            x={b.x}
            y={baseline + 22 + catFs * 0.82}
            textAnchor="middle"
            fontFamily={style.body}
            fontWeight={600}
            fontSize={catFs}
            fill={b.isHl ? `color-mix(in srgb, ${style.ink} ${Math.round(dim * 100)}%, ${style.muted})` : style.muted}
            opacity={enter(calm, frame, fps, drawAt + b.i * stagger - 0.05, 0.4) * (b.isHl ? 1 : 1 - 0.4 * dim)}
          >
            {b.d.label}
          </text>
        ))}
        {hand ? (
          <path d={roughLine(plotL - 10, baseline, plotL - 10 + (plotW + 20) * axisIn, baseline, 900)} fill="none" stroke={style.ink} strokeWidth={3.5} strokeLinecap="round" />
        ) : (
          <rect x={plotL - 10} y={baseline - 1.5} width={(plotW + 20) * axisIn} height={3} rx={1.5} fill={mix(style.ink, 55)} />
        )}
        {hl && outlineIn > 0 ? (
          (() => {
            const b = bars[hl.index]!;
            const x = b.x - barW / 2 - 10;
            const y = baseline - b.full - 10;
            const w = barW + 20;
            const h = b.full + 10;
            return hand ? (
              <path d={roughRect(x, y, w, h, 5000)} fill="none" stroke={style.accent} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - outlineIn} />
            ) : (
              <path d={colPath(x, y, w, h, r0 + 8)} fill="none" stroke={style.accent} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - outlineIn} opacity={0.9} />
            );
          })()
        ) : null}
      </>
    );
  } else if (orient === "rows") {
    const labFs = narrow ? 34 : 38;
    const labW = maxLab * LABEL_EM * labFs + 26;
    const valFs = narrow ? 36 : 42;
    const valW = maxValEm * valFs + 20;
    const x0 = plotL + labW;
    const x1 = plotR - valW;
    const rowH = (plotBottom - plotTop) / n;
    const barH = Math.min(rowH * 0.58, narrow ? 70 : 84);
    const maxV = Math.max(...vals);
    const rows = data.map((d, i) => {
      const g = enter(style, frame, fps, drawAt + i * stagger, growDur);
      const yc = plotTop + rowH * (i + 0.5);
      const full = (d.value / maxV) * (x1 - x0);
      return { d, i, g, yc, full, w: Math.max(0, full * g), isHl: hl?.index === i };
    });
    if (hl) {
      const r = rows[hl.index]!;
      focusRect = { l: x0, r: x0 + r.full + 16 + valEm(r.d.value) * valFs * 1.14, t: r.yc - barH / 2, b: r.yc + barH / 2 };
      sides = ["right", "below", "above"];
      obstacles = rows.filter((o) => !o.isHl).map((o) => ({ l: x0, r: x0 + o.full + 16 + valEm(o.d.value) * valFs, t: o.yc - barH / 2, b: o.yc + barH / 2 }));
    }
    marks = (
      <>
        <defs>
          {rows.filter((r) => r.isHl && r.w > 0.5).map((r) => (
            <clipPath key={r.i} id="cb-hl">
              <path d={rowPath(x0, r.yc - barH / 2, r.w, barH, r0)} />
            </clipPath>
          ))}
        </defs>
        {[1 / 3, 2 / 3, 1].map((k, j) => (
          <line key={j} y1={plotTop} y2={plotTop + (plotBottom - plotTop) * axisIn} x1={x0 + (x1 - x0) * k} x2={x0 + (x1 - x0) * k} stroke={mix(style.ink, 8)} strokeWidth={2} strokeDasharray="4 12" strokeLinecap="round" />
        ))}
        {rows.map((r) =>
          r.w > 0.5 ? (
            <g key={r.i}>
              <path d={rowPath(x0, r.yc - barH / 2, r.w, barH, r0)} fill={dataCol(r.isHl)} />
              {!hand ? <path d={rowPath(x0, r.yc - barH / 2, r.w, Math.min(barH, 9), 0)} fill={mix("#ffffff", 14 * (1 - (r.isHl ? 0 : dim)))} /> : null}
              {hand && r.w > 6 ? <path d={roughRect(x0, r.yc - barH / 2, r.w, barH, r.i * 300)} fill="none" stroke={style.ink} strokeWidth={3} strokeLinejoin="round" opacity={r.isHl ? 1 : 1 - 0.6 * dim} /> : null}
            </g>
          ) : null,
        )}
        {rows.filter((r) => r.isHl && r.w > 0.5 && sweep > 0 && sweep < 1).map((r) => (
          <rect key={r.i} clipPath="url(#cb-hl)" x={x0 + r.full * (sweep * 1.3 - 0.3)} y={r.yc - barH / 2} width={r.full * 0.3} height={barH} fill={mix("#ffffff", 30)} />
        ))}
        {rows.map((r) => (
          <Value key={r.i} x={x0 + r.w + 16} y={r.yc + valFs * 0.36} v={r.d.value} fs={valFs} anchor="start" isHl={r.isHl} show={clamp01(r.g * 2)} p={r.g} />
        ))}
        {rows.map((r) => (
          <text
            key={r.i}
            x={x0 - 22}
            y={r.yc + labFs * 0.36}
            textAnchor="end"
            fontFamily={style.body}
            fontWeight={600}
            fontSize={labFs}
            fill={r.isHl ? `color-mix(in srgb, ${style.ink} ${Math.round(dim * 100)}%, ${style.muted})` : style.muted}
            opacity={enter(calm, frame, fps, drawAt + r.i * stagger - 0.05, 0.4) * (r.isHl ? 1 : 1 - 0.4 * dim)}
          >
            {r.d.label}
          </text>
        ))}
        {hand ? (
          <path d={roughLine(x0, plotTop - 10, x0, plotTop - 10 + (plotBottom - plotTop + 20) * axisIn, 900)} fill="none" stroke={style.ink} strokeWidth={3.5} strokeLinecap="round" />
        ) : (
          <rect x={x0 - 1.5} y={plotTop - 10} width={3} height={(plotBottom - plotTop + 20) * axisIn} rx={1.5} fill={mix(style.ink, 55)} />
        )}
        {hl && outlineIn > 0 ? (
          (() => {
            const r = rows[hl.index]!;
            const x = x0 - 6;
            const y = r.yc - barH / 2 - 10;
            const w = r.full + 16;
            const h = barH + 20;
            return hand ? (
              <path d={roughRect(x, y, w, h, 5000)} fill="none" stroke={style.accent} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - outlineIn} />
            ) : (
              <path d={rowPath(x, y, w, h, r0 + 8)} fill="none" stroke={style.accent} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - outlineIn} opacity={0.9} />
            );
          })()
        ) : null}
      </>
    );
  } else {
    // Line: evenly spaced points, a zero-based scale when the data allows it, value labels only at the ends and the highlight.
    const catFs = narrow ? 32 : 36;
    const valFs = narrow ? 34 : 40;
    const padX = Math.max((maxValEm * valFs) / 2 + 6, 40);
    const xL = plotL + padX;
    const xR = plotR - padX;
    const step = (xR - xL) / (n - 1);
    const every = Math.max(1, Math.ceil((maxLab * LABEL_EM * catFs + 24) / step));
    const shownLabels = new Set<number>();
    for (let i = 0; i < n; i += every) shownLabels.add(i);
    if (hl) {
      for (const i of [...shownLabels]) if (i !== hl.index && Math.abs(i - hl.index) < every) shownLabels.delete(i);
      shownLabels.add(hl.index);
    }
    const baseline = plotBottom - catFs - 22;
    const topY = plotTop + valFs + 24;
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const span = mx - mn || Math.abs(mx) || 1;
    const lo = mn >= 0 && mn <= mx * 0.5 ? 0 : mn - span * 0.25;
    const hi = mx + span * 0.08;
    const yOf = (v: number) => baseline - ((v - lo) / (hi - lo || 1)) * (baseline - topY);
    const pts = data.map((d, i) => ({ x: xL + step * i, y: yOf(d.value) }));
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
    const total = cum[n - 1]!;
    const q = interpolate(t, [drawAt, drawAt + budget], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const drawn = q * total;
    let k = 0;
    while (k < n - 2 && cum[k + 1]! < drawn) k++;
    const segLen = cum[k + 1]! - cum[k]! || 1;
    const u = clamp01((drawn - cum[k]!) / segLen);
    const lead = { x: lerp(pts[k]!.x, pts[k + 1]!.x, u), y: lerp(pts[k]!.y, pts[k + 1]!.y, u) };
    const passed = pts.slice(0, k + 1);
    const lineD = `M${[...passed, lead].map((p) => `${p.x},${p.y}`).join(" L")}`;
    const areaD = `${lineD} L${lead.x},${baseline} L${pts[0]!.x},${baseline} Z`;
    const leadGlow = q > 0 && q < 1 ? 1 : clamp01(1 - (t - drawAt - budget) / 0.3) * (q >= 1 ? 1 : 0);
    const sw = narrow ? 6 : 7;
    // A point pops as the leading dot reaches it (so the last one completes exactly when the line does).
    const pop = (i: number) => {
      const w = total * 0.04 + 1;
      const a = clamp01((drawn - cum[i]! + w) / w);
      return q > 0 && a > 0 ? Easing.out(Easing.back(2))(a) : 0;
    };
    const valueAt = new Set([0, n - 1, ...(hl ? [hl.index] : [])]);
    if (hl) {
      const p = pts[hl.index]!;
      focusRect = { l: p.x - 34, r: p.x + 34, t: p.y - 40 - valFs * 1.14, b: p.y + 34 };
      sides = ["above", "below", "right", "left"];
      // The line itself is an obstacle: sample it every ~30 px, skipping the highlight's own neighbourhood.
      for (let i = 0; i < n - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 30));
        for (let s = 0; s <= steps; s++) {
          const x = lerp(a.x, b.x, s / steps);
          const y = lerp(a.y, b.y, s / steps);
          if (Math.hypot(x - p.x, y - p.y) > 40) obstacles.push({ l: x - 10, r: x + 10, t: y - 10, b: y + 10 });
        }
      }
      for (const i of valueAt) if (i !== hl.index) obstacles.push({ l: pts[i]!.x - (valEm(data[i]!.value) * valFs) / 2, r: pts[i]!.x + (valEm(data[i]!.value) * valFs) / 2, t: pts[i]!.y - 24 - valFs, b: pts[i]!.y - 24 });
    }
    const lineCol = `color-mix(in srgb, ${style.accent} ${Math.round((1 - dim * 0.7) * 100)}%, ${dimInk})`;
    marks = (
      <>
        <defs>
          <linearGradient id="cb-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={style.accent} stopOpacity={0.26 * (1 - 0.6 * dim)} />
            <stop offset="1" stopColor={style.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[1 / 3, 2 / 3, 1].map((f, j) => (
          <line key={j} x1={plotL} x2={plotL + plotW * axisIn} y1={baseline - (baseline - topY) * f} y2={baseline - (baseline - topY) * f} stroke={mix(style.ink, 8)} strokeWidth={2} strokeDasharray="4 12" strokeLinecap="round" />
        ))}
        {hand ? (
          <path d={roughLine(plotL - 10, baseline, plotL - 10 + (plotW + 20) * axisIn, baseline, 900)} fill="none" stroke={style.ink} strokeWidth={3.5} strokeLinecap="round" />
        ) : (
          <rect x={plotL - 10} y={baseline - 1.5} width={(plotW + 20) * axisIn} height={3} rx={1.5} fill={mix(style.ink, 55)} />
        )}
        {hl && outlineIn > 0 ? (
          <line x1={pts[hl.index]!.x} x2={pts[hl.index]!.x} y1={baseline} y2={baseline - (baseline - pts[hl.index]!.y) * outlineIn} stroke={style.accent} strokeWidth={3} strokeDasharray="6 10" strokeLinecap="round" opacity={0.8} />
        ) : null}
        {q > 0 ? (
          <>
            <path d={areaD} fill="url(#cb-area)" />
            <path d={lineD} fill="none" stroke={lineCol} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : null}
        {pts.map((p, i) => {
          const a = pop(i);
          const isHl = hl?.index === i;
          if (a <= 0) return null;
          const r = (isHl ? 10 + 6 * dim : 9) * a;
          return <circle key={i} cx={p.x} cy={p.y} r={r} fill={isHl && dim > 0 ? `color-mix(in srgb, ${style.accent} ${Math.round(dim * 100)}%, ${style.bg})` : style.bg} stroke={isHl ? style.accent : lineCol} strokeWidth={hand ? 4 : 4} />;
        })}
        {q > 0 && leadGlow > 0 ? (
          <>
            <circle cx={lead.x} cy={lead.y} r={30} fill={style.accent} opacity={0.22 * leadGlow} />
            <circle cx={lead.x} cy={lead.y} r={13} fill={style.accent} stroke={style.bg} strokeWidth={4} opacity={leadGlow} />
          </>
        ) : null}
        {hl && outlineIn > 0 ? <circle cx={pts[hl.index]!.x} cy={pts[hl.index]!.y} r={30} fill="none" stroke={style.accent} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - outlineIn} transform={`rotate(-90 ${pts[hl.index]!.x} ${pts[hl.index]!.y})`} /> : null}
        {pts.map((p, i) =>
          valueAt.has(i) ? <Value key={i} x={p.x} y={p.y - 24 - (hl?.index === i ? 16 * outlineIn : 0)} v={data[i]!.value} fs={valFs} anchor="middle" isHl={hl?.index === i} show={clamp01(pop(i))} p={1} /> : null,
        )}
        {pts.map((p, i) =>
          shownLabels.has(i) ? (
            <text
              key={i}
              x={p.x}
              y={baseline + 22 + catFs * 0.82}
              textAnchor="middle"
              fontFamily={style.body}
              fontWeight={600}
              fontSize={catFs}
              fill={hl?.index === i ? `color-mix(in srgb, ${style.ink} ${Math.round(dim * 100)}%, ${style.muted})` : style.muted}
              opacity={enter(calm, frame, fps, Math.max(0, drawAt - 0.2 + (i / n) * budget * 0.6), 0.4) * (hl?.index === i ? 1 : 1 - 0.4 * dim)}
            >
              {data[i]!.label}
            </text>
          ) : null,
        )}
      </>
    );
  }

  // Camera: born a touch close and settles back, then on the highlight pushes in around the insight; a very slow drift keeps holds alive.
  const arrive = enter(calm, frame, fps, 0, 1.1);
  const C = { x: (plotL + plotR) / 2, y: (plotTop + plotBottom) / 2 };
  const F = { x: (focusRect.l + focusRect.r) / 2, y: (focusRect.t + focusRect.b) / 2 };
  const drift = (at: number) => 1 + 0.004 * Math.max(0, at - 1);
  const cam = (1.04 - 0.04 * arrive) * (1 + PUSH * push) * drift(t);
  const O = { x: lerp(C.x, F.x, push), y: lerp(C.y, F.y, push) };
  const mapRect = (r: Rect, s: number, o: { x: number; y: number }): Rect => ({ l: o.x + (r.l - o.x) * s, r: o.x + (r.r - o.x) * s, t: o.y + (r.t - o.y) * s, b: o.y + (r.b - o.y) * s });

  // The note card: sized from its text, placed on the first side of the highlight that fits once the camera has arrived, then kept attached as the camera moves.
  let note: ReactElement | null = null;
  if (hl && noteIn > 0) {
    const noteFs = hand ? 50 : narrow ? 38 : 42;
    const noteEm = hand ? 0.42 : LABEL_EM;
    const padX = 26;
    const padY = 18;
    const maxCardW = narrow ? 440 : 540;
    const innerMax = maxCardW - padX * 2 - 8;
    const textW = hl.note.length * noteEm * noteFs;
    const lines = Math.max(1, Math.ceil(textW / innerMax));
    // Balanced wrapping makes every line about the same length, so the card hugs that instead of the maximum width.
    const innerW = lines === 1 ? textW + 10 : Math.min(innerMax, (textW / lines) * 1.12 + 10);
    const cw = innerW + padX * 2 + 8;
    const ch = lines * noteFs * 1.15 + padY * 2;
    const G = 56;
    const safe: Rect = { l: side * 0.55, r: W - side * 0.55, t: props.title ? titleBottom + 16 : 40, b: H - (props.source ? 120 : 60) };
    const place = (r: Rect, s: Side) => {
      const ay = anchorBias === 0 ? r.t + ch * 0.2 - ch / 2 : (r.t + r.b) / 2 - ch / 2;
      if (s === "right") return { x: r.r + G, y: ay };
      if (s === "left") return { x: r.l - G - cw, y: ay };
      if (s === "above") return { x: (r.l + r.r) / 2 - cw / 2, y: r.t - G - ch };
      return { x: (r.l + r.r) / 2 - cw / 2, y: r.b + G };
    };
    const overflow = (p: { x: number; y: number }) => Math.max(0, safe.l - p.x) + Math.max(0, p.x + cw - safe.r) + Math.max(0, safe.t - p.y) + Math.max(0, p.y + ch - safe.b);
    const sF = (1 + PUSH) * drift(hlAt + 0.9);
    const finalRect = mapRect(focusRect, sF, F);
    const finalObs = obstacles.map((o) => mapRect(o, sF, F));
    const hits = (p: { x: number; y: number }) => finalObs.filter((o) => p.x < o.r + 12 && p.x + cw > o.l - 12 && p.y < o.b + 12 && p.y + ch > o.t - 12);
    // A card above that would cover a neighbour rises over it (the leader just gets longer); beside the highlight it can't move, so it only counts as a miss.
    const lift = (s: Side) => {
      const p = place(finalRect, s);
      let dy = 0;
      if (s === "above") for (let k = 0; k < finalObs.length; k++) {
        const hit = hits({ x: p.x, y: p.y + dy });
        if (!hit.length) break;
        dy = Math.min(...hit.map((o) => o.t - 16 - ch)) - p.y;
      }
      return dy;
    };
    const score = (s: Side) => {
      const p = place(finalRect, s);
      const q = { x: p.x, y: p.y + lift(s) };
      return overflow(q) + hits(q).length * 400;
    };
    const chosen = sides.find((s) => score(s) <= 0.5) ?? sides.reduce((a, s) => (score(s) < score(a) ? s : a));
    const dyLift = lift(chosen);
    const nowRect = mapRect(focusRect, cam, O);
    const base = place(nowRect, chosen);
    const raw = { x: base.x, y: base.y + dyLift };
    const pos = { x: clampN(raw.x, safe.l, safe.r - cw), y: clampN(raw.y, safe.t, safe.b - ch) };
    const dir = { right: [-1, 0], left: [1, 0], above: [0, 1], below: [0, -1] }[chosen];
    const off = (1 - noteIn) * 34;
    const cardC = { x: pos.x + cw / 2, y: pos.y + ch / 2 };
    const P = { x: clampN(cardC.x, nowRect.l, nowRect.r), y: clampN(cardC.y, nowRect.t, nowRect.b) };
    const Q = { x: clampN(P.x, pos.x, pos.x + cw), y: clampN(P.y, pos.y, pos.y + ch) };
    const lineIn = clamp01(noteIn * 1.4);
    note = (
      <>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <line x1={P.x} y1={P.y} x2={lerp(P.x, Q.x, lineIn)} y2={lerp(P.y, Q.y, lineIn)} stroke={style.accent} strokeWidth={hand ? 4 : 3} strokeLinecap="round" />
          <circle cx={P.x} cy={P.y} r={7 * clamp01(noteIn * 2)} fill={style.accent} stroke={style.bg} strokeWidth={3} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            width: cw,
            boxSizing: "border-box",
            padding: `${padY}px ${padX}px ${padY}px ${padX + 8}px`,
            background: style.surface,
            border: hand ? `3px solid ${style.ink}` : `1.5px solid ${mix(style.ink, 12)}`,
            borderRadius: Math.min(style.radius, 18),
            boxShadow: hand ? "none" : `0 18px 44px rgba(0,0,0,${0.16 * noteIn})`,
            opacity: clamp01(noteIn * 1.5),
            transform: `translate(${dir[0]! * off}px, ${dir[1]! * off}px) scale(${0.96 + 0.04 * noteIn})${hand ? " rotate(-1deg)" : ""}`,
            transformOrigin: chosen === "right" ? "0% 50%" : chosen === "left" ? "100% 50%" : "50% 50%",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: style.accent }} />
          <div
            style={{
              fontFamily: hand ? style.display : style.body,
              fontWeight: hand ? 700 : 600,
              fontSize: noteFs,
              lineHeight: 1.15,
              letterSpacing: hand ? 0 : "-0.01em",
              color: style.ink,
              textWrap: "balance",
            }}
          >
            {hl.note}
          </div>
        </div>
      </>
    );
  }

  const glow = { x: lerp(C.x, F.x, push) - H * 0.55 + 60 * Math.sin((2 * Math.PI * t) / 13), y: lerp(C.y, F.y, push) - H * 0.55 + 40 * Math.cos((2 * Math.PI * t) / 17) };

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: base light, a faint measuring grid and one drifting accent glow that follows the camera's focus. */}
      <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 30% 15%, ${style.surface} 0%, transparent 70%)`, opacity: 0.75 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${mix(style.ink, 4)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${mix(style.ink, 4)} 1.5px, transparent 1.5px)`,
          backgroundSize: "72px 72px",
          backgroundPosition: `${W / 2}px ${H / 2}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      <div style={{ position: "absolute", left: glow.x, top: glow.y, width: H * 1.1, height: H * 1.1, borderRadius: "50%", background: `radial-gradient(circle, ${style.accent} 0%, transparent 65%)`, opacity: 0.07 + 0.04 * dim }} />

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${O.x}px ${O.y}px` }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {marks}
        </svg>
      </AbsoluteFill>

      {/* HUD: title, source and the note live outside the camera so they never zoom. */}
      {props.title ? (
        <div style={{ position: "absolute", left: side, top: titleTop, width: W - side * 2, overflow: "hidden", paddingBottom: 8, opacity: 1 - 0.4 * dim }}>
          <div
            style={{
              fontFamily: style.display,
              fontWeight: 700,
              fontSize: titleFs,
              lineHeight: 1.12,
              letterSpacing: hand ? 0 : "-0.02em",
              color: style.ink,
              textWrap: "balance",
              transform: `translateY(${(1 - titleIn) * 110}%)`,
            }}
          >
            {props.title}
          </div>
        </div>
      ) : null}

      {note}

      {props.source ? (
        <div
          style={{
            position: "absolute",
            left: side,
            top: H - (narrow ? 64 : 76) - 28,
            display: "flex",
            alignItems: "center",
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
        </div>
      ) : null}

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.14) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "chart-bars",
  title: "Chart bars",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "A small data story (2–8 numbers): bars that grow in with a stagger for comparing things, or a line that draws itself behind a leading dot for change over time. Then one bar or point is the insight: the rest dims, the camera pushes in and a short note is pinned beside it. Title and source line optional; numbers in mono. Bars switch to horizontal rows on their own when labels don't fit side by side. As a split panel it sits beside face cam. No media.",
  avoid:
    "A single number (use stat-punch), more than 8 items, values that don't share a unit, numbers that aren't in research/sources.md, and two charts back to back. Under 4 s the draw and the highlight crowd each other; skip highlight for a chart that is only context.",
  schema,
  example: {
    kind: "bar",
    title: "API response time by setup",
    data: [
      { label: "No cache", value: 840 },
      { label: "+ Index", value: 310 },
      { label: "+ Pooling", value: 240 },
      { label: "+ Redis", value: 62 },
      { label: "+ CDN", value: 24 },
    ],
    unit: "ms",
    decimals: 0,
    orient: "auto",
    drawWord: "every",
    highlight: { index: 3, note: "Redis alone cut it by 74%", word: "Redis" },
    source: "Example data, not a real benchmark",
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.2, end: 0.45, word: "Here's" },
    { at: 0.45, end: 0.7, word: "what" },
    { at: 0.7, end: 1.0, word: "every" },
    { at: 1.0, end: 1.3, word: "fix" },
    { at: 1.3, end: 1.6, word: "did" },
    { at: 3.1, end: 3.4, word: "but" },
    { at: 3.6, end: 4.0, word: "Redis" },
    { at: 4.0, end: 4.4, word: "changed" },
    { at: 4.4, end: 4.9, word: "everything" },
  ],
  seconds: { min: 4, max: 10, demo: 7 },
  mediaSlots: 0,
  credit: { name: "'Steam new releases news recap' and 'Stock analysis app promo' (prompt-motion.com)", url: "https://prompt-motion.com" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <ChartBars props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
