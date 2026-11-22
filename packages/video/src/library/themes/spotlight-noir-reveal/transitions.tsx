// Spotlight noir transitions: the camera-iris cut (blades close to a pinhole, open on the next scene) and lights-out, the lamp dying to a held black with an ember in the filament.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { ramp, useTime } from "../../core/time";
import { CONE, NIGHT, switchOff } from "./theme";
import { Bulb } from "./objects";

// Iris timing: closes over `close` s from `at`, holds the pinhole, opens over `open` s. side says which scene to show.
export const irisAt = (t: number, at: number, close = 16 / 30, hold = 4 / 30, open = 16 / 30, rMax = 1260) => {
  const c = ramp(t, at, close, Easing.in(Easing.cubic));
  const o = ramp(t, at + close + hold, open, Easing.out(Easing.cubic));
  const side: "a" | "b" = t < at + close + hold ? "a" : "b";
  const shut = side === "a" ? c : 1 - o;
  return { side, r: rMax * (1 - shut), rot: shut * 70, shut };
};

const polyPts = (cx: number, cy: number, r: number, rot: number, n: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((rot + (k * 360) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  });

// An eight-blade camera iris: the scene shows through the opening, blades fill the rest with their edges catching a little light.
export const Iris: FC<{ r: number; rot: number; shut: number; cx?: number; cy?: number; blades?: number; children: ReactNode }> = ({ r, rot, shut, cx = 960, cy = 540, blades = 8, children }) => {
  const pts = polyPts(cx, cy, Math.max(0.5, r), rot, blades);
  const clip = `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;
  const hole = `M ${pts.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>{children}</AbsoluteFill>
      {shut > 0 && (
        <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="noir-iris-metal" cx={0.5} cy={0.5} r={0.7}>
              <stop offset={0} stopColor="#15171C" />
              <stop offset={1} stopColor={NIGHT} />
            </radialGradient>
          </defs>
          <path d={`M -10 -10 H 1930 V 1090 H -10 Z ${hole}`} fill="url(#noir-iris-metal)" fillRule="evenodd" />
          {pts.map(([x, y], k) => {
            const [nx, ny] = pts[(k + 1) % blades]!;
            const dx = nx - x;
            const dy = ny - y;
            const len = Math.hypot(dx, dy) || 1;
            return <line key={k} x1={nx} y1={ny} x2={nx + (dx / len) * 2400} y2={ny + (dy / len) * 2400} stroke="#3A3E48" strokeWidth={2.5} opacity={Math.min(1, shut * 3)} />;
          })}
          {r < 60 && <circle cx={cx} cy={cy} r={26} fill={CONE} opacity={(1 - r / 60) * 0.8} style={{ filter: "blur(9px)", mixBlendMode: "screen" }} />}
        </svg>
      )}
    </AbsoluteFill>
  );
};

// Scene A closes on the iris, scene B opens out of the same pinhole.
export const IrisCut: FC<{ at: number; a: ReactNode; b: ReactNode; cx?: number; cy?: number; close?: number; open?: number }> = ({ at, a, b, cx, cy, close, open }) => {
  const { t } = useTime();
  const s = irisAt(t, at, close, 4 / 30, open);
  return (
    <Iris r={s.r} rot={s.rot} shut={s.shut} cx={cx} cy={cy}>
      {s.side === "a" ? a : b}
    </Iris>
  );
};

// The lamp stutters and dies at `at`, black holds; if `bulb` is given, its filament keeps a fading ember for `ember` s.
export const LightsOut: FC<{ at: number; children: ReactNode; bulb?: { x: number; y: number; s?: number }; ember?: number }> = ({ at, children, bulb, ember = 2.4 }) => {
  const { t } = useTime();
  const lvl = switchOff(t, at);
  const glow = t < at + 8 / 30 ? 0 : 1 - ramp(t, at + 8 / 30, ember, Easing.in(Easing.quad));
  return (
    <AbsoluteFill>
      {lvl > 0 && children}
      <AbsoluteFill style={{ backgroundColor: NIGHT, opacity: 1 - lvl }} />
      {bulb && lvl === 0 && glow > 0 && (
        <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <Bulb x={bulb.x} y={bulb.y} s={bulb.s} on={0} ember={glow} />
        </svg>
      )}
    </AbsoluteFill>
  );
};
