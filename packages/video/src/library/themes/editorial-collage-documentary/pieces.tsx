// Collage pieces timed to the narration: ransom-note headlines, the claim with a highlighter, clipping lists, the stamped number and date, versus, pull quote, lower third and ticker.
import { useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { COND, INK, MUTED, PLATE, RED, SERIF, SHEET, TYPE, YELLOW, hardShadow } from "./theme";
import { SETTLE, q12, stepIn, swipeOut, tornClip, noise1 } from "./rough";
import { Cutout, Slip, TypeLine, type CutoutProps } from "./paper";
import { Hi, Marked } from "./marks";
import type { Subject, Treatment } from "./plates";

// ---------- ransom-note words ----------
export type RansomLook = "ink" | "sheet" | "red" | "yellow" | "plate" | "news";
export type RansomFont = "serif" | "italic" | "cond" | "type";
export type RansomWord = { w: string; at: number; look?: RansomLook; font?: RansomFont; size?: number; rot?: number };

const LOOKS: Record<RansomLook, { bg: string; fg: string }> = {
  ink: { bg: INK, fg: SHEET },
  sheet: { bg: SHEET, fg: INK },
  red: { bg: RED, fg: SHEET },
  yellow: { bg: YELLOW, fg: INK },
  plate: { bg: PLATE, fg: SHEET },
  // Newsprint: a cheap halftone tint behind ink type.
  news: { bg: `radial-gradient(rgba(21,21,21,0.16) 30%, transparent 34%) 0 0 / 7px 7px, #e7e1d2`, fg: INK },
};
const FONTS: Record<RansomFont, CSSProperties> = {
  serif: { fontFamily: SERIF, fontWeight: 900 },
  italic: { fontFamily: SERIF, fontWeight: 700, fontStyle: "italic" },
  cond: { fontFamily: COND, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.01em" },
  type: { fontFamily: TYPE, fontWeight: 400 },
};
// Oswald runs tall and Special Elite small; scale each so mixed words read as one line.
const FONT_K: Record<RansomFont, number> = { serif: 1, italic: 1.02, cond: 0.92, type: 0.9 };

// One word cut out of a different magazine: its own paper, face and tilt. Pops in from 0 % on the 12 fps clock.
export const RansomWordSlip: FC<{ word: RansomWord; size: number; seed: number }> = ({ word, size, seed }) => {
  const { t } = useTime();
  const e = stepIn(t, word.at, 0.3, SETTLE);
  const look = LOOKS[word.look ?? "sheet"];
  const font = word.font ?? "serif";
  const n = noise1(seed);
  const rot = word.rot ?? n(1.7) * 3.2;
  return (
    <div style={{ display: "inline-block", transform: `rotate(${rot + (1 - clamp01(e)) * 10}deg) scale(${e})`, margin: `0 ${size * 0.05}px`, filter: hardShadow(0.8), opacity: e > 0 ? 1 : 0 }}>
      <div
        style={{
          background: look.bg,
          color: look.fg,
          clipPath: tornClip(seed, { left: 5, right: 5, top: 2, bottom: 2 }),
          padding: `${size * 0.04}px ${size * 0.16}px ${size * 0.08}px`,
          fontSize: size * (word.size ?? 1) * FONT_K[font],
          lineHeight: 1.08,
          transform: `translateY(${n(4.2) * 6}px)`,
          ...FONTS[font],
        }}
      >
        {word.w}
      </div>
    </div>
  );
};

// A ransom-note headline: lines of mismatched cut-out words, each landing on its spoken time.
export const RansomHeadline: FC<{ lines: RansomWord[][]; size?: number; seed?: number; style?: CSSProperties }> = ({ lines, size = 120, seed = 40, style }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.1, ...style }}>
    {lines.map((line, li) => (
      <div key={li} style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
        {line.map((w, wi) => <RansomWordSlip key={wi} word={w} size={size} seed={seed + li * 13 + wi * 7} />)}
      </div>
    ))}
  </div>
);

// ---------- title card ----------
export type CollageTitleProps = { lines: RansomWord[][]; kicker?: { text: string; at: number }; cutouts?: CutoutProps[]; size?: number; push?: [number, number]; y?: number };

