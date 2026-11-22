// Clay type: puffy extruded letters lit like the rest of the clay, words that drop and squash on their spoken times, and the clay label chip.
import type { CSSProperties, FC, ReactNode } from "react";
import { useTime } from "../../core/time";
import { ClayFilter, clayFill, clayFilter } from "./clay";
import { bodyTransform, drop, jelly } from "./motion";
import { INK, ROUND, deep, shade } from "./theme";

// Letters get their own lighting softness (about 1/30 of the size) so a 40 px label and a 180 px title are equally puffy.
const textSigma = (size: number) => Math.max(1, Math.round((size / 30) * 2) / 2);
export const puffyFilterId = (size: number) => `clay-txt-${Math.round(textSigma(size) * 10)}`;

// A stack of 1 px offsets down-right in a darker shade: the letters' thickness, lit together with the face.
export const extrude = (color: string, size: number) => {
  const depth = Math.max(2, Math.round(size * 0.05));
  const side = color === INK ? "#221B28" : shade(color, 0.38);
  return Array.from({ length: depth }, (_, i) => `${(i + 1) * 0.45}px ${i + 1}px 0 ${side}`).join(",");
};

export const PuffyDefs: FC<{ size: number }> = ({ size }) => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      <ClayFilter id={puffyFilterId(size)} sigma={textSigma(size)} drop />
    </defs>
  </svg>
);

export const puffyStyle = (size: number, color = INK, weight = 700): CSSProperties => ({
  fontFamily: ROUND,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.05,
  color,
  textShadow: extrude(color, size),
  filter: `url(#${puffyFilterId(size)})`,
  whiteSpace: "nowrap",
});

// Static puffy text (no motion); wrap it in a Thing or transform it yourself.
export const Puffy: FC<{ text: ReactNode; size: number; color?: string; weight?: number; style?: CSSProperties }> = ({ text, size, color = INK, weight = 700, style }) => (
  <span style={{ display: "inline-block", ...puffyStyle(size, color, weight), ...style }}>
    <PuffyDefs size={size} />
    {text}
  </span>
);

export type ClayWord = { w: string; t: number; color?: string; wobbleAt?: number };

// A line of puffy words, each falling to land exactly on its word time with a squash; centred on (x, y = baseline area).
export const PuffyWords: FC<{ words: ClayWord[]; size: number; x?: number; y: number; gap?: number; h?: number }> = ({ words, size, x = 960, y, gap = 0.26, h = 240 }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: x - 900, width: 1800, top: y - size * 0.6, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: size * gap, filter: `url(#${puffyFilterId(size)})` }}>
      <PuffyDefs size={size} />
      {words.map((wd, i) => {
        const b = drop(t, wd.t, { h, fall: 0.3, squash: 0.9 });
        const c = wd.color ?? INK;
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: ROUND, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: c, textShadow: extrude(c, size), transformOrigin: "50% 92%", transform: bodyTransform(b, wd.wobbleAt !== undefined ? jelly(t, wd.wobbleAt) : 0), opacity: b.o }}>
            {wd.w}
          </span>
        );
      })}
    </div>
  );
};

// A clay label pill: kicker, tag or button. Text is a deeper shade of the clay so it reads like it was pressed in.
export const Chip: FC<{ label: string; color: string; size?: number; textColor?: string; icon?: ReactNode; pad?: number; style?: CSSProperties }> = ({ label, color, size = 30, textColor, icon, pad, style }) => {
  const h = size * 2.1;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, height: h, padding: `0 ${pad ?? size * 0.95}px`, borderRadius: h / 2, background: clayFill(color), filter: clayFilter("m"), fontFamily: ROUND, fontWeight: 600, fontSize: size, letterSpacing: size * 0.04, color: textColor ?? deep(color), whiteSpace: "nowrap", ...style }}>
      {icon}
      {label}
    </div>
  );
};
