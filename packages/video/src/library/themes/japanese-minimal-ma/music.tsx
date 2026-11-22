// Ma for music-only videos: one word per bar in an upright column, an ink dot pressed on every downbeat that stays as a fading score, and a quiet beat meter.
import type { FC } from "react";
import { ramp } from "../../core/time";
import { GREY, MARGIN, SERIF, SHU, SUMI } from "./theme";
import { rng } from "./geometry";
import { Caps, Fill, Hairline, InkDot, Stage, VerticalText, useMa } from "./primitives";

export type MeasuredSilenceProps = {
  // One word per bar, starting at startBar; keep them short (they stand upright).
  words: string[];
  startBar?: number;
  // The bar whose downbeat dot is vermillion (the one accent), if any.
  accentBar?: number;
  x?: number;
  y?: number;
  meter?: boolean;
  seed?: number;
};

// Wrap in <MaSong spec={{ bpm, sections }}>. Dots grow with section energy; each word leaves 24 f before the next bar so a breath of paper sits between them.
export const MeasuredSilence: FC<MeasuredSilenceProps> = ({ words, startBar = 1, accentBar, x = 1340, y = 190, meter = true, seed = 3 }) => {
  const { t, clock, pos, energy, pulse } = useMa();
  const bars = Math.max(0, Math.min(pos.bar, startBar + words.length - 1) - startBar + 1);
  const r = rng(seed);
  const spots = Array.from({ length: words.length + 4 }, () => ({ x: 260 + r() * 640, y: 560 + r() * 330, k: 0.6 + r() * 0.8 }));
  return (
    <Fill>
      <Stage>
        {Array.from({ length: bars }, (_, i) => {
          const bar = startBar + i;
          const at = clock.barSec(bar);
          const s = spots[i]!;
          const age = ramp(t, at + clock.spBar, clock.spBar * 2);
          return <InkDot key={i} x={s.x} y={s.y} r={(18 + 30 * energy) * s.k} at={at - 0.03} d={1.1} wash={1 - 0.6 * age} color={bar === accentBar ? SHU : SUMI} seed={40 + i} />;
        })}
        <Hairline pts={[[x - 160, 900], [1728, 900]]} at={clock.barSec(startBar) - 1.2} d={2} color={GREY} opacity={0.6 + 0.4 * pulse} />
      </Stage>
      {words.map((w, i) => {
        const at = clock.barSec(startBar + i);
        const until = clock.barSec(startBar + i + 1) - 0.1;
        if (t < at - 0.1 || (i < words.length - 1 && t > until)) return null;
        return <VerticalText key={i} x={x} y={y} columns={[w.toUpperCase()]} size={74} upright font={SERIF} weight={300} color={SUMI} stagger={0.1} at={at} until={i < words.length - 1 ? until : undefined} tracking={0.32} />;
      })}
      {meter && (
        <>
          <Stage>
            {Array.from({ length: clock.sig }, (_, j) => {
              const on = pos.beatInBar === j + 1 && t >= clock.off ? 0.35 + 0.65 * Math.max(pulse, 0.4) : 0.25;
              return <rect key={j} x={MARGIN + j * 26} y={948} width={2} height={j === 0 ? 30 : 20} fill={SUMI} opacity={on} />;
            })}
          </Stage>
          <Caps x={MARGIN + clock.sig * 26 + 20} y={942} at={0}>
            {`bar ${String(Math.max(1, pos.bar)).padStart(2, "0")} · ${clock.bpm} bpm`}
          </Caps>
        </>
      )}
    </Fill>
  );
};
