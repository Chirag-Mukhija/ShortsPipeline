// Narration pieces in the pattern language: hook rays, chapter window, pattern-filled and knocked-out words, steps, halftone stat, versus, quote, bars and source tag.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { INOUT, OUT, POP, ramp, useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { PatternCanvas, roundRect, textShape, useFontReady, type Shape } from "./canvas";
import type { Rect } from "./engine";
import { GodRays, PulsingBorder } from "./fields";
import { bump, EXPO, holdCam, irisR, rampClock, tighten } from "./motion";
import type { PatternName } from "./shaders";
import { display, DISPLAY, INK, MARGIN, PAGE, PALETTES, SANS, WHITE } from "./theme";
import { Display, Label, Page, RiseLines, Window } from "./type";

export type PatternLook = { pattern: PatternName; colors: string[]; params?: (number | undefined)[]; scale?: number; speed?: number };

// Full-frame live field with the board's hold camera (scale 1 → 1.12, 0 → 6° over the hold) and optional speed ramps.
export const FieldBackdrop: FC<PatternLook & { hold?: [number, number]; ramps?: number[]; children?: ReactNode }> = ({ pattern, colors, params, scale, speed = 1, hold, ramps = [], children }) => {
  const { t } = useTime();
  const cam = hold ? holdCam(t, hold[0], hold[1]) : undefined;
  return (
    <AbsoluteFill>
      <PatternCanvas pattern={pattern} colors={colors} params={params} scale={scale} time={rampClock(t, speed, ramps.map((at) => ({ at })))} cam={cam} />
      {children}
    </AbsoluteFill>
  );
};

