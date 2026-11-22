// Text that carries data: the finding headline whose coloured word is the legend, a claim with a word-sized sparkline, and the ranked table.
import type { FC } from "react";
import { ramp, useTime } from "../../core/time";
import { F, LABEL, MARGIN, MONO, OUT3, OUTEXPO, SERIF, SIZE, TITLE, TNUM, useTone } from "./theme";
import { PulseRing } from "./primitives";
import { fmt, pathOf, slicePoly, type Pt } from "./scale";

export type HeadWord = { w: string; t: number; hi?: boolean };

const wordIn = (t: number, at: number) => ramp(t, at - 3 * F, 8 * F, OUT3);

export type HeadlineProps = {
  y: number;
  words: HeadWord[];
  kicker?: string;
  kickerAt?: number;
  dek?: string;
  dekAt?: number;
  credit?: string;
  creditAt?: number;
  x?: number;
  width?: number;
  size?: number;
};

// The headline states the finding; its highlighted words get a colour swatch underneath, so the headline doubles as the chart's legend.
export const Headline: FC<HeadlineProps> = ({ y, words, kicker, kickerAt = 0, dek, dekAt = 0, credit, creditAt = 0, x = MARGIN, width = 1500, size = SIZE.title }) => {
  const { t } = useTime();
  const tone = useTone();
  const rule = ramp(t, kickerAt - 4 * F, 12 * F, OUT3);
  const k = ramp(t, kickerAt, 8 * F);
  return (
    <div style={{ position: "absolute", left: x, top: y, width }}>
      {kicker ? (
        <>
          <div style={{ width: 140 * rule, height: 6, background: tone.ink, marginBottom: 26 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: k, fontFamily: MONO, fontSize: 30, letterSpacing: "0.06em", color: tone.muted, marginBottom: 30 }}>
            <div style={{ width: 18, height: 18, background: tone.hi }} />
            {kicker.toUpperCase()}
          </div>
        </>
      ) : null}
      <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.025em", color: tone.ink }}>
        {words.map((wd, i) => {
          const p = wordIn(t, wd.t);
          const sw = wd.hi ? ramp(t, wd.t + 4 * F, 10 * F, OUT3) : 0;
          return (
            <span key={i} style={{ display: "inline-block", position: "relative", marginRight: "0.24em", opacity: p, transform: `translateY(${(1 - p) * 0.18}em)`, color: wd.hi ? tone.hi : tone.ink }}>
              {wd.w}
              {wd.hi ? <span style={{ position: "absolute", left: 0, bottom: "-0.04em", height: "0.1em", width: `${sw * 100}%`, background: tone.hi }} /> : null}
            </span>
          );
        })}
      </div>
      {dek ? (
        <div style={{ marginTop: 34, maxWidth: 1180, fontFamily: SERIF, fontStyle: "italic", fontSize: 46, lineHeight: 1.3, color: tone.muted, opacity: ramp(t, dekAt, 10 * F), transform: `translateY(${(1 - ramp(t, dekAt, 10 * F, OUT3)) * 10}px)` }}>{dek}</div>
      ) : null}
      {credit ? (
        <div style={{ marginTop: 44, display: "flex", alignItems: "center", gap: 18, fontFamily: MONO, fontSize: SIZE.small, letterSpacing: "0.05em", color: tone.muted, opacity: ramp(t, creditAt, 10 * F) }}>
          <div style={{ width: 60 * ramp(t, creditAt, 12 * F, OUT3), height: 2, background: tone.muted }} />
          {credit.toUpperCase()}
        </div>
      ) : null}
    </div>
  );
};

export type ClaimWord = { w: string; t: number; hi?: boolean; spark?: number[] };

// Sparkline the size of a word: draws itself right after its word lands, ends on a breathing dot.
const WordSpark: FC<{ values: number[]; at: number }> = ({ values, at }) => {
  const { t } = useTime();
  const tone = useTone();
  const w = 190;
  const h = 70;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => [6 + (i / (values.length - 1)) * (w - 22), h - 8 - ((v - min) / (max - min || 1)) * (h - 22)] as Pt);
  const p = ramp(t, at, 16 * F, OUT3);
  const part = slicePoly(pts, p);
  const end = pts[pts.length - 1]!;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "inline-block", verticalAlign: "-0.06em", marginLeft: "0.1em", marginRight: "0.3em", overflow: "visible" }}>
      <line x1={6} x2={w - 16} y1={h - 2} y2={h - 2} stroke={tone.grid} strokeWidth={3} opacity={ramp(t, at - 4 * F, 6 * F)} />
      {part.length > 1 ? <path d={pathOf(part)} fill="none" stroke={tone.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : null}
      {p >= 1 ? <PulseRing x={end[0]} y={end[1]} at={at + 16 * F} r={7} /> : null}
    </svg>
  );
};

