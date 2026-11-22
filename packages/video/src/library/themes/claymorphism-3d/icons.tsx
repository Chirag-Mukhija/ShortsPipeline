// Clay icons: chunky glyphs built from fat round shapes (so the lighting can puff them up), sat on a coloured clay tile like a toy app icon.
import type { FC, ReactNode } from "react";
import { clayFilter, Slab } from "./clay";
import { PUTTY, shade } from "./theme";

export type IconName = "chip" | "brain" | "folder" | "bolt" | "cloud" | "lock" | "chat" | "play" | "check" | "spark" | "book" | "doc";

// Each glyph is drawn in a 100-unit box with the clay colour g and a groove colour d for pressed-in detail.
const GLYPHS: Record<IconName, (g: string, d: string) => ReactNode> = {
  chip: (g, d) => (
    <>
      {[30, 50, 70].map((p) => (
        <g key={p} stroke={g} strokeWidth={8} strokeLinecap="round">
          <line x1={p} y1={8} x2={p} y2={22} />
          <line x1={p} y1={78} x2={p} y2={92} />
          <line x1={8} y1={p} x2={22} y2={p} />
          <line x1={78} y1={p} x2={92} y2={p} />
        </g>
      ))}
      <rect x={20} y={20} width={60} height={60} rx={14} fill={g} />
      <rect x={36} y={36} width={28} height={28} rx={7} fill={d} />
    </>
  ),
  brain: (g, d) => (
    <>
      {[[38, 30, 15], [24, 46, 15], [28, 66, 15], [44, 74, 13], [62, 30, 15], [76, 46, 15], [72, 66, 15], [56, 74, 13], [50, 50, 22]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={g} />
      ))}
      <path d="M50 20 Q44 34 50 46 Q56 58 50 82" stroke={d} strokeWidth={4.5} strokeLinecap="round" fill="none" />
      <path d="M30 44 Q38 42 40 52 M70 44 Q62 42 60 52 M34 64 Q40 60 44 66 M66 64 Q60 60 56 66" stroke={d} strokeWidth={4} strokeLinecap="round" fill="none" />
    </>
  ),
  folder: (g, d) => (
    <>
      <path d="M12 30 Q12 20 22 20 L40 20 Q46 20 49 26 L52 30 L78 30 Q88 30 88 40 L88 44 L12 44 Z" fill={d} />
      <rect x={10} y={36} width={80} height={48} rx={12} fill={g} />
    </>
  ),
  bolt: (g) => <path d="M58 8 L24 56 L48 56 L40 92 L76 42 L52 42 Z" fill={g} stroke={g} strokeWidth={8} strokeLinejoin="round" />,
  cloud: (g) => (
    <>
      <circle cx={36} cy={56} r={18} fill={g} />
      <circle cx={56} cy={44} r={24} fill={g} />
      <circle cx={74} cy={60} r={16} fill={g} />
      <rect x={20} y={56} width={68} height={22} rx={11} fill={g} />
    </>
  ),
  lock: (g, d) => (
    <>
      <path d="M32 46 L32 34 Q32 16 50 16 Q68 16 68 34 L68 46" stroke={g} strokeWidth={11} fill="none" strokeLinecap="round" />
      <rect x={20} y={42} width={60} height={46} rx={13} fill={g} />
      <circle cx={50} cy={60} r={6.5} fill={d} />
      <rect x={47} y={62} width={6} height={14} rx={3} fill={d} />
    </>
  ),
  chat: (g, d) => (
    <>
      <path d="M26 72 L18 90 L42 76 Z" fill={g} stroke={g} strokeWidth={6} strokeLinejoin="round" />
      <rect x={10} y={16} width={80} height={60} rx={22} fill={g} />
      {[32, 50, 68].map((x) => (
        <circle key={x} cx={x} cy={46} r={6} fill={d} />
      ))}
    </>
  ),
  play: (g) => <path d="M34 22 L78 50 L34 78 Z" fill={g} stroke={g} strokeWidth={14} strokeLinejoin="round" />,
  check: (g) => <path d="M20 52 L42 72 L80 28" stroke={g} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  spark: (g) => (
    <>
      <path d="M50 10 Q54 46 90 50 Q54 54 50 90 Q46 54 10 50 Q46 46 50 10 Z" fill={g} stroke={g} strokeWidth={5} strokeLinejoin="round" />
      <circle cx={80} cy={20} r={7} fill={g} />
    </>
  ),
  book: (g, d) => (
    <>
      <path d="M50 26 Q34 16 14 20 L14 80 Q34 76 50 86 Q66 76 86 80 L86 20 Q66 16 50 26 Z" fill={g} stroke={g} strokeWidth={4} strokeLinejoin="round" />
      <path d="M50 28 L50 82" stroke={d} strokeWidth={4} strokeLinecap="round" />
    </>
  ),
  doc: (g, d) => (
    <>
      <path d="M24 12 L60 12 L78 30 L78 82 Q78 88 72 88 L24 88 Q18 88 18 82 L18 18 Q18 12 24 12 Z" fill={g} />
      {[44, 58, 72].map((y) => (
        <rect key={y} x={30} y={y} width={y === 72 ? 24 : 36} height={6} rx={3} fill={d} />
      ))}
    </>
  ),
};

// The glyph alone in clay (no tile). size in px.
export const Glyph: FC<{ icon: IconName; size: number; color?: string; groove?: string; floor?: boolean }> = ({ icon, size, color = PUTTY, groove, floor }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", display: "block" }}>
    <g filter={clayFilter("s", floor)}>{GLYPHS[icon](color, groove ?? shade(color, 0.22))}</g>
  </svg>
);

// A glyph on a squarish clay tile in `tile` colour; the glyph is pale putty clay, its grooves take the tile's shade.
export const ClayIcon: FC<{ icon: IconName; tile: string; size?: number; floor?: boolean; glyph?: string }> = ({ icon, tile, size = 180, floor, glyph = PUTTY }) => (
  <Slab w={size} h={size} r={size * 0.3} color={tile} floor={floor}>
    <Glyph icon={icon} size={size * 0.62} color={glyph} groove={shade(tile, 0.15)} />
  </Slab>
);