// Hook card: indigo god rays fanning from above the frame, a 2–3 line hook rising in, rays flaring on the stressed word.
export const HookRays: FC<{ lines: string[]; at: number; stress?: number; eyebrow?: string; colors?: string[] }> = ({ lines, at, stress, eyebrow, colors = PALETTES.indigo }) => {
  const { t } = useTime();
  const flare = stress === undefined ? 0 : bump(t, stress, 0.3, 0.1, 0.8);
  const inten = 0.7 + 0.6 * ramp(t, at - 0.2, 1.2, INOUT) + 0.5 * flare;
  return (
    <AbsoluteFill>
      <GodRays colors={colors} params={[0, -0.75, 11, inten]} time={rampClock(t, 1, stress === undefined ? [] : [{ at: stress }])} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
        {eyebrow && <div style={{ opacity: ramp(t, at - 0.3, 0.4) }}><Label color={colors[2]} size={30}>{eyebrow}</Label></div>}
        <RiseLines at={at} lines={lines.map((l) => <Display key={l} size={150} style={{ textAlign: "center" }}>{l}</Display>)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Chapter card: a rounded window of pattern irises open on the flat page; one huge word sits in it with difference blend; number and title below.
export const ChapterCard: FC<PatternLook & { at: number; num: string; word: string; title: string; page?: string; ink?: string }> = ({ at, num, word, title, page = PAGE, ink = INK, ...look }) => {
  const { t } = useTime();
  const win: Rect = { x: MARGIN, y: MARGIN, w: W - MARGIN * 2, h: 700 };
  const wordIn = ramp(t, at + 0.35, 0.7, EXPO);
  return (
    <Page color={page}>
      <Window rect={win} at={at} radius={44} {...look} time={rampClock(t, look.speed ?? 1, [{ at: at + 0.35, boost: 3 }])} scale={(look.scale ?? 1) * (1.15 - 0.15 * wordIn)}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Display size={300} blend="difference" style={{ transform: `scale(${1.25 - 0.25 * wordIn})`, opacity: wordIn }}>{word}</Display>
        </AbsoluteFill>
      </Window>
      <div style={{ position: "absolute", left: MARGIN, top: win.y + win.h + 52, display: "flex", alignItems: "center", gap: 36 }}>
        <RiseLines at={at + 0.5} lines={[<Display key="n" size={128} color={ink}>{num}</Display>]} />
        <div style={{ width: 6, height: 104, background: ink, transform: `scaleY(${ramp(t, at + 0.6, 0.4, EXPO)})` }} />
        <RiseLines at={at + 0.65} lines={[<Label key="c" color={ink} size={30} style={{ opacity: 0.6 }}>chapter {num}</Label>, <div key="t" style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: ink, marginTop: 12 }}>{title}</div>]} />
      </div>
    </Page>
  );
};

// Key word landing on a spoken word: one huge word with the live pattern inside its letterforms; at `at` it stamps down and the pattern ramps to 4×.
export const PatternWord: FC<PatternLook & { text: string; at: number; size?: number; y?: number; page?: string; caption?: string; captionAt?: number }> = ({ text, at, size = 400, y = 500, page = PAGE, caption, captionAt, ...look }) => {
  const { t } = useTime();
  const font = display(size, 900);
  const ready = useFontReady(font);
  const land = ramp(t, at, 0.4, EXPO);
  if (!ready) return <Page color={page} />;
  const s = t < at ? 0 : 1.35 - 0.35 * land;
  const shape = textShape({ text: text.toUpperCase(), x: W / 2, y, font, size, maxWidth: W - MARGIN * 2, tracking: -0.04 }, { scale: s });
  return (
    <Page color={page}>
      <PatternCanvas pattern={look.pattern} colors={look.colors} params={look.params} scale={(look.scale ?? 1) * tighten(t, [at], 1, 1.5, 0.3)} time={rampClock(t, look.speed ?? 1, [{ at }])} clip={shape} />
      {caption && (
        <div style={{ position: "absolute", left: 0, right: 0, top: y + size * 0.5 + 70, display: "flex", justifyContent: "center", opacity: ramp(t, captionAt ?? at + 0.4, 0.4) }}>
          <Label color={INK} size={34}>{caption}</Label>
        </div>
      )}
    </Page>
  );
};

// Text knocked out of a pattern: the field fills the frame and the word is a hole showing the flat page beneath.
export const KnockoutWord: FC<PatternLook & { text: string; at: number; size?: number; page?: string; label?: string }> = ({ text, at, size = 380, page = INK, label, ...look }) => {
  const { t } = useTime();
  const font = display(size, 900);
  const ready = useFontReady(font);
  const grow = ramp(t, at, 0.7, EXPO);
  // The field assembles itself cell by cell before the word cuts through (dissolve run backwards).
  const th = interpolate(t, [at - 0.9, at - 0.1], [1.02, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: INOUT });
  const cut: Shape | undefined = ready && t >= at ? textShape({ text: text.toUpperCase(), x: W / 2, y: H / 2, font, size, maxWidth: W - MARGIN * 2, tracking: -0.03 }, { scale: 0.8 + 0.2 * grow }) : undefined;
  return (
    <Page color={page}>
      <PatternCanvas pattern={look.pattern} colors={look.colors} params={look.params} scale={look.scale} speed={look.speed} threshold={th} cut={cut} />
      {label && (
        <div style={{ position: "absolute", left: MARGIN, bottom: MARGIN, opacity: ramp(t, at + 0.3, 0.4) }}>
          <Label color={WHITE} plate={INK}>{label}</Label>
        </div>
      )}
    </Page>
  );
};

export type Step = { label: string; sub?: string } & PatternLook;

// Steps: square pattern windows iris open one by one, each with a number disc and a label; the current step's pattern runs fastest.
export const StepTiles: FC<{ steps: Step[]; at: number[]; page?: string }> = ({ steps, at, page = PAGE }) => {
  const { t } = useTime();
  const n = steps.length;
  const gap = 72;
  const size = Math.min(460, (W - MARGIN * 2 - gap * (n - 1)) / n);
  const x0 = (W - (size * n + gap * (n - 1))) / 2;
  const y0 = 150;
  return (
    <Page color={page}>
      {steps.map((s, i) => {
        const a = at[i] ?? 0;
        const rect = { x: x0 + i * (size + gap), y: y0, w: size, h: size };
        const live = t >= a && (at[i + 1] === undefined || t < at[i + 1]!);
        const pop = ramp(t, a + 0.1, 0.45, POP);
        return (
          <div key={s.label}>
            <Window rect={rect} at={a} radius={size / 2 * (1 - ramp(t, a, 0.5, EXPO)) + 36} anchor="self" pattern={s.pattern} colors={s.colors} params={s.params} scale={s.scale} time={rampClock(t, s.speed ?? 1, [{ at: a, boost: 3 }])} />
            <div style={{ position: "absolute", left: rect.x - 22, top: rect.y - 22, width: 92, height: 92, borderRadius: 46, background: INK, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: 44, transform: `scale(${pop})` }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <RiseLines
              at={a + 0.25}
              style={{ position: "absolute", left: rect.x, top: rect.y + size + 44, width: size }}
              lines={[
                <div key="l" style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 68, letterSpacing: "-0.03em", textTransform: "uppercase", color: INK }}>{s.label}</div>,
                ...(s.sub ? [<div key="s" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, color: INK, opacity: live ? 0.85 : 0.55, marginTop: 10 }}>{s.sub}</div>] : []),
              ]}
            />
          </div>
        );
      })}
    </Page>
  );
};

