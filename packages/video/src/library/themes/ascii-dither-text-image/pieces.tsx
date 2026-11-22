// ASCII/dither pieces: the glyph picture (drawn, procedural or photo), glyph words that re-form per spoken word, steps, a stat made of digits, A-vs-B, the text-wall quote, a glyph bar chart, the mark-renderer sheet and the source label.
import type { FC } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { OUT, clamp01, ramp, useTime } from "../../core/time";
import { W, H } from "../../core/video";
import { blank, fbm, mix, place, type Field, type Pic } from "./field";
import { dim, flash, scrambleOut, settle } from "./fx";
import { GlyphCanvas, type Fx, type GlyphProps, type Mark } from "./grid";
import { Decode, Headline, Mono, type Word } from "./primitives";
import { photoField, textMask, usePhoto, type TextMaskOpts } from "./sources";
import { BLACK, GROUND, M, PHOSPHOR, RED, SERIF, type Ground } from "./theme";

// ---------- sources ----------
export type Source = { pic?: Pic; field?: Field; src?: string; scale?: number; dark?: boolean };
// One field for a w×h box from whichever source was given: a photo (staticFile), a ready field, or a unit-space picture.
export const useSource = ({ pic, field, src, scale = 1, dark }: Source, w: number, h: number): Field => {
  const photo = usePhoto(src);
  if (photo) return photoField(photo, w, h, dark);
  if (field) return field;
  return pic ? place(pic, w, h, scale) : blank;
};

// Letters drawn the engraved way: dense glyphs on the outline, a lighter textured fill inside, so a word reads as type made of type.
export const engrave = (mask: Field, edge = 14, seed = 1): Field => (x, y) => {
  const m = mask(x, y);
  if (m <= 0.02) return 0;
  const inner = Math.min(mask(x - edge, y), mask(x + edge, y), mask(x, y - edge), mask(x, y + edge));
  const fillTone = 0.34 + 0.4 * fbm(x / 70, y / 70, seed);
  return m * (fillTone + (1 - fillTone) * (1 - inner));
};

type Box = { x?: number; y?: number; w?: number; h?: number };
type Look = Pick<GlyphProps, "mark" | "cell" | "ground" | "ink" | "ramp" | "flicker" | "shimmer" | "seed" | "bold">;

// ---------- GlyphImage ----------
// The hero: any picture as a character grid that resolves radially from noise at `at`, pushes in 8 % over `hold`, and scrambles out at `out`.
export const GlyphImage: FC<Source & Box & Look & { at?: number; out?: number; hold?: number; push?: number; settleDur?: number; fx?: Fx[] }> = ({
  x = 0, y = 0, w = W, h = H, at = 0, out, hold = 5, push = 0.08, settleDur = 0.8, fx = [], pic, field: given, src, scale, dark, ...rest
}) => {
  const { t } = useTime();
  const field = useSource({ pic, field: given, src, scale, dark }, w, h);
  const s = 1 + push * clamp01((t - at) / hold);
  const effects = [settle(t, at, { cx: w / 2, cy: h / 2, dur: settleDur }), ...(out !== undefined ? [scrambleOut(t, out)] : []), ...fx];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <GlyphCanvas field={field} w={w} h={h} fx={effects} {...rest} style={{ transform: `scale(${s})` }} />
    </div>
  );
};

