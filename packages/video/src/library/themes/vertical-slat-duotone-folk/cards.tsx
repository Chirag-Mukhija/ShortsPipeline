// Slat cards for narrated beats: key word, woven list, big number with a tally weave, dark-vs-sand comparison, prologue quote between poppies, loom bar chart and the source label.
import type { FC } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { W, H } from "../../core/video";
import { INOUT, ramp } from "../../core/time";
import { hash, useLoom } from "./clock";
import { Mark, SlatCanvas, Stage, type Tone } from "./loom";
import { ColumnClip } from "./transitions";
import { cabin, cloudIcon, poppy } from "./art";
import { kilim } from "./scenes";
import { Caps, SlatText, SlatType, SlatWords, type Word } from "./type";
import { DUTY, GROUND, INK, M, SAND, SERIF, TAN, UMBER, WIDE, type Section } from "./theme";

const EXPO_OUT = Easing.out(Easing.exp);

// ---------- key word ----------
export type KeyWordProps = { lead: Word[]; word: string; at: number; tail?: string; tailAt?: number; size?: number };

// A claim lands on its spoken word: the lead line resolves word by word, then the key word rises in heavy slats and its comb teeth grow taller.
export const KeyWord: FC<KeyWordProps> = ({ lead, word, at, tail, tailAt, size = 210 }) => {
  const { t } = useLoom();
  const lift = 0.2 + 1.1 * ramp(t, at + 0.4, 0.5, INOUT);
  return (
    <Stage>
      <SlatWords words={lead} x={W / 2} y={360} size={54} />
      <SlatType text={word} x={W / 2} y={650} size={size} anchor="middle" at={at - 0.15} spread={0.45} lift={lift} em={0.9} />
      {tail && <SlatText lines={[tail]} x={W / 2} y={820} size={58} italic at={tailAt ?? at + 0.8} />}
    </Stage>
  );
};

// ---------- list ----------
export type SlatListProps = { title?: string; items: { text: string; note?: string; at: number }[] };