// Big stat as a halftone field: the dots inside a disc swell to show the share as a wedge while the number counts up.
export const HalftoneStat: FC<{ value: number; suffix?: string; caption: string; at: number; dur?: number; colors?: string[]; page?: string }> = ({ value, suffix = "%", caption, at, dur = 1.4, colors = ["#0c0a10", "#ff5a1f", "#3a2f4a", "#1e1a26"], page }) => {
  const { t } = useTime();
  const p = ramp(t, at, dur, OUT);
  const disc = ramp(t, at - 0.5, 0.6, EXPO);
  const shown = Math.round(value * p);
  return (
    <Page color={page ?? colors[0]} grain>
      <PatternCanvas pattern="dots" colors={colors} params={[20, 0.3, 0, 1]} q={[-0.43, 0, 0.36 * disc, (value / 100) * p]} speed={0.6} />
      <div style={{ position: "absolute", left: 1000, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Display size={300} color={WHITE} style={{ fontVariantNumeric: "tabular-nums" }}>{shown}<span style={{ color: colors[1] }}>{suffix}</span></Display>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 44, color: WHITE, opacity: ramp(t, at + dur * 0.6, 0.5), marginTop: 30, maxWidth: 760, lineHeight: 1.2 }}>{caption}</div>
      </div>
    </Page>
  );
};