// ---------- GlyphWord ----------
// A word (or short phrase) made of characters that re-forms on each spoken word: the old mask scrambles and its density lerps into the new one over 12 f.
// An `accent` word flips its cells to red with a 6-frame hard scramble, then locks.
export const GlyphWord: FC<Box & Look & { words: Word[]; out?: number; morph?: number; font?: TextMaskOpts; edge?: number }> = ({
  words, x = M, y = 160, w = W - 2 * M, h = 520, out, morph = 0.3, font, edge = 14, ...look
}) => {
  const { t } = useTime();
  let k = -1;
  words.forEach((wd, i) => {
    if (t >= wd.t) k = i;
  });
  const masks = words.map((wd) => engrave(textMask(wd.w, w, h, font), edge, 3));
  const cur = k >= 0 ? masks[k]! : blank;
  const prev = k > 0 ? masks[k - 1]! : blank;
  const since = k >= 0 ? t - words[k]!.t : 0;
  const e = clamp01(since / morph);
  const field = k > 0 ? mix(prev, cur, e) : cur;
  const fx: Fx[] = [];
  if (k === 0) fx.push(settle(t, words[0]!.t, { cx: w / 2, cy: h / 2, dur: 0.6 }));
  // Only inked cells churn during a morph, so the next word stays legible through it.
  if (k > 0 && e < 1) fx.push((_x, _y, _i, _j, d) => (d > 0.05 ? { noise: 0.45 * (1 - e) } : null));
  const acc = words[k]?.accent;
  if (acc) fx.push(flash(t, words[k]!.t));
  if (out !== undefined) fx.push(scrambleOut(t, out));
  return <GlyphCanvas field={field} x={x} y={y} w={w} h={h} fx={fx} {...look} />;
};

// ---------- GlyphSteps ----------
export type Step = { label: string; t: number; pic: Pic; note?: string };
// A list where each item's thumbnail picture resolves from noise as it is named; earlier rows fade back and the live row's index turns red.
export const GlyphSteps: FC<{ steps: Step[]; x?: number; y?: number; rowH?: number; ground?: Ground; mark?: Mark }> = ({ steps, x = M + 40, y = 150, rowH = 196, ground = "paper", mark = "ascii" }) => {
  const { t } = useTime();
  const g = GROUND[ground];
  const live = steps.reduce((m, s, i) => (t >= s.t ? i : m), -1);
  return (
    <>
      {steps.map((s, i) => {
        if (t < s.t) return null;
        const faded = i < live ? 1 - 0.62 * ramp(t, steps[i + 1]!.t, 0.3) : 1;
        const top = y + i * rowH;
        return (
          <div key={i} style={{ position: "absolute", left: x, top, width: W - x - M, height: rowH - 26, opacity: faded }}>
            <Mono size={34} color={i === live ? RED : g.soft} style={{ position: "absolute", left: 0, top: 50 }}>{String(i + 1).padStart(2, "0")}</Mono>
            <div style={{ position: "absolute", left: 80, top: 0, width: 260, height: rowH - 26, borderLeft: `2px solid ${g.ink}` }}>
              <GlyphImage pic={s.pic} w={260} h={rowH - 26} at={s.t} cell={7} mark={mark} ground={ground} push={0} settleDur={0.5} scale={1.3} />
            </div>
            <div style={{ position: "absolute", left: 390, top: 18, fontFamily: SERIF, fontSize: 76, lineHeight: 1, color: g.ink }}>
              <Decode text={s.label} at={s.t + 0.1} stagger={0.02} color={g.ink} noiseColor={g.soft} seed={i} />
            </div>
            {s.note && <Mono size={30} color={g.soft} style={{ position: "absolute", left: 392, top: 108 }}><Decode text={s.note} at={s.t + 0.3} stagger={0.012} seed={i + 9} /></Mono>}
          </div>
        );
      })}
    </>
  );
};

