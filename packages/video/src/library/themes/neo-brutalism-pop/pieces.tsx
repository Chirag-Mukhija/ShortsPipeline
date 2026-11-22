// Neo-brutalism pieces: the keyword that flips to an accent block, the button that physically presses, the coin counter, the speech-bubble label tag, the colour-block wipe and the source lower third.
import { Fragment, type FC, type ReactNode } from "react";
import { Easing, interpolate, spring } from "remotion";
import { FPS, H, W } from "../../core/video";
import { BLUE, BODY, BORDER, GREEN, HEAD, INK, MONO, PINK, SHADOW, SHOUT, TRACK, WHITE, YELLOW, border, hardShadow } from "./theme";
import { Box, Chip, EXPO, fr, jiggle, pop, punch, useF } from "./primitives";
import { Sticker, StickerAt, type StickerShape } from "./stickers";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- HighlightWord ----------
export type HighlightProps = {
  text: string;
  hitWord: string;
  at: number;
  // Per-word times from narration.json; otherwise words snap in 0.12 s apart from `at`.
  times?: number[];
  hitAt?: number;
  color?: string;
  mode?: "block" | "outline";
  size?: number;
  y?: number;
  flank?: StickerShape;
  align?: "center" | "left";
  x?: number;
  w?: number;
};

