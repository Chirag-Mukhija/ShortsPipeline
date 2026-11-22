// Poster typography and page primitives: the flat page with seeded grain, corner labels, display words, masked line rises and the rounded pattern window.
import { useMemo, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ramp, useTime } from "../../core/time";
import type { Rect } from "./engine";
import { PatternCanvas, type PatternProps } from "./canvas";
import { DISPLAY, INK, PAGE, SANS, WHITE } from "./theme";
import { EXPO, grainShift, irisR } from "./motion";

// A 256 px grain tile made once per page from a seeded LCG; only its offset changes per frame.
let grainUrl: string | null = null;
const grainTile = () => {
  if (grainUrl || typeof document === "undefined") return grainUrl;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  if (!g) return null;
  const img = g.createImageData(256, 256);
  let s = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = (s >> 16) & 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainUrl = c.toDataURL("image/png");
  return grainUrl;
};

// The board's optional 4 % film grain that unifies flat patterns and type.
export const Grain: FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const f = useCurrentFrame();
  const url = useMemo(grainTile, []);
  if (!url) return null;
  const [x, y] = grainShift(f);
  return <AbsoluteFill style={{ backgroundImage: `url(${url})`, backgroundPosition: `${x}px ${y}px`, opacity, mixBlendMode: "overlay", pointerEvents: "none" }} />;
};

export const Page: FC<{ color?: string; grain?: boolean; children?: ReactNode }> = ({ color = PAGE, grain = true, children }) => (
  <AbsoluteFill style={{ backgroundColor: color }}>
    {children}
    {grain && <Grain />}
  </AbsoluteFill>
);

// Small uppercase label, optionally on a flat plate: corner tags, eyebrows, sources.
export const Label: FC<{ children: ReactNode; color?: string; plate?: string; size?: number; style?: CSSProperties }> = ({ children, color = INK, plate, size = 28, style }) => (
  <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: size, letterSpacing: "0.14em", textTransform: "uppercase", color, lineHeight: 1, ...(plate ? { background: plate, padding: `${size * 0.4}px ${size * 0.6}px` } : {}), whiteSpace: "nowrap", ...style }}>
    {children}
  </div>
);

export const Display: FC<{ children: ReactNode; size: number; color?: string; weight?: number; blend?: CSSProperties["mixBlendMode"]; style?: CSSProperties }> = ({ children, size, color = WHITE, weight = 900, blend, style }) => (
  <div style={{ fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: 0.9, letterSpacing: "-0.035em", textTransform: "uppercase", color, mixBlendMode: blend, whiteSpace: "nowrap", ...style }}>
    {children}
  </div>
);

// Masked line rise (each line slides up out of its own floor), 18 f expo-out, 5 f stagger.
export const RiseLines: FC<{ lines: ReactNode[]; at: number; stagger?: number; style?: CSSProperties; lineStyle?: CSSProperties }> = ({ lines, at, stagger = 5 / 30, style, lineStyle }) => {
  const { t } = useTime();
  return (
    <div style={style}>
      {lines.map((l, i) => {
        const p = ramp(t, at + i * stagger, 0.6, EXPO);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
            <div style={{ transform: `translateY(${(1 - p) * 110}%)`, ...lineStyle }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
};

// A rounded window of live pattern on the flat page; `at` opens it with the board's iris (20 f expo-out from its centre).
export const Window: FC<Omit<PatternProps, "rect"> & { rect: Rect; radius?: number; at?: number; children?: ReactNode }> = ({ rect, radius = 40, at, children, style, ...pattern }) => {
  const { t } = useTime();
  const r = at === undefined ? 9999 : irisR(t, at, 20 / 30, (1.5 * Math.hypot(rect.w, rect.h)) / 2 / Math.hypot(960, 540));
  if (r <= 0) return null;
  return (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: radius, overflow: "hidden", clipPath: at === undefined ? undefined : `circle(${r}px at 50% 50%)` }}>
      <PatternCanvas rect={rect} {...pattern} style={{ left: 0, top: 0, ...style }} />
      {children}
    </div>
  );
};
