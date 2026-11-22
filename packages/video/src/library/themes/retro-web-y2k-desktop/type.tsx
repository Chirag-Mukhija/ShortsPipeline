// Type pieces: extruded WordArt with arch and wobble, the drag-selected keyword, and the rolling visitor hit counter.
import type { CSSProperties, FC } from "react";
import { Easing, interpolate } from "remotion";
import { useTime } from "../../core/time";
import { CYAN, GREY, INK, LIME, MAGENTA, NAVY, ORANGE, PIXEL, UI, VIOLET, WHITE, WORD, YELLOW, raised, sunken } from "./theme";
import { blink, local, popS, quant } from "./motion";
import { HEART, Pix, STARMARK } from "./pixels";

// ---------- WordArt ----------
export const LOOKS = {
  rainbow: { fill: `linear-gradient(180deg, ${MAGENTA} 0%, ${ORANGE} 34%, ${YELLOW} 52%, ${LIME} 72%, ${CYAN} 100%)`, side: NAVY },
  chrome: { fill: `linear-gradient(180deg, #FFFFFF 0%, #C9D2FF 44%, ${VIOLET} 50%, #8FE9FF 70%, #FFFFFF 100%)`, side: VIOLET },
  sunset: { fill: `linear-gradient(180deg, ${YELLOW} 0%, ${ORANGE} 45%, ${MAGENTA} 100%)`, side: "#4A0D5E" },
  lime: { fill: `linear-gradient(180deg, #F2FFB8 0%, ${LIME} 50%, #00A0A0 100%)`, side: INK },
} as const;
export type WordArtLook = keyof typeof LOOKS;

export type WordArtProps = {
  text: string;
  x: number;
  y: number;
  size?: number;
  // Letters pop in one every 2 frames from here; omit to show it already landed.
  at?: number;
  look?: WordArtLook;
  shape?: "slant" | "arch" | "wave" | "flat";
  wobble?: boolean;
  depth?: number;
  style?: CSSProperties;
};