// A headline whose words snap up on their spoken times; the hit word flips to an accent block (or accent outline type) in 4 hard frames and jiggles. "\n" breaks a line.
export const HighlightWord: FC<HighlightProps> = ({ text, hitWord, at, times, hitAt, color = PINK, mode = "block", size = 120, y = 400, flank, align = "center", x = 96, w = W - 192 }) => {
  const f = useF();
  const tokens = text.split(/(\n| )/).filter((s) => s !== " " && s !== "");
  let wi = 0;
  const words = tokens.map((tok) => (tok === "\n" ? null : { w: tok, i: wi++ }));
  const hitIdx = words.find((wd) => wd && wd.w.replace(/[^\w$%-]/g, "") === hitWord.replace(/[^\w$%-]/g, ""))?.i ?? -1;
  const tw = (i: number) => times?.[i] ?? at + i * 0.12;
  const hit = hitAt ?? (hitIdx >= 0 ? tw(hitIdx) + 0.15 : at);
  return (
    <div style={{ position: "absolute", left: x, width: w, top: y, display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", alignItems: "center", columnGap: size * 0.28, rowGap: size * 0.12, fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: TRACK, color: INK }}>
      {words.map((wd, k) => {
        if (!wd) return <div key={k} style={{ flexBasis: "100%", height: 0 }} />;
        const d = f - fr(tw(wd.i));
        if (d < 0) return <span key={k} style={{ visibility: "hidden" }}>{wd.w}</span>;
        const rise = interpolate(d, [0, 5], [0.42, 0], { ...C, easing: Easing.out(Easing.back(2)) });
        const isHit = wd.i === hitIdx;
        const hd = f - fr(hit);
        const on = isHit && hd >= 0;
        // The flip: scaleY in whole-frame steps over 4 frames, no fade.
        const flip = on ? Math.min(1, (hd + 1) / 4) : 0;
        const rot = isHit ? jiggle(f, hit + 4 / FPS, 6, 2) : 0;
        const inner =
          isHit && mode === "outline" ? (
            <span style={{ color: on ? color : INK, WebkitTextStroke: on ? `${Math.max(3, size * 0.035)}px ${INK}` : undefined, paintOrder: "stroke fill", textShadow: on ? `${size * 0.05}px ${size * 0.05}px 0 ${INK}` : undefined }}>{wd.w}</span>
          ) : (
            wd.w
          );
        return (
          <Fragment key={k}>
            {isHit && flank && <span style={{ transform: `translateY(${rise * size}px)` }}><Sticker shape={flank} size={size * 0.62} color={color} at={hit} seed={11} /></span>}
            <span style={{ position: "relative", display: "inline-block", transform: `translateY(${rise * size}px) rotate(${rot}deg)`, padding: isHit && mode === "block" ? `0 ${size * 0.12}px` : undefined }}>
              {isHit && mode === "block" && flip > 0 && (
                <span style={{ position: "absolute", left: 0, right: 0, top: "0.06em", bottom: "-0.02em", background: color, border: border(BORDER), borderRadius: 8, boxShadow: hardShadow(SHADOW), transform: `rotate(-2deg) scaleY(${flip})`, zIndex: -1 }} />
              )}
              <span style={{ position: "relative" }}>{inner}</span>
            </span>
            {isHit && flank && <span style={{ transform: `translateY(${rise * size}px)` }}><Sticker shape={flank} size={size * 0.62} color={color} at={hit + 2 / FPS} seed={12} /></span>}
          </Fragment>
        );
      })}
    </div>
  );
};

// ---------- PressButton ----------
const Arrow: FC<{ size: number; color?: string }> = ({ size, color = INK }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <path d="M10 30 L30 10 M14 10 H30 V26" fill="none" stroke={color} strokeWidth={5} strokeLinecap="square" />
  </svg>
);

// The classic arrow pointer, drawn: white fill, black outline, tip at (0, 0).
export const Cursor: FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <svg width={90} height={110} viewBox="-6 -6 90 110" style={{ position: "absolute", left: x - 6, top: y - 6, overflow: "visible", transform: `scale(${s})`, transformOrigin: "6px 6px" }}>
    <path d="M0 0 L0 72 L18 56 L30 84 L44 78 L32 51 L56 51 Z" fill={INK} stroke={INK} strokeWidth={5} strokeLinejoin="round" transform="translate(5 5)" />
    <path d="M0 0 L0 72 L18 56 L30 84 L44 78 L32 51 L56 51 Z" fill={WHITE} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
  </svg>
);

export type PressButtonProps = { label: string; pressAt: number; x: number; y: number; at?: number; color?: string; size?: number; hold?: number; cursor?: boolean; arrow?: boolean };

// A solid button with a hard shadow that physically presses (moves 8 px into its shadow) on `pressAt`, with an optional drawn cursor clicking it and a comic click burst.
export const PressButton: FC<PressButtonProps> = ({ label, pressAt, x, y, at = 0, color = BLUE, size = 56, hold = 0.25, cursor = true, arrow = true }) => {
  const f = useF();
  const a = pop(f, at, 10);
  if (a <= 0) return null;
  const d = f - fr(pressAt);
  const hf = fr(hold);
  const pressed = interpolate(d, [0, 2, 2 + hf, 6 + hf], [0, 1, 1, 0], C);
  const off = SHADOW * pressed;
  // The cursor glides in over 0.6 s and arrives 2 frames before the press.
  const glide = interpolate(f, [fr(pressAt) - 20, fr(pressAt) - 2], [0, 1], { ...C, easing: Easing.out(Easing.exp) });
  const cx = x + 40 + (1 - glide) * 360;
  const cy = y + 10 + (1 - glide) * 240;
  const burst = d >= 0 && d < 8;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${a})` }}>
        <div style={{ transform: `translate(${off}px, ${off}px)`, display: "flex", alignItems: "center", gap: size * 0.4, fontFamily: BODY, fontWeight: 800, fontSize: size, letterSpacing: "-0.01em", color: INK, background: color, border: border(BORDER), borderRadius: 10, boxShadow: hardShadow(SHADOW - off), padding: `${size * 0.42}px ${size * 0.8}px`, whiteSpace: "nowrap" }}>
          {label}
          {arrow && <Arrow size={size * 0.75} />}
        </div>
      </div>
      {burst && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {[200, 240, 280].map((deg, i) => {
            const r0 = 34 + Math.floor(d / 2) * 8;
            const rad = (deg * Math.PI) / 180;
            return <line key={i} x1={x + 40 + Math.cos(rad) * r0} y1={y + 10 + Math.sin(rad) * r0} x2={x + 40 + Math.cos(rad) * (r0 + 26)} y2={y + 10 + Math.sin(rad) * (r0 + 26)} stroke={INK} strokeWidth={8} strokeLinecap="square" />;
          })}
        </svg>
      )}
      {cursor && glide > 0 && <Cursor x={cx + off} y={cy + off} s={pressed > 0 ? 0.9 : 1} />}
    </>
  );
};

// ---------- CoinCounter ----------
export type CoinCounterProps = { from: number; to: number; at: number; dur?: number; x?: number; y?: number; prefix?: string; suffix?: string; label?: string; bg?: string; coin?: string; size?: number; coins?: boolean };

// A huge number ticking up in 2-frame steps inside a bordered tag; when it lands the frame punches 1.04 and coins pop out around it.
export const CoinCounter: FC<CoinCounterProps> = ({ from, to, at, dur = 1.6, x = 960, y = 560, prefix = "$", suffix = "", label, bg = YELLOW, coin = PINK, size = 210, coins = true }) => {
  const f = useF();
  const a = pop(f, at, 8);
  if (a <= 0) return null;
  const start = fr(at) + 6;
  const q = Math.max(0, Math.floor((f - start) / 2) * 2);
  const e = Easing.out(Easing.cubic)(Math.min(1, q / fr(dur)));
  const val = Math.round(from + (to - from) * e);
  const done = fr(at) + 6 + fr(dur);
  const text = `${prefix}${val.toLocaleString("en-US")}${suffix}`;
  const ps = punch(f, done / FPS);
  const coinAt = done / FPS;
  const ring = [
    { dx: -600, dy: -260, r: 110, rot: -24, c: coin },
    { dx: 640, dy: -250, r: 92, rot: 18, c: coin },
    { dx: -680, dy: 200, r: 88, rot: 14, c: coin },
    { dx: 600, dy: 250, r: 118, rot: -12, c: coin },
    { dx: -260, dy: -360, r: 62, rot: 30, c: coin },
    { dx: 280, dy: 360, r: 66, rot: -30, c: coin },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${ps})` }}>
      {coins && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {ring.map((c, i) => <StickerAt key={i} at={coinAt + i * 0.1} item={{ shape: "coin", x: x + c.dx, y: y + c.dy, r: c.r, rot: c.rot, color: c.c, seed: 70 + i }} />)}
        </svg>
      )}
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${a})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        {label && <Chip text={label} bg={WHITE} size={30} shadow={5} />}
        <Box bg={bg} shadow={14} radius={14} style={{ padding: `${size * 0.06}px ${size * 0.22}px ${size * 0.1}px` }}>
          <div style={{ display: "flex", fontFamily: SHOUT, fontSize: size, lineHeight: 1.05, color: INK }}>
            {[...text].map((ch, i) => (
              // Fixed-width cells so the number never wobbles while it ticks.
              <span key={i} style={{ display: "inline-block", width: /[0-9]/.test(ch) ? "0.68em" : ch === "," || ch === "." ? "0.3em" : undefined, textAlign: "center" }}>{ch}</span>
            ))}
          </div>
        </Box>
      </div>
    </div>
  );
};