// ---------- GlyphStat ----------
// A big number drawn out of digits: the count-up re-rasterises the figure every frame, digits churn while it climbs, and it locks red on landing.
export const GlyphStat: FC<Box & { value: number; from?: number; at: number; dur?: number; decimals?: number; prefix?: string; suffix?: string; label?: Word[]; caption?: string; ground?: Ground; mark?: Mark }> = ({
  value, from = 0, at, dur = 1.3, decimals = 0, prefix = "", suffix = "", label, caption, x = M, y = 110, w = W - 2 * M, h = 560, ground = "paper", mark = "digits",
}) => {
  const { t } = useTime();
  const g = GROUND[ground];
  const p = ramp(t, at, dur, Easing.out(Easing.exp));
  // Out-expo never quite reaches 1, so snap to the true value on landing.
  const v = t >= at + dur ? value : from + (value - from) * p;
  const str = `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  const field = engrave(textMask(str, w, h, { weight: 800, fill: 0.9 }), 16, 5);
  const landed = t >= at + dur;
  const fx: Fx[] = [settle(t, at, { cx: w / 2, cy: h / 2, dur: 0.5, spread: 0.06 })];
  if (!landed && t >= at) fx.push(() => ({ noise: 0.22 }));
  fx.push(flash(t, at + dur));
  return (
    <>
      <GlyphCanvas field={field} x={x} y={y} w={w} h={h} mark={mark} ground={ground} fx={fx} bold />
      {label && <Headline words={label} y={y + h + 30} size={72} align="center" ground={ground} />}
      {caption && (
        <div style={{ position: "absolute", left: 0, right: 0, top: y + h + 130, textAlign: "center" }}>
          <Mono color={g.soft}><Decode text={caption} at={at + dur} stagger={0.01} /></Mono>
        </div>
      )}
    </>
  );
};

// ---------- GlyphVersus ----------
export type Side = { label: string; pic: Pic; mark?: Mark; note?: string };
// Two glyph pictures side by side; at `verdict` the winner's cells flip red and the loser fades to a ghost.
export const GlyphVersus: FC<{ a: Side; b: Side; at: number; verdict?: number; winner?: "a" | "b"; ground?: Ground }> = ({ a, b, at, verdict, winner = "b", ground = "paper" }) => {
  const { t } = useTime();
  const g = GROUND[ground];
  const pw = 720;
  const ph = 500;
  const top = 120;
  const decided = verdict !== undefined && t >= verdict;
  const pane = (s: Side, i: number) => {
    const left = i === 0 ? M + 48 : W - M - 48 - pw;
    const start = at + i * 0.45;
    const win = (i === 0 ? "a" : "b") === winner;
    const fx: Fx[] = decided ? [win ? flash(t, verdict!) : dim(() => true, 1 - 0.7 * ramp(t, verdict!, 0.3))] : [];
    return (
      <div key={i}>
        <GlyphImage pic={s.pic} x={left} y={top} w={pw} h={ph} at={start} mark={s.mark} ground={ground} push={0} fx={fx} cell={s.mark === "ascii" || !s.mark ? 11 : undefined} scale={0.9} />
        <div style={{ position: "absolute", left, top: top + ph + 36, width: pw, textAlign: "center", fontFamily: SERIF, fontSize: 84, lineHeight: 1, color: decided && !win ? g.soft : g.ink }}>
          <Decode text={s.label} at={start + 0.3} color={decided && !win ? g.soft : g.ink} noiseColor={g.soft} seed={i * 7} />
        </div>
        {s.note && (
          <div style={{ position: "absolute", left, top: top + ph + 140, width: pw, textAlign: "center" }}>
            <Mono color={g.soft}><Decode text={s.note} at={start + 0.5} stagger={0.012} seed={i + 4} /></Mono>
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      {pane(a, 0)}
      {pane(b, 1)}
      <div style={{ position: "absolute", left: 0, right: 0, top: top + ph / 2 - 60, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 96, color: g.soft, opacity: ramp(t, at + 0.3, 0.3) }}>vs</div>
    </>
  );
};

// ---------- QuoteWall ----------
// The burgundy hero: a full-bleed wall made of the quote's own letters, their opacity carrying a picture, with the quote set in big serif over it.
export const QuoteWall: FC<Source & { quote: Word[]; by: string; at?: number; wall?: string; cell?: number }> = ({ quote, by, at = 0, wall, cell = 10, ...src }) => {
  const { t } = useTime();
  const field = useSource(src, W, H);
  const text = (wall ?? quote.map((q) => q.w).join(" ")).toLowerCase() + " · ";
  const lastT = quote[quote.length - 1]?.t ?? at;
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      {/* The picture itself, as faint halftone behind the wall, so the eye reads even where the letters are sparse. */}
      <GlyphCanvas field={field} mark="dots" cell={7} ground="black" ink="#7a7a7a" shimmer={0} flicker={0} fx={[settle(t, at, { cx: W / 2, cy: H * 0.4, dur: 1.0 }), () => ({ alpha: 0.55 })]} />
      <GlyphCanvas field={field} mark="wall" text={text} cell={cell} ground="black" shimmer={0} fx={[settle(t, at, { cx: W / 2, cy: H * 0.4, dur: 1.0 })]} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,10,10,0) 38%, rgba(10,10,10,0.82) 68%, rgba(10,10,10,0.95) 100%)" }} />
      <Headline words={quote} y={640} size={104} ground="black" maxWidth={1600} />
      <div style={{ position: "absolute", left: M + 4, top: 920 }}>
        <Mono size={32} color={PHOSPHOR} style={{ opacity: 0.7 }}><Decode text={by} at={lastT + 0.4} stagger={0.012} /></Mono>
      </div>
    </AbsoluteFill>
  );
};

// ---------- GlyphChart ----------
export type Bar = { label: string; value: number; accent?: boolean };
// Bars built of glyphs, dense at the root and lighter at the tip; the growing tip churns, values decode as each bar lands, one bar may turn red.
export const GlyphChart: FC<{ bars: Bar[]; at: number; max?: number; stagger?: number; unit?: string; title?: Word[]; ground?: Ground; mark?: Mark }> = ({
  bars, at, max, stagger = 0.25, unit = "", title, ground = "paper", mark = "ascii",
}) => {
  const { t } = useTime();
  const g = GROUND[ground];
  const cx = M + 60;
  const cy = 250;
  const cw = W - 2 * M - 120;
  const chH = 560;
  const top = max ?? Math.max(...bars.map((b) => b.value));
  const slot = cw / bars.length;
  const bw = Math.min(260, slot * 0.62);
  const grow = bars.map((b, i) => ramp(t, at + i * stagger, 0.9, OUT) * (b.value / top) * (chH - 40));
  const field: Field = (x, y) => {
    const i = Math.floor(x / slot);
    const hk = grow[i];
    if (hk === undefined || Math.abs(x - (i + 0.5) * slot) > bw / 2) return 0;
    const tip = chH - hk;
    if (y < tip) return 0;
    return 0.38 + 0.62 * Math.pow(clamp01((y - tip) / Math.max(120, hk)), 0.7);
  };
  const fx: Fx = (x, y) => {
    const i = Math.floor(x / slot);
    const hk = grow[i]!;
    const landed = t >= at + i * stagger + 0.9;
    if (bars[i]?.accent && landed) return { accent: true, noise: Math.max(0, 1 - (t - at - i * stagger - 0.9) / 0.2) * 0.85 };
    return !landed && Math.abs(y - (chH - hk)) < 28 ? { noise: 0.8 } : null;
  };
  return (
    <>
      {title && <Headline words={title} y={96} size={76} ground={ground} />}
      <GlyphCanvas field={field} x={cx} y={cy} w={cw} h={chH} mark={mark} ground={ground} fx={fx} />
      <div style={{ position: "absolute", left: cx, top: cy + chH, width: cw, height: 2, background: g.ink }} />
      {bars.map((b, i) => {
        const land = at + i * stagger + 0.9;
        const mid = cx + (i + 0.5) * slot;
        return (
          <div key={i}>
            <div style={{ position: "absolute", left: mid - slot / 2, width: slot, top: cy + chH - grow[i]! - 56, textAlign: "center" }}>
              {t >= land - 0.3 && <Mono size={36} color={b.accent ? RED : g.ink} style={{ fontWeight: 700 }}><Decode text={`${b.value.toLocaleString("en-US")}${unit}`} at={land - 0.3} stagger={0.04} /></Mono>}
            </div>
            <div style={{ position: "absolute", left: mid - slot / 2, width: slot, top: cy + chH + 22, textAlign: "center" }}>
              <Mono size={30} color={g.soft}>{b.label}</Mono>
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------- MarkSheet ----------
const SHEET: { mark: Mark; label: string; cell: number }[] = [
  { mark: "ascii", label: "ASCII RAMP", cell: 8 },
  { mark: "bayer", label: "BAYER 8×8", cell: 4 },
  { mark: "blue", label: "BLUE NOISE", cell: 4 },
  { mark: "dots", label: "HALFTONE", cell: 10 },
  { mark: "hatch", label: "HATCH", cell: 9 },
  { mark: "scan", label: "SCANLINES", cell: 6 },
];
// One density field handed to six mark renderers at once: the theme's thesis in a single frame. Panes develop left to right, top to bottom.
export const MarkSheet: FC<Source & { at?: number; stagger?: number; ground?: Ground; live?: number }> = ({ at = 0, stagger = 0.22, ground = "paper", live, ...src }) => {
  const { t } = useTime();
  const g = GROUND[ground];
  const pw = 540;
  const ph = 320;
  const gap = 54;
  const field = useSource({ scale: 0.95, ...src }, pw, ph);
  return (
    <>
      {SHEET.map((s, i) => {
        const left = M + (i % 3) * (pw + gap);
        const top = 120 + Math.floor(i / 3) * (ph + 110);
        const start = at + i * stagger;
        if (t < start) return null;
        const on = live === i;
        return (
          <div key={s.mark}>
            <div style={{ position: "absolute", left, top, width: pw, height: ph, border: `2px solid ${on ? RED : g.ink}` }}>
              <GlyphCanvas field={field} w={pw - 4} h={ph - 4} mark={s.mark} cell={s.cell} ground={ground} fx={[settle(t, start, { cx: pw / 2, cy: ph / 2, dur: 0.5, spread: 0.08 })]} />
            </div>
            <div style={{ position: "absolute", left, top: top + ph + 16 }}>
              <Mono size={30} color={on ? RED : g.ink}><Decode text={`${String(i + 1).padStart(2, "0")}  ${s.label}`} at={start + 0.1} stagger={0.015} /></Mono>
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------- SourceLabel ----------
// Lower third: a dithered sphere swatch that develops from noise, a red SOURCE tag, and the citation decoding in mono; scrambles out at `out`.
export const SourceLabel: FC<{ text: string; sub?: string; at: number; out?: number; ground?: Ground; x?: number; y?: number }> = ({ text, sub, at, out, ground = "paper", x = M, y = H - M - 120 }) => {
  const { t } = useTime();
  const g = GROUND[ground];
  if (t < at) return null;
  const gone = out !== undefined ? ramp(t, out + 0.2, 0.3) : 0;
  const swatch: Field = (px, py) => {
    const u = (px - 60) / 52;
    const v = (py - 60) / 52;
    const r = Math.hypot(u, v);
    return r > 1 ? 0 : clamp01(0.1 + 0.9 * (1 - Math.max(0, -0.55 * u - 0.6 * v + 0.58 * Math.sqrt(1 - r * r))));
  };
  return (
    <div style={{ position: "absolute", left: x, top: y, height: 120, opacity: 1 - gone }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 120, height: 120, border: `2px solid ${g.ink}`, background: g.bg }}>
        <GlyphCanvas field={swatch} w={116} h={116} mark="bayer" cell={4} ground={ground} fx={[settle(t, at, { cx: 58, cy: 58, dur: 0.4, spread: 0.3 }), ...(out !== undefined ? [scrambleOut(t, out, 0.4)] : [])]} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 6, whiteSpace: "nowrap" }}>
        <Mono size={28} color={g.bg} style={{ background: RED, padding: "2px 10px", fontWeight: 700 }}><Decode text="SOURCE" at={at + 0.1} stagger={0.02} /></Mono>
      </div>
      <div style={{ position: "absolute", left: 150, top: 50, whiteSpace: "nowrap" }}>
        <Mono size={36} color={g.ink}><Decode text={text} at={at + 0.2} stagger={0.012} /></Mono>
      </div>
      {sub && (
        <div style={{ position: "absolute", left: 150, top: 96, whiteSpace: "nowrap" }}>
          <Mono size={28} color={g.soft}><Decode text={sub} at={at + 0.45} stagger={0.01} /></Mono>
        </div>
      )}
    </div>
  );
};