// A vs B: two fields split on a diagonal, calm on the left and loud on the right, each side named on a flat plate; VS disc on the seam.
export const VersusSplit: FC<{ a: { word: string; sub?: string } & PatternLook; b: { word: string; sub?: string } & PatternLook; at: number; aAt?: number; bAt?: number }> = ({ a, b, at, aAt = at + 0.3, bAt = at + 0.9 }) => {
  const { t } = useTime();
  const e = ramp(t, at, 0.8, EXPO);
  // The seam sweeps in from the right edge and settles slightly right of centre, tilted 8°.
  const mid = interpolate(e, [0, 1], [W + 200, W / 2]);
  const lean = 75;
  const seam = (side: "a" | "b") =>
    side === "a" ? `polygon(0 0, ${mid + lean}px 0, ${mid - lean}px ${H}px, 0 ${H}px)` : `polygon(${mid + lean}px 0, ${W}px 0, ${W}px ${H}px, ${mid - lean}px ${H}px)`;
  const plate = (s: typeof a, x: number, when: number, align: "flex-start" | "flex-end") => {
    const p = ramp(t, when, 0.5, EXPO);
    return (
      <div style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 700, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: align, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
        <div style={{ background: INK, padding: "26px 36px 22px" }}>
          <Display size={120}>{s.word}</Display>
        </div>
        {s.sub && <div style={{ background: WHITE, padding: "14px 22px", fontFamily: SANS, fontWeight: 700, fontSize: 36, color: INK }}>{s.sub}</div>}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <AbsoluteFill style={{ clipPath: seam("a") }}>
        <PatternCanvas pattern={a.pattern} colors={a.colors} params={a.params} scale={a.scale} speed={a.speed ?? 0.4} rect={{ x: 0, y: 0, w: Math.min(W, mid + lean + 4), h: H }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: seam("b") }}>
        {mid - lean < W && <PatternCanvas pattern={b.pattern} colors={b.colors} params={b.params} scale={b.scale} speed={b.speed ?? 2} rect={{ x: Math.max(0, mid - lean - 4), y: 0, w: W - Math.max(0, mid - lean - 4), h: H }} />}
      </AbsoluteFill>
      {plate(a, MARGIN, aAt, "flex-start")}
      {plate(b, W - MARGIN - 700, bAt, "flex-end")}
      <div style={{ position: "absolute", left: mid - 90, top: H / 2 - 90, width: 180, height: 180, borderRadius: 90, background: WHITE, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ramp(t, at + 0.5, 0.45, POP)})` }}>
        <Display size={76} color={INK}>vs</Display>
      </div>
    </AbsoluteFill>
  );
};

// Quote inside a pulsing glow border on black: the one place the theme allows soft glow around type.
export const QuoteBorder: FC<{ lines: string[]; by: string; at: number; colors?: string[] }> = ({ lines, by, at, colors = PALETTES.glow }) => {
  const { t } = useTime();
  const box = { x: 260, y: 260, w: 1400, h: 500 };
  const on = ramp(t, at - 0.4, 0.6, INOUT);
  return (
    <Page color={colors[0]}>
      <div style={{ opacity: on }}>
        <PulsingBorder box={box} colors={colors} pulse={bump(t, at, 0.2, 0.1, 0.6) * 0.8} />
      </div>
      <div style={{ position: "absolute", left: box.x + 110, top: box.y, height: box.h, width: box.w - 220, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 180, lineHeight: 0.6, height: 90, color: colors[2], opacity: ramp(t, at, 0.3) }}>&ldquo;</div>
        <RiseLines at={at + 0.1} lines={lines.map((l) => <div key={l} style={{ fontFamily: SANS, fontWeight: 500, fontSize: 64, lineHeight: 1.22, color: WHITE }}>{l}</div>)} />
        <div style={{ marginTop: 44, opacity: ramp(t, at + 0.3 + lines.length * 0.17, 0.4) }}>
          <Label color={colors[1]} size={30}>— {by}</Label>
        </div>
      </div>
    </Page>
  );
};

export type Bar = { label: string; value: number };

// Bar chart where every bar is a window into one stripe field; the highlighted bar switches to a second pattern.
export const PatternBars: FC<{ bars: Bar[]; at: number; title: string; unit?: string; highlight?: number; base?: PatternLook; hot?: PatternLook; page?: string }> = ({
  bars, at, title, unit = "", highlight, base = { pattern: "stripes", colors: [INK, "#4a4552"], params: [0.78, 20, 0, 0] }, hot = { pattern: "dots", colors: ["#ff4a1c", "#111014"], params: [24, 0.32, 0.12, 0] }, page = PAGE,
}) => {
  const { t } = useTime();
  const left = 300, right = W - 240, baseY = 880, maxH = 520;
  const max = Math.max(...bars.map((b) => b.value));
  const slot = (right - left) / bars.length;
  const bw = Math.min(200, slot * 0.62);
  const geo = bars.map((b, i) => {
    const g = ramp(t, at + i * 0.12, 0.8, EXPO);
    const h = (b.value / max) * maxH * g;
    return { x: left + slot * i + (slot - bw) / 2, y: baseY - h, h, g };
  });
  // Each canvas spans only its own bars' columns (frame-anchored, so the stripes still line up across bars): far fewer pixels to shade.
  const area = (pick: (i: number) => boolean) => {
    const xs = geo.filter((_, i) => pick(i)).map((g) => g.x);
    if (!xs.length) return { x: 0, y: 0, w: 2, h: 2 };
    const x = Math.min(...xs), y = baseY - maxH - 4;
    return { x, y, w: Math.max(...xs) + bw - x, h: maxH + 8 };
  };
  const shapes = (pick: (i: number) => boolean): Shape => (ctx) => {
    const r = area(pick);
    ctx.translate(-r.x, -r.y);
    geo.forEach((g, i) => { if (pick(i) && g.h > 1) roundRect(g.x, g.y, bw, g.h + 2, [18, 18, 0, 0])(ctx, W, H); });
  };
  return (
    <Page color={page}>
      {bars.length > (highlight === undefined ? 0 : 1) && <PatternCanvas pattern={base.pattern} colors={base.colors} params={base.params} speed={base.speed ?? 0.5} rect={area((i) => i !== highlight)} clip={shapes((i) => i !== highlight)} />}
      {highlight !== undefined && <PatternCanvas pattern={hot.pattern} colors={hot.colors} params={hot.params} speed={hot.speed ?? 1} rect={area((i) => i === highlight)} clip={shapes((i) => i === highlight)} />}
      {geo.map((g, i) => (
        <div key={i}>
          <div style={{ position: "absolute", left: g.x - 40, width: bw + 80, top: g.y - 84, textAlign: "center", opacity: g.g, fontFamily: DISPLAY, fontWeight: 900, fontSize: 60, color: i === highlight ? hot.colors[0] : INK }}>
            {Math.round(bars[i]!.value * g.g)}{unit}
          </div>
          <div style={{ position: "absolute", left: g.x - 40, width: bw + 80, top: baseY + 24, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 36, color: INK }}>{bars[i]!.label}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: left - 40, top: baseY, width: right - left + 80, height: 6, background: INK, transformOrigin: "left", transform: `scaleX(${ramp(t, at - 0.3, 0.6, EXPO)})` }} />
      <div style={{ position: "absolute", left: MARGIN, top: MARGIN }}>
        <RiseLines at={at - 0.4} lines={[<Display key="t" size={84} color={INK}>{title}</Display>]} />
      </div>
    </Page>
  );
};

// Source label / lower third: a flat ink plate wipes in with a live circular pattern swatch, the source name and its address.
export const SourceTag: FC<{ name: string; detail: string; kind?: string; at: number; out?: number; look?: PatternLook }> = ({ name, detail, kind = "source", at, out, look = { pattern: "dots", colors: PALETTES.sunset, params: [9, 0.3, 0.14, 0] } }) => {
  const { t } = useTime();
  const wipe = ramp(t, at, 0.5, EXPO) * (out === undefined ? 1 : 1 - ramp(t, out, 0.4, INOUT));
  const sw = { x: MARGIN + 22, y: H - MARGIN - 138 + 22, w: 108, h: 108 };
  return (
    <div style={{ position: "absolute", left: MARGIN, top: H - MARGIN - 152, height: 152, clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`, background: INK, borderRadius: 26, display: "flex", alignItems: "center", paddingLeft: 152, paddingRight: 52 }}>
      <div style={{ position: "absolute", left: 22, top: 22, width: 108, height: 108, borderRadius: 54, overflow: "hidden", clipPath: `circle(${irisR(t, at + 0.15, 0.6, 0.06)}px at 50% 50%)` }}>
        <PatternCanvas rect={sw} anchor="self" pattern={look.pattern} colors={look.colors} params={look.params} speed={look.speed} res={1} style={{ left: 0, top: 0 }} />
      </div>
      <div>
        <Label color={look.colors[2] ?? WHITE} size={28}>{kind}</Label>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 46, color: WHITE, marginTop: 10, whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: WHITE, opacity: 0.6, marginTop: 6, whiteSpace: "nowrap" }}>{detail}</div>
      </div>
    </div>
  );
};