// Two stacked copies per letter: an extruded, outlined back layer and a gradient-clipped face, because text-shadow would paint over a clipped gradient.
export const WordArt: FC<WordArtProps> = ({ text, x, y, size = 160, at, look = "rainbow", shape = "slant", wobble = true, depth, style }) => {
  const { f } = useTime();
  const L = LOOKS[look];
  const letters = Array.from(text);
  const n = letters.length;
  const mid = (n - 1) / 2;
  const d = depth ?? Math.round(size * 0.07);
  const ext = Array.from({ length: d }, (_, k) => `${k + 1}px ${k + 1}px 0 ${L.side}`).concat(`${d + 4}px ${d + 4}px 0 ${INK}`).join(", ");
  const wrap: CSSProperties =
    shape === "slant" ? { transform: "perspective(1400px) rotateY(-16deg) rotateZ(-5deg) skewX(-6deg)" } : shape === "flat" ? {} : { transform: "perspective(1400px) rotateX(10deg)" };
  const tq = quant(f, 3) / 30;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", whiteSpace: "nowrap", ...style }}>
      <div style={{ display: "flex", alignItems: "flex-end", ...wrap }}>
        {letters.map((ch, i) => {
          const l = at === undefined ? 99 : local(f, at) - i * 2;
          const s = popS(l);
          const u = mid ? (i - mid) / mid : 0;
          const arch = shape === "arch" ? -(1 - u * u) * size * 0.28 : shape === "wave" ? Math.sin(i * 0.9) * size * 0.1 : 0;
          const wob = wobble && l > 6 ? Math.sin(tq * 5 + i * 0.7) * size * 0.035 : 0;
          const rot = shape === "arch" ? u * 9 : 0;
          if (ch === " ") return <span key={i} style={{ width: size * 0.32 }} />;
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", fontFamily: WORD, fontSize: size, lineHeight: 1, transform: `translateY(${arch + wob}px) rotate(${rot}deg) scale(${s})`, transformOrigin: "50% 100%", opacity: s > 0 ? 1 : 0, marginRight: -size * 0.02 }}>
              <span style={{ color: L.side, textShadow: ext, WebkitTextStroke: `${Math.max(3, size * 0.035)}px ${INK}` }}>{ch}</span>
              <span style={{ position: "absolute", left: 0, top: 0, backgroundImage: L.fill, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{ch}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- the drag-selected keyword ----------
export type SelWord = { w: string; t: number };

// A line types on word by word; on `selAt` the I-beam drags a navy selection across the key word, it blinks twice, then stays selected.
export const SelectLine: FC<{ words: SelWord[]; keyIndex: number; selAt: number; size?: number; color?: string; dragFrames?: number }> = ({ words, keyIndex, selAt, size = 110, color = INK, dragFrames = 9 }) => {
  const { f } = useTime();
  const ls = local(f, selAt);
  const p = ls < 0 ? 0 : Math.min(1, quant(ls, 3) / dragFrames);
  const after = ls - dragFrames;
  const flash = after >= 0 && after < 15 ? blink(after) : true;
  return (
    <div style={{ fontFamily: PIXEL, fontSize: size, lineHeight: 1.15, color, display: "flex", flexWrap: "wrap", columnGap: size * 0.32, rowGap: size * 0.05 }}>
      {words.map((wd, i) => {
        if (local(f, wd.t) < 0) return <span key={i} style={{ visibility: "hidden" }}>{wd.w}</span>;
        if (i !== keyIndex) return <span key={i}>{wd.w}</span>;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block" }}>
            <span style={{ position: "absolute", left: -6, top: size * 0.06, bottom: size * 0.02, width: `calc(${p * 100}% + ${p * 12}px)`, background: flash && p > 0 ? NAVY : "transparent" }} />
            <span style={{ position: "relative", color: p > 0 && flash ? WHITE : color, clipPath: "none" }}>{wd.w}</span>
            {ls >= 0 && ls < dragFrames + 24 && (
              <svg width={27} height={60} viewBox="0 0 9 20" shapeRendering="crispEdges" style={{ position: "absolute", left: `calc(${p * 100}% - 8px)`, top: size * 0.12 }}>
                <rect x={0} y={0} width={9} height={3} fill={WHITE} />
                <rect x={3} y={0} width={3} height={20} fill={WHITE} />
                <rect x={0} y={17} width={9} height={3} fill={WHITE} />
                <rect x={1} y={1} width={7} height={1} fill={INK} />
                <rect x={4} y={1} width={1} height={18} fill={INK} />
                <rect x={1} y={18} width={7} height={1} fill={INK} />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
};

// ---------- visitor hit counter ----------
// Odometer position of one digit place: it only rolls while every place below it is passing 9 → 0.
const place = (v: number, k: number) => {
  const p = Math.pow(10, k);
  const lower = v % p;
  const carry = Math.min(1, Math.max(0, lower - (p - 1)));
  return (Math.floor(v / p) + carry) % 10;
};

export type HitCounterProps = { value: number; at: number; dur?: number; digits?: number; x: number; y: number; cell?: number; label?: string; caption?: string; digitColor?: string };

export const HitCounter: FC<HitCounterProps> = ({ value, at, dur = 1.4, digits = 7, x, y, cell = 132, label = "YOU ARE VISITOR NO.", caption, digitColor = LIME }) => {
  const { f } = useTime();
  const l = local(f, at);
  const k = interpolate(quant(Math.max(0, l), 2), [0, dur * 30], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const land = l - dur * 30;
  // Out-expo never quite reaches 1, so snap to the exact value on the landing frame.
  const v = land >= 0 ? value : value * k;
  const punch = land >= 0 && land < 6 ? (land < 3 ? 1.06 : 1.02) : 1;
  const ch = cell * 1.42;
  const totalW = digits * (cell + 10) + 40;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${punch})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, fontFamily: UI, fontWeight: 700, fontSize: 40, color: YELLOW, letterSpacing: 2, textShadow: `4px 4px 0 ${MAGENTA}` }}>
        <Pix sprite={STARMARK} px={5} recolor={{ y: blink(f, 2) ? CYAN : MAGENTA }} />
        {label}
        <Pix sprite={STARMARK} px={5} recolor={{ y: blink(f, 2) ? MAGENTA : CYAN }} />
      </div>
      <div style={{ width: totalW, padding: 20, boxSizing: "border-box", background: GREY, ...raised(4), display: "flex", gap: 10 }}>
        {Array.from({ length: digits }, (_, i) => {
          const kk = digits - 1 - i;
          const pos = l < 0 ? 0 : place(v, kk);
          return (
            <div key={i} style={{ width: cell, height: ch, background: "#050505", ...sunken(3), position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", fontFamily: PIXEL, fontSize: ch * 1.05, lineHeight: `${ch}px`, color: "#16300A" }}>8</div>
              <div style={{ position: "absolute", left: 0, right: 0, top: -pos * ch }}>
                {Array.from({ length: 11 }, (_, d) => (
                  <div key={d} style={{ height: ch, display: "flex", justifyContent: "center", fontFamily: PIXEL, fontSize: ch * 1.05, lineHeight: `${ch}px`, color: digitColor, textShadow: `0 0 12px ${digitColor}88` }}>{d % 10}</div>
                ))}
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, top: ch / 2 - 2, height: 4, background: "rgba(0,0,0,0.6)" }} />
            </div>
          );
        })}
      </div>
      {caption && (
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: PIXEL, fontSize: 50, color: WHITE, opacity: land >= 8 ? 1 : 0 }}>
          {caption}
          <span style={{ visibility: blink(f, 2) ? "visible" : "hidden" }}>
            <Pix sprite={HEART} px={4} />
          </span>
        </div>
      )}
    </div>
  );
};
