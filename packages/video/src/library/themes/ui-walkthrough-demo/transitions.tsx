// Transitions between screens: the window push (old slides off, next pushes in, wallpaper counter-drifts), the 5 f crossfade with a slight zoom, and the jump-cut punch 1.0 → 1.05.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { WallpaperBackdrop } from "./backdrop";
import type { Wallpaper } from "./theme";

export type ScreenPushProps = { a: ReactNode; b: ReactNode; at: number; dur?: number; dir?: 1 | -1; wallpaper?: Wallpaper };

// Push: both windows travel one screen width in in-out cubic with a little motion blur at the peak, overlapping the whole way so no frame is empty.
export const ScreenPush: FC<ScreenPushProps> = ({ a, b, at, dur = 0.6, dir = 1, wallpaper }) => {
  const { t } = useTime();
  const e = ramp(t, at, dur, Easing.inOut(Easing.cubic));
  const blur = Math.sin(Math.PI * e) * 5;
  const span = 1700 * dir;
  return (
    <AbsoluteFill>
      <WallpaperBackdrop wallpaper={wallpaper} cam={{ cx: 960 + e * 1500 * dir, cy: 540, s: 1 }} />
      {e < 1 && <AbsoluteFill style={{ transform: `translateX(${-span * e}px) scale(${1 - 0.04 * Math.sin(Math.PI * e)})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{a}</AbsoluteFill>}
      {e > 0 && <AbsoluteFill style={{ transform: `translateX(${span * (1 - e)}px) scale(${1 - 0.04 * Math.sin(Math.PI * e)})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{b}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

// Crossfade between two recordings: 5 f overlap, the incoming one settling from 1.02.
export const Crossfade: FC<{ a: ReactNode; b: ReactNode; at: number }> = ({ a, b, at }) => {
  const { t } = useTime();
  const e = ramp(t, at, 5 / 30, Easing.linear);
  const z = ramp(t, at, 0.5);
  return (
    <AbsoluteFill>
      {e < 1 && <AbsoluteFill style={{ opacity: 1 - e }}>{a}</AbsoluteFill>}
      {e > 0 && <AbsoluteFill style={{ opacity: e, transform: `scale(${1.02 - 0.02 * z})` }}>{b}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

// Jump-cut punch: on each cut the frame snaps to 1.05 and eases back over 0.5 s, so a trimmed recording reads as intentional.
export const jumpPunch = (t: number, cuts: number[]) =>
  1 + cuts.reduce((m, c) => (t >= c ? Math.max(m, 0.05 * (1 - Easing.out(Easing.cubic)(clamp01((t - c) / 0.5)))) : m), 0);

export const JumpCut: FC<{ cuts: number[]; children: ReactNode }> = ({ cuts, children }) => {
  const { t } = useTime();
  return <AbsoluteFill style={{ transform: `scale(${jumpPunch(t, cuts)})` }}>{children}</AbsoluteFill>;
};