// Steps that weave a tapestry: each item's numeral rises in slats as it's said, the previous row thins to grey stripes, and a kilim strip on the right gains one band per item.
export const SlatList: FC<SlatListProps> = ({ title, items }) => {
  const { t } = useLoom();
  const band = 150;
  const gap = 190;
  const y0 = 370;
  return (
    <AbsoluteFill>
      <SlatCanvas x={1424} y={y0 - 120} w={400} h={items.length * band} tone={kilim({ w: 400, band, woven: (k) => (items[k] ? ramp(t, items[k]!.at, 0.7, INOUT) : 0) })} />
      <Stage>
        {title && <Caps lines={[title]} x={M} y={170} at={(items[0]?.at ?? 0) - 0.6} />}
        {items.map((it, i) => {
          const y = y0 + i * gap;
          const next = items[i + 1]?.at;
          const dim = next === undefined ? 0 : ramp(t, next, 0.5, INOUT);
          const lv = ramp(t, it.at, 0.6, INOUT) * (1 - 0.6 * dim);
          return (
            <g key={i}>
              <SlatType text={String(i + 1).padStart(2, "0")} x={M} y={y} size={92} at={it.at - 0.1} spread={0.2} duty={DUTY * (1 - 0.5 * dim)} />
              <SlatText lines={[it.text]} x={330} y={y - 14} size={64} weight={600} anchor="start" level={lv} />
              {it.note && <Caps lines={[it.note]} x={332} y={y + 40} level={lv * 0.9} />}
            </g>
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- big number ----------
export type SlatStatProps = { value: number; at: number; prefix?: string; suffix?: string; label?: string; caption?: string; of?: number; decimals?: number };

// A big number counts up in heavy slats; under it a tally weave of 50 bars, the filled share standing tall.
export const SlatStat: FC<SlatStatProps> = ({ value, at, prefix = "", suffix = "", label, caption, of = 100, decimals = 0 }) => {
  const { t } = useLoom();
  const c = value * ramp(t, at + 0.1, 1.5, Easing.out(Easing.cubic));
  const txt = `${prefix}${c.toFixed(decimals)}${suffix}`;
  const n = 50;
  const filled = Math.round((c / of) * n);
  const show = ramp(t, at, 0.5);
  return (
    <Stage>
      {label && <Caps lines={[label]} x={W / 2} y={230} anchor="middle" at={at - 0.3} />}
      <SlatType text={txt} x={W / 2} y={610} size={300} anchor="middle" at={at} spread={0.5} em={0.92} />
      {Array.from({ length: n }, (_, i) => {
        const on = i < filled;
        const hgt = on ? 80 + hash(i, 5) * 14 : 22;
        return <rect key={i} x={360 + i * 24 + (on ? 6 : 10)} y={790 - hgt * show} width={on ? 12 : 3} height={hgt * show} fill={TAN} />;
      })}
      {caption && <SlatText lines={[caption]} x={W / 2} y={890} size={52} italic at={at + 0.9} />}
    </Stage>
  );
};

// ---------- comparison ----------
export type VersusSide = { title: string; lines: string[]; icon: "cloud" | "cabin" | Tone };
export type VersusProps = { left: VersusSide; right: VersusSide; at: { left: number; right: number } };

const SideArt: FC<{ side: VersusSide; section: Section; x0: number; at: number }> = ({ side, section, x0, at }) => {
  const { t } = useLoom();
  const icon: Tone = side.icon === "cloud" ? cloudIcon({ x: 480, y: 220 }) : side.icon === "cabin" ? cabin({ x: 480, y: 250, s: 0.82, t }) : side.icon;
  const ink = INK[section];
  return (
    <>
      <SlatCanvas x={x0} y={110} w={960} h={380} section={section} tone={(x, y) => icon(x, y)} col={(i) => {
        const g = Math.min(1, Math.max(0, ramp(t, at - 0.2, 0.9, INOUT) * 1.6 - (i / 160) * 0.6));
        return { gain: g };
      }} />
      <Stage>
        <SlatType text={side.title} x={x0 + 480} y={620} size={104} anchor="middle" at={at} spread={0.35} color={ink} em={0.9} />
        <SlatText lines={side.lines} x={x0 + 480} y={730} size={48} lh={62} color={ink} at={at + 0.45} stagger={0.3} />
      </Stage>
    </>
  );
};

// A vs B as the theme's two sections: A in tan slats on umber, B in umber slats on sand, B's half turning over louvre by louvre when it's said.
export const Versus: FC<VersusProps> = ({ left, right, at }) => {
  const { t } = useLoom();
  const period = 24;
  const n = W / period;
  const phi = (i: number) => ramp(t, at.right - 0.3 + ((i - n / 2) / (n / 2)) * 0.5 + hash(i, 3) * 0.08, 0.3, INOUT);
  const badge = ramp(t, at.right + 0.3, 0.4, EXPO_OUT);
  return (
    <AbsoluteFill>
      <SideArt side={left} section="dark" x0={0} at={at.left} />
      <ColumnClip period={period} rect={(i, x) => (x < W / 2 || phi(i) <= 0 ? null : [x + (period * (1 - phi(i))) / 2, 0, period * phi(i), H])}>
        <AbsoluteFill style={{ left: W / 2, width: W / 2, background: GROUND.sand }} />
        <SideArt side={right} section="sand" x0={W / 2} at={at.right} />
      </ColumnClip>
      <Stage>
        <g opacity={badge} transform={`translate(${W / 2} 470) scale(${0.8 + 0.2 * badge})`}>
          <rect x={-66} y={-66} width={132} height={132} fill={UMBER} stroke={TAN} strokeWidth={3} />
          <text x={0} y={22} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight={600} fontSize={68} fill={SAND}>vs</text>
        </g>
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- quote ----------
export type SerifQuoteProps = { lines: string[]; at: number | number[]; kicker?: string; cite?: string; citeAt?: number; flowers?: boolean };

// The prologue quote: centred serif caps waiting as thin grey stripes, each line resolving to solid type on its cue, between swaying slat poppies.
export const SerifQuote: FC<SerifQuoteProps> = ({ lines, at, kicker, cite, citeAt, flowers = true }) => {
  const { t } = useLoom();
  const first = Array.isArray(at) ? at[0] ?? 0 : at;
  const grow = (i: number) => Math.min(1, Math.max(0, ramp(t, first - 0.8, 1.2, INOUT) * 1.5 - (i / 70) * 0.5));
  const sway = (k: number) => Math.sin(t * 0.9 + k * 1.7) * 6;
  const lh = 72;
  const y0 = 540 - ((lines.length - 1) * lh) / 2 + 10;
  const leftF = [poppy({ x: 170, y: 300, r: 118, rot: 0.3, sway: sway(0) }), poppy({ x: 300, y: 620, r: 88, rot: 1.1, sway: sway(1) }), poppy({ x: 120, y: 840, r: 70, rot: 2, sway: sway(2) })];
  const rightF = [poppy({ x: 240, y: 260, r: 108, rot: 0.8, sway: sway(3) }), poppy({ x: 100, y: 560, r: 98, rot: 0.1, sway: sway(4) }), poppy({ x: 280, y: 830, r: 78, rot: 1.6, sway: sway(5) })];
  const union = (fs: Tone[]): Tone => (x, y) => {
    for (const f of fs) {
      const v = f(x, y);
      if (v > 0) return v;
    }
    return 0;
  };
  return (
    <AbsoluteFill>
      {flowers && (
        <>
          <SlatCanvas x={0} y={0} w={420} h={H} tone={union(leftF)} col={(i) => ({ gain: grow(i) })} />
          <SlatCanvas x={W - 420} y={0} w={420} h={H} tone={union(rightF)} col={(i) => ({ gain: grow(70 - i) })} />
        </>
      )}
      <Stage>
        {kicker && <Caps lines={[`· · ·  ${kicker}  · · ·`]} x={W / 2} y={y0 - 120} anchor="middle" at={first - 0.6} />}
        <SlatText lines={lines.map((l) => l.toUpperCase())} x={W / 2} y={y0} size={56} lh={lh} italic spacing="0.02em" from={0.28} at={at} dur={0.66} />
        {cite && <Caps lines={[cite]} x={W / 2} y={y0 + lines.length * lh + 40} anchor="middle" at={citeAt ?? (Array.isArray(at) ? at[at.length - 1]! : at) + 0.8} />}
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- chart ----------
export type LoomChartProps = { title?: string; data: { label: string; value: number; key?: boolean }[]; at: number; stagger?: number; max?: number; unit?: string };

// A bar chart woven on a loom: each bar is a cluster of slats rising one after another with a fringed top; the key bar is denser and its teeth taller.
export const LoomChart: FC<LoomChartProps> = ({ title, data, at, stagger = 0.3, max, unit = "" }) => {
  const { t } = useLoom();
  const top = max ?? Math.max(...data.map((d) => d.value)) * 1.1;
  const base = 820;
  const span = 470;
  const gw = Math.min(260, 1500 / data.length);
  const x0 = W / 2 - (gw * data.length) / 2;
  const slats = 12;
  return (
    <Stage>
      {title && <Caps lines={[title]} x={M} y={170} at={at - 0.5} />}
      {Array.from({ length: Math.floor((W - M * 2) / 10) }, (_, i) => (
        <rect key={i} x={M + i * 10} y={base + 8} width={3} height={i % 5 === 0 ? 14 : 7} fill={TAN} opacity={ramp(t, at - 0.4 + i * 0.002, 0.3)} />
      ))}
      {data.map((d, gi) => {
        const cx = x0 + gi * gw + gw / 2;
        const ga = at + gi * stagger;
        const hFull = (d.value / top) * span;
        const land = ramp(t, ga + 0.5, 0.4);
        return (
          <g key={gi}>
            {Array.from({ length: slats }, (_, j) => {
              const e = ramp(t, ga + j * 0.025, 0.7, EXPO_OUT);
              const teeth = (hash(gi, j, 2) - 0.5) * (d.key ? 30 : 14) + (d.key && j % 2 === 0 ? 14 : 0);
              const hh = Math.max(0, (hFull + teeth) * e);
              const bw = d.key ? 8 : 4;
              return <rect key={j} x={cx - (slats * 10) / 2 + j * 10 + (10 - bw) / 2} y={base - hh} width={bw} height={hh} fill={TAN} />;
            })}
            <SlatText lines={[`${d.value}${unit}`]} x={cx} y={base - hFull - 40} size={d.key ? 52 : 40} font={WIDE} weight={d.key ? 800 : 500} level={land} />
            <Caps lines={[d.label]} x={cx} y={base + 66} anchor="middle" level={ramp(t, ga, 0.4)} />
          </g>
        );
      })}
    </Stage>
  );
};

// ---------- source label ----------
export type SourceTagProps = { at: number; source: string; detail?: string; label?: string; out?: number };

// Source or lower third in the corner: the slat mark, a tiny wide-caps label, the source in wide caps and a serif detail, underlined by a thread of bars that weaves across.
export const SourceTag: FC<SourceTagProps> = ({ at, source, detail, label = "Source", out }) => {
  const { t } = useLoom();
  const gone = out === undefined ? 0 : ramp(t, out, 0.4);
  const k = ramp(t, at, 0.6, INOUT) * (1 - gone);
  const thread = Math.floor(ramp(t, at + 0.2, 0.9, INOUT) * 64 * (1 - gone));
  const y = H - M;
  // A woven umber tag sewn to the bottom edge keeps the label readable over busy slat art; its top edge is a comb of bars.
  const plateW = Math.max(600, source.length * 38 * 0.84 + 90, (detail?.length ?? 0) * 40 * 0.44 + 90);
  const plateTop = y - 236;
  const py = H - (H - plateTop) * ramp(t, at - 0.15, 0.5, EXPO_OUT) * (1 - gone);
  return (
    <Stage>
      <rect x={M - 36} y={py} width={plateW} height={H - py} fill={UMBER} />
      {Array.from({ length: Math.floor(plateW / 8) }, (_, i) => (
        <rect key={`f${i}`} x={M - 34 + i * 8} y={py - 6 - (i % 3 === 0 ? 8 : 0)} width={3} height={6 + (i % 3 === 0 ? 8 : 0)} fill={UMBER} />
      ))}
      <Mark x={M} y={y - 170} p={k} s={0.8} />
      <Caps lines={[label]} x={M + 80} y={y - 170} level={k * 0.7} />
      <SlatText lines={[source.toUpperCase()]} x={M} y={y - 100} size={38} font={WIDE} anchor="start" spacing="0.06em" level={ramp(t, at + 0.15, 0.6, INOUT) * (1 - gone)} />
      {Array.from({ length: thread }, (_, i) => (
        <rect key={i} x={M + i * 9} y={y - 76} width={3} height={i % 4 === 0 ? 12 : 7} fill={TAN} />
      ))}
      {detail && <SlatText lines={[detail]} x={M} y={y - 14} size={40} italic anchor="start" level={ramp(t, at + 0.35, 0.6, INOUT) * (1 - gone)} />}
    </Stage>
  );
};