// One claim, word by word on the narration's times: the key figure gets a marker sweep and can carry its own inline sparkline.
export const ClaimLine: FC<{ y: number; words: ClaimWord[]; size?: number; x?: number; width?: number; align?: "left" | "center" }> = ({ y, words, size = 84, x = MARGIN, width = 1728, align = "center" }) => {
  const { t } = useTime();
  const tone = useTone();
  return (
    <div style={{ position: "absolute", left: x, top: y, width, textAlign: align, fontFamily: TITLE, fontWeight: 600, fontSize: size, lineHeight: 1.25, letterSpacing: "-0.02em", color: tone.ink, transform: "translateY(-50%)" }}>
      {words.map((wd, i) => {
        const p = wordIn(t, wd.t);
        const m = wd.hi ? ramp(t, wd.t, 10 * F, OUT3) : 0;
        return (
          <span key={i} style={{ whiteSpace: "nowrap" }}>
            <span
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${(1 - p) * 0.15}em)`,
                color: wd.hi && m > 0.3 ? tone.hi : tone.ink,
                fontWeight: wd.hi ? 700 : 600,
                padding: "0 0.08em",
                marginRight: wd.spark ? 0 : "0.14em",
                backgroundImage: `linear-gradient(${tone.hi}26, ${tone.hi}26)`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 88%",
                backgroundSize: `${m * 100}% 42%`,
                ...TNUM,
              }}
            >
              {wd.w}
            </span>
            {wd.spark ? <WordSpark values={wd.spark} at={wd.t + 6 * F} /> : null}
          </span>
        );
      })}
    </div>
  );
};

export type RankRow = { label: string; value: number; t: number; hi?: boolean };

// A newsroom table: header rule, one row per spoken item with an in-cell bar; a soft reading band follows the newest row.
export const RankedTable: FC<{ x: number; y: number; w: number; rows: RankRow[]; at: number; head?: [string, string]; valueFmt?: (v: number) => string; rowH?: number }> = ({ x, y, w, rows, at, head = ["name", "value"], valueFmt = (v) => fmt(v), rowH = 104 }) => {
  const { t } = useTime();
  const tone = useTone();
  const max = Math.max(...rows.map((r) => r.value));
  const barX = 520;
  const barW = w - barX - 220;
  const latest = rows.reduce((k, r, i) => (t >= r.t - 3 * F ? i : k), -1);
  const bandY = rows.reduce((acc, r, i) => (i === 0 ? i : acc + (i - acc) * ramp(t, r.t - 3 * F, 10 * F, OUT3)), 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, fontFamily: LABEL, color: tone.ink, ...TNUM }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: SIZE.small, letterSpacing: "0.06em", color: tone.muted, paddingBottom: 14, opacity: ramp(t, at, 8 * F) }}>
        <span style={{ paddingLeft: 100 }}>{head[0].toUpperCase()}</span>
        <span>{head[1].toUpperCase()}</span>
      </div>
      <div style={{ height: 4, width: `${ramp(t, at, 12 * F, OUT3) * 100}%`, background: tone.ink }} />
      <div style={{ position: "relative" }}>
        {latest >= 0 ? <div style={{ position: "absolute", left: -24, right: -24, top: bandY * rowH + 6, height: rowH - 12, background: tone.grid, opacity: 0.7 }} /> : null}
        {rows.map((r, i) => {
          const p = ramp(t, r.t - 3 * F, 8 * F, OUT3);
          const b = ramp(t, r.t + 2 * F, 16 * F, OUT3);
          return (
            <div key={r.label} style={{ position: "relative", height: rowH, display: "flex", alignItems: "center", borderBottom: `2px solid ${tone.grid}`, opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>
              <div style={{ width: 100, display: "flex" }}>
                <div style={{ minWidth: 56, height: 56, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 32, background: r.hi ? tone.hi : "transparent", color: r.hi ? tone.onHi : tone.muted, border: r.hi ? "none" : `2px solid ${tone.context}` }}>{i + 1}</div>
              </div>
              <div style={{ width: barX - 100, fontSize: 42, fontWeight: r.hi ? 700 : 600, color: r.hi ? tone.hi : tone.ink }}>{r.label}</div>
              <div style={{ width: barW, height: 30, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (r.value / max) * barW * b, background: r.hi ? tone.hi : tone.context }} />
              </div>
              <div style={{ flex: 1, textAlign: "right", fontSize: 44, fontWeight: 700, color: r.hi ? tone.hi : tone.ink, opacity: ramp(t, r.t + 10 * F, 8 * F, OUTEXPO) }}>{valueFmt(r.value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