// ---------- LabelTag ----------
export type LabelTagProps = { text: string; at: number; x: number; y: number; rotate?: number; bg?: string; size?: number; tail?: "left" | "right" | "bolt" | "none" };

// A rotated sticker label ("SALES!") with a speech-bubble tail or a lightning-bolt tail; pops and jiggles as it lands.
export const LabelTag: FC<LabelTagProps> = ({ text, at, x, y, rotate = -6, bg = WHITE, size = 48, tail = "left" }) => {
  const f = useF();
  const p = pop(f, at);
  if (p <= 0) return null;
  const rot = rotate + jiggle(f, at + 10 / FPS, 6, 3);
  const sides =
    tail === "left" ? "M 30 -4 L 18 54 L 74 -4" : tail === "right" ? "M -74 -4 L -18 54 L -30 -4" : tail === "bolt" ? "M -14 -4 L -30 60 L 4 52 L -16 130 L 26 34 L -6 42 L 14 -4" : "";
  const tailX = tail === "left" ? "18%" : tail === "right" ? "82%" : "50%";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${p})` }}>
      <div style={{ position: "relative", fontFamily: SHOUT, fontSize: size, lineHeight: 1, letterSpacing: "0.01em", fontStyle: "italic", textTransform: "uppercase", color: INK, background: bg, border: border(BORDER), borderRadius: 10, boxShadow: hardShadow(6), padding: `${size * 0.3}px ${size * 0.45}px`, whiteSpace: "nowrap" }}>
        {text}
        {tail !== "none" && (
          <svg width={160} height={150} viewBox="-80 0 160 150" style={{ position: "absolute", left: tailX, top: "100%", marginTop: -BORDER, transform: "translateX(-50%)", overflow: "visible" }}>
            {tail === "bolt" ? (
              <path d={sides} fill={YELLOW} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
            ) : (
              <>
                <path d={`${sides} Z`} fill={bg} />
                <path d={sides} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};

// ---------- ColorWipe ----------
// Seconds from `at` to the frame the panel fully covers the screen: swap scenes here.
export const WIPE_CUT = 13 / FPS;

export type WipeProps = { at: number; color?: string; direction?: "left" | "right" | "up" | "down"; sticker?: StickerShape; stickerColor?: string };

// A full-screen solid colour block with black edges slides across (12 f expo-in-out), holds 2 f, then slides out the far side.
export const ColorWipe: FC<WipeProps> = ({ at, color = PINK, direction = "right", sticker = "burst", stickerColor = YELLOW }) => {
  const f = useF();
  const d = f - fr(at);
  if (d < 0 || d > 27) return null;
  const pos = d <= 13 ? interpolate(d, [0, 12], [-1, 0], { ...C, easing: EXPO }) : interpolate(d, [14, 26], [0, 1], { ...C, easing: EXPO });
  const horiz = direction === "left" || direction === "right";
  const sign = direction === "right" || direction === "down" ? 1 : -1;
  const tx = horiz ? pos * sign * (W + 40) : 0;
  const ty = horiz ? 0 : pos * sign * (H + 40);
  const edge = `${10}px solid ${INK}`;
  return (
    <div style={{ position: "absolute", left: -20, top: -20, width: W + 40, height: H + 40, transform: `translate(${tx}px, ${ty}px)`, background: color, borderLeft: horiz ? edge : undefined, borderRight: horiz ? edge : undefined, borderTop: horiz ? undefined : edge, borderBottom: horiz ? undefined : edge, boxSizing: "border-box" }}>
      <svg width={W + 40} height={H + 40} style={{ position: "absolute", left: -10, top: -10 }}>
        <g transform={`translate(${(W + 40) / 2} ${(H + 40) / 2}) rotate(${d * 4})`}>
          <StickerAt at={at} item={{ shape: sticker, x: 0, y: 0, r: 150, color: stickerColor, seed: 5 }} />
        </g>
      </svg>
    </div>
  );
};

// ---------- SourceTag ----------
export type SourceTagProps = { at: number; source: string; detail?: string; label?: string; outAt?: number; color?: string };

// Lower-third source label: a white bar snaps in from the left with an accent "SOURCE" chip; on `outAt` it nudges right for 2 frames, then slides off.
export const SourceTag: FC<SourceTagProps> = ({ at, source, detail, label = "Source", outAt, color = YELLOW }) => {
  const f = useF();
  const d = f - fr(at);
  if (d < 0) return null;
  const s = spring({ frame: d, fps: FPS, config: { stiffness: 260, damping: 18 } });
  let x = (1 - s) * -720;
  if (outAt !== undefined) {
    const o = f - fr(outAt);
    if (o >= 0 && o < 2) x += 12;
    if (o >= 2) x += interpolate(o, [2, 10], [12, -1100], { ...C, easing: Easing.in(Easing.cubic) });
  }
  const chip = pop(f, at + 4 / FPS, 8);
  return (
    <div style={{ position: "absolute", left: 96, bottom: 96, transform: `translateX(${x}px)`, display: "flex", alignItems: "center" }}>
      <Box bg={WHITE} shadow={SHADOW} radius={10} style={{ padding: "34px 40px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 40, lineHeight: 1.1, color: INK, letterSpacing: "-0.01em" }}>{source}</div>
        {detail && <div style={{ fontFamily: MONO, fontSize: 28, lineHeight: 1.1, color: INK }}>{detail}</div>}
      </Box>
      <div style={{ position: "absolute", left: 28, top: -26, transform: `rotate(-4deg) scale(${chip})` }}>
        <Chip text={label} bg={color} size={28} shadow={5} />
      </div>
    </div>
  );
};

// A row of three window dots for card headers (red/yellow/green is avoided: the theme's own accents instead).
export const WinDots: FC<{ colors?: string[] }> = ({ colors = [PINK, YELLOW, GREEN] }) => (
  <div style={{ display: "flex", gap: 12 }}>
    {colors.map((c, i) => <div key={i} style={{ width: 26, height: 26, borderRadius: 13, background: c, border: border(3) }} />)}
  </div>
);

export const Row: FC<{ children: ReactNode; gap?: number }> = ({ children, gap = 20 }) => <div style={{ display: "flex", alignItems: "center", gap }}>{children}</div>;