// The hook card: a cluster of cutouts assembles (4 f stagger) around a ransom-note headline while the camera pushes 5 %;
// the headline layer moves 1.3× the cutouts so the collage has depth.
export const CollageTitle: FC<CollageTitleProps> = ({ lines, kicker, cutouts = [], size = 124, push = [0, 6], y = 540 }) => {
  const { t } = useTime();
  const p = clamp01((t - push[0]) / (push[1] - push[0]));
  const back = 1 + 0.05 * Easing.inOut(Easing.sin)(p);
  const front = 1 + 0.065 * Easing.inOut(Easing.sin)(p);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${back})` }}>
        {cutouts.map((c, i) => <Cutout key={i} {...c} />)}
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${front})`, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: y, left: 0, right: 0, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          {kicker && (
            <Slip seed={77} bg={SHEET} rot={-1.5} edges={{ left: 6, right: 6 }} style={{ padding: "8px 24px" }}>
              <TypeLine text={kicker.text} at={kicker.at} size={36} />
            </Slip>
          )}
          <RansomHeadline lines={lines} size={size} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- the claim ----------
export type ClaimWord = { w: string; t: number; mark?: "hi" | "underline" | "circle"; red?: boolean };

// A Playfair claim landing word by word on the narration; marked words get the highlighter or a red marker on their beat.
export const Claim: FC<{ lines: ClaimWord[][]; size?: number; kicker?: string; kickerAt?: number; align?: "left" | "center"; style?: CSSProperties }> = ({ lines, size = 112, kicker, kickerAt = 0, align = "left", style }) => {
  const { t } = useTime();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "left" ? "flex-start" : "center", gap: size * 0.06, ...style }}>
      {kicker && (
        <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 34, letterSpacing: "0.14em", color: RED, textTransform: "uppercase", marginBottom: 10, opacity: stepIn(t, kickerAt, 0.1) > 0 ? 1 : 0 }}>
          <span style={{ display: "inline-block", width: 44, height: 6, background: RED, verticalAlign: "middle", marginRight: 16 }} />
          {kicker}
        </div>
      )}
      {lines.map((line, li) => (
        <div key={li} style={{ fontFamily: SERIF, fontWeight: 900, fontSize: size, lineHeight: 1.12, color: INK, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
          {line.map((wd, wi) => {
            const e = stepIn(t, wd.t - 0.1, 0.25);
            const inner = wd.mark === "hi" ? <Hi at={wd.t + 0.05}>{wd.w}</Hi> : wd.mark ? <Marked at={wd.t + 0.05} kind={wd.mark}>{wd.w}</Marked> : wd.w;
            return (
              <span key={wi} style={{ display: "inline-block", marginRight: size * 0.24, opacity: e > 0 ? 1 : 0, transform: `translateY(${(1 - e) * -14}px)`, color: wd.red ? RED : INK }}>
                {inner}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------- list / steps ----------
export type ClipItem = { text: string; at: number; n?: string; note?: string };

// Steps as strips torn from different pages, slid in from the left on the 12 fps clock. `focus` (seconds per item)
// highlights one row and dims the others to 50 %.
export const ClippingList: FC<{ items: ClipItem[]; x?: number; y?: number; gap?: number; focus?: number[] }> = ({ items, x = 240, y = 300, gap = 150, focus }) => {
  const { t } = useTime();
  const fi = focus ? focus.reduce((cur, ft, i) => (t >= ft ? i : cur), -1) : -1;
  return (
    <>
      {items.map((it, i) => {
        const e = stepIn(t, it.at, 0.33);
        if (e <= 0) return null;
        const rot = i % 2 ? 1.1 : -1.3;
        const dim = fi >= 0 && fi !== i ? 0.5 : 1;
        return (
          <div key={i} style={{ position: "absolute", left: x + (i % 2) * 36, top: y + i * gap, transform: `translateX(${(1 - e) * -900}px)`, opacity: dim }}>
            <Slip seed={90 + i * 11} rot={rot} edges={{ left: 3, right: 10, top: 1.5, bottom: 1.5 }} style={{ padding: "14px 40px 16px 28px", display: "flex", alignItems: "baseline", gap: 26 }}>
              <span style={{ fontFamily: COND, fontWeight: 700, fontSize: 74, color: RED, lineHeight: 1 }}>{it.n ?? String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 68, color: INK, lineHeight: 1.1 }}>{focus && focus[i] !== undefined ? <Hi at={focus[i]!}>{it.text}</Hi> : it.text}</span>
              {it.note && <span style={{ fontFamily: TYPE, fontSize: 32, color: MUTED }}>{it.note}</span>}
            </Slip>
          </div>
        );
      })}
    </>
  );
};

// ---------- stamped number ----------
// A number printed on a torn newsprint clipping, hit in at `at` (1.15 → 1 in 6 f), circled in red marker, labelled on a typed strip.
export const BigNumber: FC<{ value: string; at: number; label: string; kicker?: string; x?: number; y?: number; size?: number; circleAt?: number; labelAt?: number }> = ({ value, at, label, kicker, x = 960, y = 470, size = 290, circleAt, labelAt }) => {
  const { t } = useTime();
  const clip = stepIn(t, at - 0.4, 0.33);
  const hit = ramp(t, at, 6 / 30, Easing.out(Easing.quad));
  if (clip <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - clip) * -100}px) rotate(-1.5deg)` }}>
      <div style={{ filter: hardShadow() }}>
        <div style={{ background: `repeating-linear-gradient(90deg, transparent 0 340px, rgba(21,21,21,0.1) 340px 342px), ${SHEET}`, clipPath: tornClip(311, { top: 9, right: 3, bottom: 11, left: 3 }), padding: "44px 120px 76px" }}>
          {kicker && (
            <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 32, letterSpacing: "0.16em", color: INK, marginBottom: 70, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 40, height: 6, background: RED }} />
              {kicker}
            </div>
          )}
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: size, lineHeight: 1, color: INK, textAlign: "center", fontVariantNumeric: "lining-nums", opacity: t >= at ? 1 : 0, transform: `scale(${1.15 - 0.15 * hit})` }}>
            <Marked at={circleAt ?? at + 0.3} kind="circle" w={10}>
              <span style={{ padding: "0 0.08em" }}>{value}</span>
            </Marked>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: "50%", bottom: -46, transform: "translateX(-50%) rotate(2deg)", opacity: t >= (labelAt ?? at + 0.6) ? 1 : 0 }}>
        <Slip seed={321} bg={YELLOW} edges={{ left: 8, right: 8 }} style={{ padding: "10px 30px", whiteSpace: "nowrap" }}>
          <TypeLine text={label} at={labelAt ?? at + 0.6} size={42} cursor={false} />
        </Slip>
      </div>
    </div>
  );
};

// ---------- rubber stamp ----------
// Rubber-stamp ink: worn by noise, then bleeding outward after the hit. `bleed` 0..1.
export const StampInk: FC<{ id: string; seed: number; bleed: number }> = ({ id, seed, bleed }) => (
  <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed={seed} result="n" />
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 2.55" result="holes" />
    <feMorphology in="SourceGraphic" operator="dilate" radius={bleed * 1.6} result="fat" />
    <feGaussianBlur in="fat" stdDeviation={0.5 + bleed * 0.9} result="soft" />
    <feComposite in="soft" in2="holes" operator="in" />
  </filter>
);

// The stamp slam: 1.15 → 1 in 6 f, a faint second strike offset 3 px, ink bleeds for 12 f afterwards.
export const RubberStamp: FC<{ at: number; w: number; h: number; rot?: number; color?: string; seed?: number; children: ReactNode }> = ({ at, w, h, rot = -6, color = RED, seed = 5, children }) => {
  const { t } = useTime();
  const id = `stamp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (t < at) return null;
  const hit = ramp(t, at, 6 / 30, Easing.out(Easing.quad));
  const bleed = ramp(t, at + 0.15, 0.4);
  const body = (
    <>
      <rect x={10} y={10} width={w - 20} height={h - 20} rx={14} fill="none" stroke={color} strokeWidth={11} />
      <rect x={30} y={30} width={w - 60} height={h - 60} rx={6} fill="none" stroke={color} strokeWidth={4} />
      {children}
    </>
  );
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", transform: `rotate(${rot}deg) scale(${1.15 - 0.15 * hit})`, mixBlendMode: "multiply" }}>
      <defs>
        <StampInk id={id} seed={seed} bleed={bleed} />
      </defs>
      <g filter={`url(#${id})`} opacity={0.9}>{body}</g>
      <g filter={`url(#${id})`} opacity={0.18} transform="translate(4 3)">{body}</g>
    </svg>
  );
};

// A big typewriter date stamped on the page, with a typed dateline above it and a caption typed after the hit.
export const DateStamp: FC<{ date: string; at: number; line?: string; caption?: string; captionAt?: number; x?: number; y?: number; rot?: number }> = ({ date, at, line = "DATELINE", caption, captionAt, x = 960, y = 470, rot = -5 }) => {
  const { t } = useTime();
  const w = Math.max(760, date.length * 100 + 160);
  const h = 380;
  // The table thumps: 2 px for 3 frames on the hit.
  const thump = t >= at && t < at + 0.1 ? 2 : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateY(${thump}px)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <RubberStamp at={at} w={w} h={h} rot={rot} seed={9}>
        <text x={w / 2} y={96} textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={42} letterSpacing={12} fill={RED}>{line}</text>
        <text x={w / 2} y={296} textAnchor="middle" fontFamily={TYPE} fontSize={170} fill={RED}>{date}</text>
      </RubberStamp>
      {caption && (
        <div style={{ marginTop: 50, minHeight: 60 }}>
          <TypeLine text={caption} at={captionAt ?? at + 0.6} size={48} />
        </div>
      )}
    </div>
  );
};

// ---------- versus ----------
export type Side = { label: string; sub?: string; subject?: Subject; src?: string; treatment?: Treatment; at: number };

// Two cutouts face off across the page; labels on torn plates, a yellow "vs." slip slammed between them, the winner circled.
export const Versus: FC<{ left: Side; right: Side; vsAt: number; winner?: "left" | "right"; winAt?: number }> = ({ left, right, vsAt, winner, winAt }) => {
  const { t } = useTime();
  const sides = [
    { s: left, x: 500, rot: -2.5, seed: 61, plate: INK, from: "left" as const },
    { s: right, x: 1420, rot: 2, seed: 67, plate: RED, from: "right" as const },
  ];
  return (
    <>
      {sides.map(({ s, x, rot, seed, plate, from }, i) => (
        <div key={i}>
          <Cutout x={x} y={430} w={660} h={480} rot={rot} seed={seed} at={s.at} from={from} subject={s.subject} src={s.src} treatment={s.treatment ?? (i ? "red" : "plate")} tape="corners" />
          <div style={{ position: "absolute", left: x, top: 720, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: stepIn(t, s.at + 0.25, 0.1) > 0 ? 1 : 0 }}>
            <Slip seed={seed + 1} bg={plate} color={SHEET} rot={-rot * 0.6} style={{ fontFamily: COND, fontWeight: 700, fontSize: 64, textTransform: "uppercase", letterSpacing: "0.03em", padding: "4px 34px 8px" }}>
              {winner && (winner === "left") === (i === 0) && winAt !== undefined ? <Marked at={winAt} kind="underline" color={YELLOW} w={9}>{s.label}</Marked> : s.label}
            </Slip>
            {s.sub && <div style={{ fontFamily: TYPE, fontSize: 38, color: INK, marginTop: 10 }}>{s.sub}</div>}
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 960, top: 520, transform: "translate(-50%, -50%)" }}>
        <RansomWordSlip word={{ w: "vs.", at: vsAt, look: "yellow", font: "italic", rot: -6 }} size={150} seed={404} />
      </div>
    </>
  );
};

// ---------- pull quote ----------
// A quote torn from an interview: halftone portrait on the left, the words on a clipping with a giant red mark,
// a highlighter on the line that matters, attribution typed underneath.
export const PullQuote: FC<{ quote: ReactNode; by: string; at: number; byAt?: number; subject?: Subject; src?: string }> = ({ quote, by, at, byAt, subject = "portrait", src }) => {
  const { t } = useTime();
  const e = stepIn(t, at + 0.15, 0.36);
  return (
    <>
      <Cutout x={430} y={500} w={540} h={660} rot={-2.5} seed={141} at={at} subject={subject} src={src} treatment="news" tape="top" edges={{ top: 2, right: 10, bottom: 2, left: 2 }} focus={[0.5, 0.4]} />
      {e > 0 && (
        <div style={{ position: "absolute", left: 720, top: 210, width: 1080, transform: `translateY(${(1 - e) * -90}px) rotate(1deg)`, filter: hardShadow() }}>
          <div style={{ background: SHEET, clipPath: tornClip(151, { left: 10, right: 3, top: 3, bottom: 8 }), padding: "120px 80px 70px 110px" }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontStyle: "italic", fontSize: 62, lineHeight: 1.3, color: INK }}>{quote}</div>
            <div style={{ marginTop: 36, minHeight: 48 }}>
              <TypeLine text={`— ${by}`} at={byAt ?? at + 1} size={40} color={INK} cursor={false} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 50, top: -60, fontFamily: SERIF, fontWeight: 900, fontSize: 300, lineHeight: 1, color: RED }}>“</div>
        </div>
      )}
    </>
  );
};

// ---------- lower third ----------
// Stacked plates revealed by a jagged mask in 2–3 frame steps; text follows 4 f later; swipes off in 8 f at `out`.
export const LowerThird: FC<{ name: string; role: string; at: number; out?: number; x?: number; y?: number }> = ({ name, role, at, out, x = 96, y = 820 }) => {
  const { t } = useTime();
  const plate = (start: number, seed: number) => {
    const s = Math.floor(clamp01((t - start) / (8 / 30)) * 3 + 1e-6);
    const pct = [0, 0.38, 0.72, 1][Math.min(3, s)]! * 100;
    const r = noise1(seed);
    const jag = Array.from({ length: 9 }, (_, i) => `calc(${pct}% + ${(r(i * 1.3) * 14 - (pct < 100 ? 0 : 14)).toFixed(1)}px) ${(i / 8) * 100}%`).join(",");
    return `polygon(0 0, ${jag}, 0 100%)`;
  };
  const textOn = (start: number) => (t >= start + 4 / 30 ? 1 : 0);
  const gone = out === undefined ? 0 : swipeOut(t, out);
  if (t < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateX(${-gone * 1500}px)`, filter: hardShadow(0.8) }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ width: 22, background: RED, clipPath: plate(at - 2 / 30, 7) }} />
        <div style={{ background: INK, clipPath: plate(at, 3), padding: "8px 40px 12px 30px" }}>
          <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 64, lineHeight: 1.1, letterSpacing: "0.02em", color: SHEET, textTransform: "uppercase", opacity: textOn(at), transform: `translateX(${q12(t) < at + 0.25 ? -12 : 0}px)` }}>{name}</div>
        </div>
      </div>
      <div style={{ display: "inline-block", marginLeft: 22, background: YELLOW, clipPath: plate(at + 3 / 30, 5), padding: "8px 30px 10px" }}>
        <div style={{ fontFamily: TYPE, fontSize: 38, color: INK, opacity: textOn(at + 3 / 30) }}>{role}</div>
      </div>
    </div>
  );
};

// ---------- ticker ----------
export type TickerItem = { value: string; label: string };

// A torn ink band along the bottom with a red label block; items scroll on a frame-driven translateX.
export const Ticker: FC<{ items: TickerItem[]; at: number; title?: string; speed?: number; y?: number; repeats?: number }> = ({ items, at, title = "BY THE NUMBERS", speed = 170, y = 860, repeats = 6 }) => {
  const { t } = useTime();
  const e = stepIn(t, at, 0.3);
  if (e <= 0) return null;
  const run = Array.from({ length: repeats }, () => items).flat();
  return (
    <div style={{ position: "absolute", left: -20, right: -20, top: y, height: 112, transform: `translateY(${(1 - e) * 260}px) rotate(-0.6deg)`, filter: hardShadow(0.8) }}>
      <div style={{ position: "absolute", inset: 0, background: INK, clipPath: tornClip(501, { top: 7, bottom: 2, left: 0, right: 0 }, { w: 1960, h: 112 }) }} />
      <div style={{ position: "absolute", left: 116, right: 0, top: 0, bottom: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 22, left: 380, whiteSpace: "nowrap", transform: `translateX(${-Math.max(0, t - at) * speed}px)`, fontFamily: COND, fontSize: 52, lineHeight: 1.2 }}>
          {run.map((it, i) => (
            <span key={i} style={{ marginRight: 46 }}>
              <span style={{ color: YELLOW, fontWeight: 700 }}>{it.value}</span>
              <span style={{ color: SHEET, fontWeight: 500, marginLeft: 16, textTransform: "uppercase", letterSpacing: "0.03em" }}>{it.label}</span>
              <span style={{ color: RED, marginLeft: 46 }}>■</span>
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 116, top: -14, bottom: 6, display: "flex", alignItems: "center", background: RED, clipPath: tornClip(503, { right: 8 }), padding: "0 34px", fontFamily: COND, fontWeight: 700, fontSize: 44, letterSpacing: "0.08em", color: SHEET, transform: "rotate(-1deg)" }}>
        {title}
      </div>
    </div>
  );
};
