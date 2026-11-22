// Line icons for the glass theme (24-unit grid, round 1.8 strokes), the gradient IconTile they sit in, and the scripted pointer cursor.
import type { FC } from "react";
import { CYAN, rgba } from "./theme";

const PATHS: Record<string, string> = {
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  lock: "M6 11h12v10H6z M8.5 11V7.5a3.5 3.5 0 017 0V11 M12 15v2.5",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  cloud: "M7 18h10a4 4 0 00.6-7.95A6 6 0 006.2 9.1 4.5 4.5 0 007 18z",
  chat: "M4 5h16v11H9l-5 4z M8 9.5h8 M8 12.5h5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  layers: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17.5l9 5 9-5",
  bell: "M6 16V11a6 6 0 0112 0v5l1.5 2h-15z M10 20.5a2.2 2.2 0 004 0",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0",
  search: "M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13z M15.5 15.5L21 21",
  code: "M8 7l-5 5 5 5 M16 7l5 5-5 5 M13.5 4l-3 16",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9c-2.5-2.6-3.6-5.6-3.6-9s1.1-6.4 3.6-9z",
  cpu: "M7 7h10v10H7z M10 10h4v4h-4z M9.5 3v4 M14.5 3v4 M9.5 17v4 M14.5 17v4 M3 9.5h4 M3 14.5h4 M17 9.5h4 M17 14.5h4",
  wand: "M4 20L15 9 M13.5 7.5l3 3 M17 3v3 M15.5 4.5h3 M20 8v2.5 M18.8 9.2h2.5",
  play: "M8 5v14l11-7z",
  file: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1.2 1.2 M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1.2-1.2",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3.5 2",
  shield: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5",
  arrow: "M4 12h15 M13 6l6 6-6 6",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z",
  mic: "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z M5.5 11a6.5 6.5 0 0013 0 M12 17.5V21",
  image: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M15.5 9.5a1.5 1.5 0 100-.01",
  book: "M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4z M20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z",
  gauge: "M4 17a8 8 0 1116 0 M12 17l4-6",
  database: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
};
export type IconName = keyof typeof PATHS;
export const ICONS = Object.keys(PATHS) as IconName[];

// `p` draws the strokes on (0..1) via pathLength.
export const Icon: FC<{ name: IconName; size?: number; color?: string; stroke?: number; p?: number }> = ({ name, size = 40, color = "#FFFFFF", stroke = 1.8, p = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
    <path d={PATHS[name]} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
  </svg>
);

// An icon in a rounded square of coloured glass, lit from the top, as on the board's "icons in rounded squares".
export const IconTile: FC<{ name: IconName; size?: number; color?: string; p?: number; rotate?: number; scale?: number }> = ({ name, size = 88, color = CYAN, p = 1, rotate = 0, scale = 1 }) => (
  <div
    style={{
      width: size,
      height: size,
      flex: "none",
      borderRadius: size * 0.3,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(150deg, ${rgba(color, 0.55)} 0%, ${rgba(color, 0.18)} 60%, ${rgba(color, 0.1)} 100%)`,
      boxShadow: `inset 0 0 0 1.5px ${rgba(color, 0.6)}, inset 0 1.5px 0 rgba(255,255,255,0.55), 0 10px 30px -8px ${rgba(color, 0.55)}`,
      transform: `scale(${scale})`,
    }}
  >
    <div style={{ transform: `rotate(${rotate}deg)` }}>
      <Icon name={name} size={size * 0.5} p={p} stroke={2} />
    </div>
  </div>
);

// A white pointer with a violet outline and soft shadow; `press` 0..1 squashes it on a click.
export const Pointer: FC<{ x: number; y: number; press?: number; opacity?: number; size?: number }> = ({ x, y, press = 0, opacity = 1, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", left: x - size * 0.2, top: y - size * 0.12, opacity, overflow: "visible", transform: `scale(${1 - 0.15 * press})`, transformOrigin: "20% 12%", filter: "drop-shadow(0 6px 10px rgba(20,10,60,0.45))" }}>
    <path d="M5 3l13.5 9.2-6.1 1.2 3.6 6.9-2.6 1.4-3.6-6.9L5 19.5z" fill="#FFFFFF" stroke="#2A1F6B" strokeWidth={1.3} strokeLinejoin="round" />
  </svg>
);
