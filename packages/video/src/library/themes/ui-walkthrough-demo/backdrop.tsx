// The wallpaper every window floats on: a blurred macOS-style gradient with sweeping light ribbons, slow idle drift, and a 1–2 % parallax that opposes the camera.
import { useId, type FC } from "react";
import { AbsoluteFill } from "remotion";
import { H, W } from "../../core/video";
import { useTime } from "../../core/time";
import { WALLPAPERS, type Wallpaper } from "./theme";

export type BackdropProps = {
  wallpaper?: Wallpaper;
  // Camera state to oppose: pass the SmartZoom camera so the wallpaper drifts 2 % the other way.
  cam?: { cx: number; cy: number; s: number };
  dim?: number;
};

export const WallpaperBackdrop: FC<BackdropProps> = ({ wallpaper = "dusk", cam, dim = 0 }) => {
  const { t } = useTime();
  const w = WALLPAPERS[wallpaper];
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  const px = cam ? -(cam.cx - W / 2) * 0.02 * cam.s : 0;
  const py = cam ? -(cam.cy - H / 2) * 0.02 * cam.s : 0;
  const sc = 1.06 + (cam ? (cam.s - 1) * 0.03 : 0);
  const d = (k: number, a: number) => Math.sin(t * k + a);
  const ribbon = (y0: number, amp: number, thick: number, ph: number) => {
    const o = d(0.18, ph) * 40;
    const top = `M -200 ${y0 + o} C 400 ${y0 - amp + o}, 900 ${y0 + amp * 0.8 - o}, 1400 ${y0 - amp * 0.3} S 2000 ${y0 - amp * 0.9 + o}, 2200 ${y0 - amp * 0.4}`;
    const bot = `L 2200 ${y0 - amp * 0.4 + thick} C 1900 ${y0 - amp * 0.6 + thick + o}, 1500 ${y0 + thick * 0.9}, 1100 ${y0 + amp * 0.5 + thick - o} S 300 ${y0 - amp * 0.4 + thick}, -200 ${y0 + thick + o} Z`;
    return top + bot;
  };
  return (
    <AbsoluteFill style={{ background: w.from, overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, transform: `translate(${px}px, ${py}px) scale(${sc})` }}>
        <defs>
          <linearGradient id={`wp-base${u}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={w.from} />
            <stop offset="1" stopColor={w.to} />
          </linearGradient>
          {(["glowA", "glowB", "glowC"] as const).map((k) => (
            <radialGradient key={k} id={`wp-${k}${u}`}>
              <stop offset="0" stopColor={w[k]} stopOpacity={wallpaper === "dusk" ? 0.55 : 0.8} />
              <stop offset="1" stopColor={w[k]} stopOpacity={0} />
            </radialGradient>
          ))}
          <linearGradient id={`wp-rib${u}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={w.ribbon} stopOpacity={0} />
            <stop offset="0.45" stopColor={w.ribbon} stopOpacity={wallpaper === "dusk" ? 0.26 : 0.7} />
            <stop offset="1" stopColor={w.ribbon} stopOpacity={0.04} />
          </linearGradient>
          <filter id={`wp-blur${u}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id={`wp-soft${u}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="60" />
          </filter>
        </defs>
        <rect x={-100} y={-100} width={W + 200} height={H + 200} fill={`url(#wp-base${u})`} />
        <g filter={`url(#wp-soft${u})`}>
          <circle cx={360 + d(0.21, 0) * 60} cy={260 + d(0.17, 1) * 40} r={520} fill={`url(#wp-glowA${u})`} />
          <circle cx={1620 + d(0.15, 2) * 70} cy={820 + d(0.19, 3) * 50} r={600} fill={`url(#wp-glowB${u})`} />
          <circle cx={1180 + d(0.13, 4) * 80} cy={160 + d(0.23, 5) * 40} r={380} fill={`url(#wp-glowC${u})`} />
        </g>
        <g filter={`url(#wp-blur${u})`}>
          <path d={ribbon(700, 260, 120, 0)} fill={`url(#wp-rib${u})`} />
          <path d={ribbon(560, 320, 60, 1.7)} fill={`url(#wp-rib${u})`} opacity={0.8} />
          <path d={ribbon(880, 180, 200, 3.1)} fill={`url(#wp-rib${u})`} opacity={0.6} />
        </g>
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)", opacity: wallpaper === "dusk" ? 1 : 0.25 }} />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(8,9,20,${dim})` }} />}
    </AbsoluteFill>
  );
};

export const Dusk: FC = () => <WallpaperBackdrop wallpaper="dusk" />;
