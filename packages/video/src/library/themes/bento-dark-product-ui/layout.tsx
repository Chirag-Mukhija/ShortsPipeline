// Bento layout and camera: the 12-column bento grid with a staggered rise, the focus dolly that pushes into one panel and dims the rest, and the push-dissolve scene swap.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { INOUT, ramp, useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { DOLLY, EXPO, MUTED, SANS, TEXT, fr } from "./theme";
import { Card, Mono, appear } from "./primitives";

export type Rect = { x: number; y: number; w: number; h: number };
export type BentoCell = { c: number; r: number; cs: number; rs: number; caption?: string; title?: string; body?: string; content?: ReactNode; hue?: string; bare?: boolean };
export type BentoFrame = { x?: number; y?: number; w?: number; h?: number; cols?: number; rows?: number; gap?: number };

// Screen rect of a cell, so a FocusDolly can target it.
export const bentoRect = (cell: Pick<BentoCell, "c" | "r" | "cs" | "rs">, { x = 96, y = 96, w = W - 192, h = H - 192, cols = 12, rows = 6, gap = 20 }: BentoFrame = {}): Rect => {
  const cw = (w - gap * (cols - 1)) / cols;
  const rh = (h - gap * (rows - 1)) / rows;
  return { x: x + cell.c * (cw + gap), y: y + cell.r * (rh + gap), w: cell.cs * cw + (cell.cs - 1) * gap, h: cell.rs * rh + (cell.rs - 1) * gap };
};

// Cards on a 12-column grid rising 4 frames apart in reading order; with `focus`, one card's border brightens and the others drop to 30 %. A `bare` cell renders its content as the card (e.g. a SpotlightCard).
export const BentoGrid: FC<{ cells: BentoCell[]; at: number; frame?: BentoFrame; staggerFrames?: number; focus?: { index: number; at: number; until?: number }; style?: CSSProperties }> = ({ cells, at, frame, staggerFrames = 4, focus, style }) => {
  const { t } = useTime();
  const fo = focus ? ramp(t, focus.at, fr(18), INOUT) - (focus.until === undefined ? 0 : ramp(t, focus.until, fr(18), INOUT)) : 0;
  const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c.r - b.c.r || a.c.c - b.c.c);
  return (
    <AbsoluteFill style={style}>
      {order.map(({ c, i }, k) => {
        const r = bentoRect(c, frame);
        const a = appear(t, at + fr(staggerFrames * k), { d: 24, y: 40 });
        const me = focus?.index === i;
        return (
          <div key={i} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, ...a.style, opacity: (a.style.opacity as number) * (me ? 1 : 1 - 0.7 * fo) }}>
            {c.bare ? c.content : <Card w={r.w} h={r.h} lit={me ? fo : 0} glow={c.hue}>
              {c.content && <div style={{ position: "absolute", inset: 0 }}>{c.content}</div>}
              {c.caption && (
                <div style={{ position: "absolute", left: 30, top: 26 }}>
                  <Mono>{c.caption}</Mono>
                </div>
              )}
              {(c.title || c.body) && (
                <div style={{ position: "absolute", left: 30, right: 30, bottom: 26, fontFamily: SANS, fontWeight: 500, fontSize: 38, lineHeight: 1.22, letterSpacing: "-0.015em", color: TEXT }}>
                  {c.title} {c.body && <span style={{ color: MUTED }}>{c.body}</span>}
                </div>
              )}
            </Card>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Slow dolly into one panel: the target rect moves to the centre and scales up over `frames` (default 75) on bezier(.2,.7,.2,1); `back` returns it.
export const FocusDolly: FC<{ target: Rect; at: number; frames?: number; scale?: number; back?: number; children: ReactNode }> = ({ target, at, frames = 75, scale, back, children }) => {
  const { t } = useTime();
  const S = scale ?? Math.min((W * 0.78) / target.w, (H * 0.78) / target.h);
  const e = ramp(t, at, fr(frames), DOLLY) - (back === undefined ? 0 : ramp(t, back, fr(frames * 0.7), DOLLY));
  const cx = W / 2 + (target.x + target.w / 2 - W / 2) * e;
  const cy = H / 2 + (target.y + target.h / 2 - H / 2) * e;
  const s = 1 + (S - 1) * e;
  return <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${W / 2}px, ${H / 2}px) scale(${s}) translate(${-cx}px, ${-cy}px)` }}>{children}</AbsoluteFill>;
};

// The theme's scene transition: the old scene pushes 1.0 → 1.06 while blurring to 6 px and dissolving; the new one settles from 1.06 → 1.0 out of the same blur.
export const SceneSwap: FC<{ at: number; from: ReactNode; to: ReactNode; frames?: number }> = ({ at, from, to, frames = 20 }) => {
  const { t } = useTime();
  const d = fr(frames);
  const e = ramp(t, at, d, INOUT);
  const e2 = ramp(t, at + d * 0.45, d * 1.4, EXPO);
  return (
    <>
      {e < 1 && <AbsoluteFill style={{ opacity: 1 - e, transform: `scale(${1 + 0.06 * e})`, filter: `blur(${6 * e}px)` }}>{from}</AbsoluteFill>}
      {e2 > 0 && <AbsoluteFill style={{ opacity: e2, transform: `scale(${1.06 - 0.06 * e2})`, filter: e2 < 1 ? `blur(${6 * (1 - e2)}px)` : undefined }}>{to}</AbsoluteFill>}
    </>
  );
};
